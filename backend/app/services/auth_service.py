import os
import time
import datetime
import hashlib
import jwt
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from app.config import settings

from app.database import get_db
from app.models import User, Patient

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "personal_health_copilot_secret_jwt_key_2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    """Hash password securely using PBKDF2 HMAC SHA256 with salt."""
    salt = os.getenv("PASSWORD_SALT", "health_copilot_salt_key_9988").encode('utf-8')
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return key.hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against stored hash."""
    return hash_password(plain_password) == hashed_password

def create_access_token(user_id: str, email: str) -> str:
    """Generate signed JWT access token."""
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
        "iat": datetime.datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

def get_current_user_optional(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Retrieves current authenticated user if token present, otherwise None."""
    if not auth or not auth.credentials:
        return None
    payload = decode_access_token(auth.credentials)
    if not payload or "sub" not in payload:
        return None
    user = db.query(User).filter(User.id == payload["sub"]).first()
    return user

def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency enforcing valid authenticated user token."""
    user = get_current_user_optional(auth, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required. Please sign in."
        )
    return user

def verify_google_id_token(token_str: str) -> Dict[str, Any]:
    """
    Validate Google ID token using Google's public certs.
    Validates signature, issuer, audience, expiration, and email_verified.
    """
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    from app.config import settings

    client_id = settings.GOOGLE_CLIENT_ID
    if not client_id or not client_id.strip():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth is not configured on the backend server. Please configure GOOGLE_CLIENT_ID in backend/.env."
        )

    try:
        id_info = id_token.verify_oauth2_token(
            token_str,
            google_requests.Request(),
            audience=client_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google ID token verification failed: {str(e)}"
        )

    # Validate issuer
    if id_info.get("iss") not in ["accounts.google.com", "https://accounts.google.com"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google ID token issuer."
        )

    # Validate email_verified
    if not id_info.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account email address is not verified by Google."
        )

    if not id_info.get("email"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google ID token does not contain a verified email address."
        )

    return id_info
