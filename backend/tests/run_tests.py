import sys
import os
import unittest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

class TestBackendAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        from app.services.auth_service import create_access_token
        cls.token = create_access_token("demo_user_001", "eleanor@healthcopilot.org")
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

    def test_root_endpoint(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["message"], "Personal Health Copilot Backend")
        self.assertEqual(data["status"], "running")
        self.assertEqual(data["docs"], "/docs")
        self.assertEqual(data["health"], "/health")

    def test_favicon_endpoint(self):
        response = self.client.get("/favicon.ico")
        self.assertEqual(response.status_code, 204)

    def test_health_check(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertTrue(data["database_connected"])
        self.assertEqual(data["app_name"], "Personal Health Copilot")

    def test_languages_catalog(self):
        response = self.client.get("/api/languages")
        self.assertEqual(response.status_code, 200)
        langs = response.json()
        self.assertGreaterEqual(len(langs), 40)
        codes = [l["code"] for l in langs]
        self.assertIn("te", codes)
        self.assertIn("hi", codes)
        self.assertIn("en", codes)

    def test_get_patient_me(self):
        response = self.client.get("/api/patients/me", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["user_id"], "demo_user_001")

    def test_get_medical_records(self):
        response = self.client.get("/api/records", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        records = response.json()
        self.assertGreater(len(records), 0)

    def test_get_timeline(self):
        response = self.client.get("/api/timeline")
        self.assertEqual(response.status_code, 200)
        events = response.json()
        self.assertGreater(len(events), 0)

    def test_lab_trends(self):
        response = self.client.get("/api/trends/Hemoglobin")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["test_name"], "Hemoglobin")
        self.assertGreaterEqual(len(data["data_points"]), 2)

    def test_fhir_export(self):
        response = self.client.get("/api/interop/fhir/Observation")
        self.assertEqual(response.status_code, 200)
        bundle = response.json()
        self.assertEqual(bundle["resourceType"], "Bundle")

    def test_openapi_docs(self):
        response = self.client.get("/openapi.json")
        self.assertEqual(response.status_code, 200)
        spec = response.json()
        self.assertIn("paths", spec)
        self.assertIn("/", spec["paths"])
        self.assertIn("/health", spec["paths"])
        self.assertIn("/api/records", spec["paths"])

if __name__ == "__main__":
    unittest.main()
