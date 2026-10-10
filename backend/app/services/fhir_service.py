from typing import Dict, Any, List
from app.models import MedicalRecord, Patient, LabResult, Medication

FHIR_SPEC_VERSION = "FHIR R4 (v4.0.1)"

def build_fhir_patient(patient: Patient) -> Dict[str, Any]:
    """Generate FHIR R4 Patient resource."""
    return {
        "resourceType": "Patient",
        "id": patient.id,
        "meta": {
            "versionId": "1",
            "lastUpdated": patient.updated_at.isoformat() + "Z"
        },
        "identifier": [
            {
                "system": "https://personalhealthcopilot.local/patient-id",
                "value": patient.user_id
            }
        ],
        "name": [
            {
                "use": "official",
                "text": patient.display_name
            }
        ],
        "birthDate": patient.date_of_birth or "1985-05-15",
        "communication": [
            {
                "language": {
                    "coding": [
                        {
                            "system": "urn:ietf:bcp:47",
                            "code": patient.preferred_language or "en"
                        }
                    ]
                },
                "preferred": True
            }
        ]
    }

def build_fhir_observation(lab: LabResult, patient_id: str, doc_date: str) -> Dict[str, Any]:
    """Generate FHIR R4 Observation resource for a lab result."""
    interpretation_code = "N"
    if lab.result_status == "Abnormal":
        interpretation_code = "A"
    elif lab.result_status == "Critical":
        interpretation_code = "AA"

    obs = {
        "resourceType": "Observation",
        "id": lab.id,
        "status": "final",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                        "code": "laboratory",
                        "display": "Laboratory"
                    }
                ]
            }
        ],
        "code": {
            "coding": [
                {
                    "system": "http://loinc.org",
                    "code": "2951-2" if "sodium" in lab.test_name.lower() else ("718-7" if "hemo" in lab.test_name.lower() else "2339-0"),
                    "display": lab.test_name
                }
            ],
            "text": lab.test_name
        },
        "subject": {
            "reference": f"Patient/{patient_id}"
        },
        "effectiveDateTime": doc_date if doc_date else "2026-10-01",
        "valueQuantity": {
            "value": float(lab.value) if lab.value.replace('.', '', 1).isdigit() else lab.value,
            "unit": lab.unit or "",
            "system": "http://unitsofmeasure.org"
        },
        "interpretation": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                        "code": interpretation_code
                    }
                ]
            }
        ]
    }

    if lab.reference_min is not None or lab.reference_max is not None or lab.reference_text:
        obs["referenceRange"] = [
            {
                "low": {"value": lab.reference_min, "unit": lab.unit} if lab.reference_min is not None else None,
                "high": {"value": lab.reference_max, "unit": lab.unit} if lab.reference_max is not None else None,
                "text": lab.reference_text
            }
        ]

    return obs

def build_fhir_medication_request(med: Medication, patient_id: str, doc_date: str) -> Dict[str, Any]:
    """Generate FHIR R4 MedicationRequest resource."""
    return {
        "resourceType": "MedicationRequest",
        "id": med.id,
        "status": "active",
        "intent": "order",
        "medicationCodeableConcept": {
            "coding": [
                {
                    "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                    "code": "7052",
                    "display": med.medicine_name
                }
            ],
            "text": f"{med.medicine_name} {med.strength or ''}"
        },
        "subject": {
            "reference": f"Patient/{patient_id}"
        },
        "authoredOn": doc_date if doc_date else "2026-10-01",
        "dosageInstruction": [
            {
                "text": med.dosage_instructions or f"Take {med.frequency or 'as directed'}",
                "timing": {
                    "code": {
                        "text": med.frequency or "daily"
                    }
                },
                "route": {
                    "text": med.route or "oral"
                }
            }
        ]
    }

def build_fhir_bundle_for_record(record: MedicalRecord) -> Dict[str, Any]:
    """Generate a FHIR R4 Bundle containing Patient, DocumentReference, Observations, and MedicationRequests."""
    entries = []

    # DocumentReference entry
    entries.append({
        "resource": {
            "resourceType": "DocumentReference",
            "id": record.id,
            "status": "current",
            "type": {
                "text": record.record_type
            },
            "subject": {
                "reference": f"Patient/{record.patient_id}"
            },
            "date": record.upload_date.isoformat() + "Z",
            "content": [
                {
                    "attachment": {
                        "contentType": "application/pdf" if record.original_filename.endswith(".pdf") else "image/png",
                        "title": record.original_filename
                    }
                }
            ]
        }
    })

    # Add Lab Results as Observations
    for lab in record.lab_results:
        entries.append({
            "resource": build_fhir_observation(lab, record.patient_id, record.document_date)
        })

    # Add Medications as MedicationRequests
    for med in record.medications:
        entries.append({
            "resource": build_fhir_medication_request(med, record.patient_id, record.document_date)
        })

    return {
        "resourceType": "Bundle",
        "type": "collection",
        "meta": {
            "lastUpdated": record.updated_at.isoformat() + "Z",
            "profile": ["http://hl7.org/fhir/StructureDefinition/Bundle"]
        },
        "entry": entries
    }
