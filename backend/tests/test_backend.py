import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app_name"] == "Personal Health Copilot"

import uuid

def test_auth_login_and_register():
    # Test Demo Login
    response = client.post("/api/auth/login", json={
        "email": "eleanor@healthcopilot.org",
        "password": "demo1234"
    })
    assert response.status_code == 200
    res_data = response.json()
    assert "access_token" in res_data
    assert res_data["user"]["email"] == "eleanor@healthcopilot.org"
    token = res_data["access_token"]

    # Test Registration with unique email
    test_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    reg_res = client.post("/api/auth/register", json={
        "full_name": "Test User",
        "email": test_email,
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert reg_data["user"]["email"] == test_email
    assert len(reg_data["patients"]) == 1

def test_languages_catalog():
    response = client.get("/api/languages")
    assert response.status_code == 200
    langs = response.json()
    assert len(langs) >= 40
    codes = [l["code"] for l in langs]
    assert "te" in codes
    assert "hi" in codes
    assert "en" in codes

def test_get_patient_me():
    response = client.get("/api/patients/me")
    assert response.status_code == 200
    data = response.json()
    assert data["display_name"] == "Eleanor Vance"

def get_auth_headers():
    response = client.post("/api/auth/login", json={
        "email": "eleanor@healthcopilot.org",
        "password": "demo1234"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_get_medical_records():
    headers = get_auth_headers()
    response = client.get("/api/records", headers=headers)
    assert response.status_code == 200
    records = response.json()
    assert len(records) > 0

def test_get_timeline():
    response = client.get("/api/timeline")
    assert response.status_code == 200
    events = response.json()
    assert len(events) > 0

def test_lab_trends():
    response = client.get("/api/trends/Hemoglobin")
    assert response.status_code == 200
    data = response.json()
    assert data["test_name"] == "Hemoglobin"
    assert len(data["data_points"]) >= 2

def test_fhir_export():
    response = client.get("/api/interop/fhir/Observation")
    assert response.status_code == 200
    bundle = response.json()
    assert bundle["resourceType"] == "Bundle"
