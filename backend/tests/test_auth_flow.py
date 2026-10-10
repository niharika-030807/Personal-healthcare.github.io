import sys
import os
import uuid
import pytest
from unittest.mock import patch

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)

def test_unauthenticated_records_access_denied():
    """TEST 10: Try to access protected medical records without authentication -> backend denies access (401)."""
    response = client.get("/api/records")
    assert response.status_code == 401
    assert "Authentication token required" in response.json()["detail"]

def test_registration_with_name_and_suggestions():
    """TEST 5 & 7: Register user with custom full name, email, and password."""
    unique_suffix = uuid.uuid4().hex[:6]
    test_email = f"janedoe_{unique_suffix}@example.com"
    
    # Successful registration
    reg_res = client.post("/api/auth/register", json={
        "full_name": "Jane Doe",
        "email": test_email,
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "preferred_language": "en"
    })
    assert reg_res.status_code == 200
    data = reg_res.json()
    assert data["user"]["full_name"] == "Jane Doe"
    assert data["user"]["email"] == test_email
    assert data["user"]["auth_provider"] == "email"
    assert len(data["patients"]) == 1
    assert data["patients"][0]["display_name"] == "Jane Doe"
    assert data["patients"][0]["relationship_type"] == "Self"
    assert "access_token" in data

    token = data["access_token"]

    # Verify authenticated access to protected records with this token
    records_res = client.get("/api/records", headers={"Authorization": f"Bearer {token}"})
    assert records_res.status_code == 200

    # TEST 8: Session restore (/api/auth/me)
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["user"]["email"] == test_email

    # TEST 7: Login with registered email and password
    login_res = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "SecurePassword123!"
    })
    assert login_res.status_code == 200
    assert login_res.json()["user"]["email"] == test_email

    # Login with wrong password fails
    bad_login = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "WrongPassword!"
    })
    assert bad_login.status_code == 401

def test_registration_duplicate_email():
    """TEST 6: Enter an existing application email address -> handles duplicate account gracefully (400)."""
    unique_suffix = uuid.uuid4().hex[:6]
    dup_email = f"duplicate_{unique_suffix}@example.com"

    # First registration
    client.post("/api/auth/register", json={
        "full_name": "First User",
        "email": dup_email,
        "password": "Password123!",
        "confirm_password": "Password123!"
    })

    # Second registration with same email
    dup_res = client.post("/api/auth/register", json={
        "full_name": "Second User",
        "email": dup_email,
        "password": "Password456!",
        "confirm_password": "Password456!"
    })
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"].lower()

def test_google_auth_missing_config():
    """TEST 4: Google OAuth credentials missing on backend -> reports clear configuration issue."""
    original_client_id = settings.GOOGLE_CLIENT_ID
    try:
        settings.GOOGLE_CLIENT_ID = None
        response = client.post("/api/auth/google", json={"id_token": "some-token"})
        assert response.status_code == 500
        assert "Google OAuth is not configured" in response.json()["detail"]
    finally:
        settings.GOOGLE_CLIENT_ID = original_client_id

def test_google_auth_invalid_token():
    """TEST 3: Cancelled or invalid Google token -> returns 401 without faking success."""
    original_client_id = settings.GOOGLE_CLIENT_ID
    try:
        settings.GOOGLE_CLIENT_ID = "mock-google-client-id.apps.googleusercontent.com"
        response = client.post("/api/auth/google", json={"id_token": "fake-invalid-id-token"})
        assert response.status_code == 401
        assert "Google ID token verification failed" in response.json()["detail"]
    finally:
        settings.GOOGLE_CLIENT_ID = original_client_id

def test_google_auth_valid_verified_flow():
    """TEST 2: Authenticate with verified Google account -> validates identity, provisions account & patient, establishes session."""
    original_client_id = settings.GOOGLE_CLIENT_ID
    try:
        settings.GOOGLE_CLIENT_ID = "test-google-client-id.apps.googleusercontent.com"
        fake_sub = f"google-sub-{uuid.uuid4().hex[:8]}"
        fake_email = f"verified_google_{uuid.uuid4().hex[:6]}@gmail.com"
        fake_name = "Dr. Rahul Kumar"

        # Mock the cryptographic verification of Google ID token
        mock_id_info = {
            "iss": "https://accounts.google.com",
            "sub": fake_sub,
            "aud": "test-google-client-id.apps.googleusercontent.com",
            "email": fake_email,
            "email_verified": True,
            "name": fake_name
        }

        with patch("app.services.auth_service.id_token.verify_oauth2_token", return_value=mock_id_info):
            res = client.post("/api/auth/google", json={"id_token": "valid.jwt.token"})
            assert res.status_code == 200
            data = res.json()
            assert data["user"]["email"] == fake_email
            assert data["user"]["full_name"] == fake_name
            assert data["user"]["auth_provider"] == "google"
            assert data["user"]["google_sub"] == fake_sub
            assert len(data["patients"]) == 1
            assert data["patients"][0]["display_name"] == fake_name
            assert data["patients"][0]["relationship_type"] == "Self"
            assert "access_token" in data

            # Second login with same Google account (existing user)
            res2 = client.post("/api/auth/google", json={"id_token": "valid.jwt.token"})
            assert res2.status_code == 200
            assert res2.json()["user"]["email"] == fake_email
            assert res2.json()["user"]["id"] == data["user"]["id"]

            # Google users cannot log in with arbitrary password through password form
            pw_login = client.post("/api/auth/login", json={
                "email": fake_email,
                "password": "anypassword"
            })
            assert pw_login.status_code == 400
            assert "registered using Google" in pw_login.json()["detail"]
    finally:
        settings.GOOGLE_CLIENT_ID = original_client_id
