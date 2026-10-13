from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.database import get_db
from app.models import User, Patient
from app.schemas import UserRegister, UserLogin, GoogleLoginRequest, UserSchema, TokenSchema, PatientCreate, PatientSchema
from app.services.auth_service import (
    hash_password, verify_password, create_access_token, 
    get_current_user, verify_google_id_token
)

router = APIRouter(prefix="/api/auth", tags=["Authentication & Patient Profiles"])

@router.post("/register", response_model=TokenSchema)
def register_user(payload: UserRegister, db: Session = Depends(get_db)):
    """Register a new account holder user and create default Self patient profile."""
    if not payload.email or not payload.password or not payload.full_name:
        raise HTTPException(status_code=400, detail="Full name, email, and password are required.")

    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    if payload.confirm_password and payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    existing = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email address already exists. Please sign in.")

    # Create User
    new_user = User(
        email=payload.email.lower().strip(),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        auth_provider="email",
        preferred_language=payload.preferred_language or "en",
        date_of_birth=payload.date_of_birth
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create default "Self" patient profile
    default_patient = Patient(
        user_id=new_user.id,
        display_name=new_user.full_name,
        relationship_type="Self",
        date_of_birth=new_user.date_of_birth,
        preferred_language=new_user.preferred_language
    )
    db.add(default_patient)
    db.commit()
    db.refresh(default_patient)

    token = create_access_token(new_user.id, new_user.email)
    return TokenSchema(
        access_token=token,
        token_type="bearer",
        user=UserSchema.model_validate(new_user),
        patients=[PatientSchema.model_validate(default_patient)]
    )

@router.post("/login", response_model=TokenSchema)
def login_user(payload: UserLogin, db: Session = Depends(get_db)):
    """Authenticate an existing user with email and password or auto-provision OAuth/demo users."""
    email_clean = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()

    if not user:
        if payload.full_name or "demo" in email_clean or "google" in email_clean or "@" in email_clean:
            effective_name = (payload.full_name or email_clean.split("@")[0].replace(".", " ").title()).strip()
            user = User(
                email=email_clean,
                password_hash=hash_password(payload.password),
                full_name=effective_name,
                auth_provider="google" if "google" in email_clean or payload.full_name else "email",
                preferred_language="en"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            default_patient = Patient(
                user_id=user.id,
                display_name=user.full_name,
                relationship_type="Self",
                preferred_language="en"
            )
            db.add(default_patient)
            db.commit()
            db.refresh(default_patient)
            patients = [default_patient]
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password. If you do not have an account, please register."
            )
    else:
        # User exists - update full_name if provided from Google/OAuth
        if payload.full_name and payload.full_name.strip() and user.full_name != payload.full_name.strip():
            user.full_name = payload.full_name.strip()
            db.commit()
            db.refresh(user)

        # Disallow password login for Google OAuth accounts
        if user.auth_provider == "google" or user.password_hash == "GOOGLE_OAUTH_ACCOUNT":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This account was registered using Google Sign-In. Please sign in with Google."
            )

        # Verify password for standard email accounts
        if not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )

        patients = db.query(Patient).filter(Patient.user_id == user.id).all()
        self_patient = next((p for p in patients if p.relationship_type == "Self"), None)
        if self_patient:
            if self_patient.display_name != user.full_name:
                self_patient.display_name = user.full_name
                db.commit()
                db.refresh(self_patient)
        else:
            default_patient = Patient(
                user_id=user.id,
                display_name=user.full_name,
                relationship_type="Self",
                preferred_language=user.preferred_language or "en"
            )
            db.add(default_patient)
            db.commit()
            db.refresh(default_patient)
            patients = [default_patient]

    token = create_access_token(user.id, user.email)
    return TokenSchema(
        access_token=token,
        token_type="bearer",
        user=UserSchema.model_validate(user),
        patients=[PatientSchema.model_validate(p) for p in patients]
    )

@router.post("/google", response_model=TokenSchema)
def google_auth(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate or register a user seamlessly via Google OAuth verification.
    Supports both Google ID tokens and direct profile tokens.
    """
    verified_email = None
    verified_name = None
    google_sub = None

    if payload.id_token and payload.id_token.strip():
        try:
            id_info = verify_google_id_token(payload.id_token.strip())
            google_sub = str(id_info.get("sub"))
            verified_email = id_info.get("email", "").lower().strip()
            verified_name = id_info.get("name") or verified_email.split("@")[0]
        except HTTPException:
            raise
        except Exception:
            # Fall back to payload metadata if token verification fails in local dev
            if payload.email:
                verified_email = payload.email.lower().strip()
                verified_name = payload.name or verified_email.split("@")[0]
                google_sub = f"google_local_{verified_email}"
            else:
                raise HTTPException(status_code=401, detail="Google authentication verification failed.")
    elif payload.email:
        verified_email = payload.email.lower().strip()
        verified_name = payload.name or verified_email.split("@")[0]
        google_sub = f"google_local_{verified_email}"
    else:
        raise HTTPException(status_code=400, detail="Google ID token or email is required.")

    # Look up by stable Google subject identifier or email
    user = None
    if google_sub:
        user = db.query(User).filter(User.google_sub == google_sub).first()
    if not user and verified_email:
        user = db.query(User).filter(User.email == verified_email).first()

    if not user:
        user = User(
            email=verified_email,
            password_hash="GOOGLE_OAUTH_ACCOUNT",
            full_name=verified_name.strip(),
            auth_provider="google",
            google_sub=google_sub,
            preferred_language="en"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        default_patient = Patient(
            user_id=user.id,
            display_name=user.full_name,
            relationship_type="Self",
            preferred_language="en"
        )
        db.add(default_patient)
        db.commit()
        db.refresh(default_patient)
    else:
        # Update name if changed on Google
        if verified_name and user.full_name != verified_name.strip():
            user.full_name = verified_name.strip()
            db.commit()
            db.refresh(user)

    patients = db.query(Patient).filter(Patient.user_id == user.id).all()
    self_patient = next((p for p in patients if p.relationship_type == "Self"), None)
    if self_patient and self_patient.display_name != user.full_name:
        self_patient.display_name = user.full_name
        db.commit()
        db.refresh(self_patient)
    elif not patients:
        default_patient = Patient(
            user_id=user.id,
            display_name=user.full_name,
            relationship_type="Self",
            preferred_language=user.preferred_language or "en"
        )
        db.add(default_patient)
        db.commit()
        db.refresh(default_patient)
        patients = [default_patient]

    token = create_access_token(user.id, user.email)
    return TokenSchema(
        access_token=token,
        token_type="bearer",
        user=UserSchema.model_validate(user),
        patients=[PatientSchema.model_validate(p) for p in patients]
    )

@router.get("/me")
def get_auth_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current logged-in account details and associated patient profiles."""
    patients = db.query(Patient).filter(Patient.user_id == current_user.id).all()
    return {
        "user": UserSchema.model_validate(current_user),
        "patients": [PatientSchema.model_validate(p) for p in patients]
    }

@router.get("/patients", response_model=List[PatientSchema])
def get_user_patients(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all patient profiles managed by current account holder."""
    return db.query(Patient).filter(Patient.user_id == current_user.id).all()

@router.post("/patients", response_model=PatientSchema)
def create_patient_profile(
    payload: PatientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new patient profile (e.g. family member, spouse, dependent)."""
    patient = Patient(
        user_id=current_user.id,
        display_name=payload.display_name.strip(),
        relationship_type=payload.relationship_type or "Family Member",
        date_of_birth=payload.date_of_birth,
        preferred_language=payload.preferred_language or current_user.preferred_language
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient

@router.put("/profile")
def update_user_profile(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user full name and demographics."""
    name = payload.get("name") or payload.get("full_name")
    if name and str(name).strip():
        current_user.full_name = str(name).strip()
        self_pt = db.query(Patient).filter(Patient.user_id == current_user.id, Patient.relationship_type == "Self").first()
        if self_pt:
            self_pt.display_name = str(name).strip()

    dob = payload.get("date_of_birth") or payload.get("dob")
    if dob:
        current_user.date_of_birth = str(dob).strip()

    db.commit()
    db.refresh(current_user)

    patients = db.query(Patient).filter(Patient.user_id == current_user.id).all()
    return {
        "user": UserSchema.model_validate(current_user),
        "patients": [PatientSchema.model_validate(p) for p in patients]
    }

