# Sanjeevani — Database Schema (PostgreSQL)

All tables include `hospital_id UUID` (multi-tenancy ready), `created_at`, `updated_at` timestamps unless noted. Primary keys are UUIDs.

## Entity Relationship Overview

```
patients ──< prescriptions >── doctors
   │              │
   │              ├──< prescription_items >── medications
   │              └──< verification_logs
   │
   ├──< scans (OCR/X-ray source images)
   ├──< diagnostic_orders >── lab_results
   ├──< intake_logs (adherence tracking)
   ├──< chief_complaints / triage_scores
   └──< copilot_conversations

users (auth) 1─1 { doctors | receptionists | pharmacists | lab_technicians | patients }
```

## Core Tables

### `users`
Auth identity shared across all roles.
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| hospital_id | UUID FK | |
| role | ENUM('receptionist','doctor','pharmacist','lab_tech','patient','admin') | |
| phone | VARCHAR, unique | primary login identifier |
| email | VARCHAR, nullable | |
| password_hash | VARCHAR, nullable | null for patients (OTP-only login) |
| full_name | VARCHAR | |
| language_pref | VARCHAR | e.g. 'hi', 'mr', 'en' |
| is_active | BOOLEAN | |

### `patients`
| Column | Type | Notes |
|---|---|---|
| id (patient_id) | UUID PK | |
| user_id | UUID FK → users | nullable until patient activates portal |
| full_name | VARCHAR | |
| age | INT | |
| gender | VARCHAR | |
| phone | VARCHAR | |
| emergency_contact_name | VARCHAR | |
| emergency_contact_phone | VARCHAR | |
| registered_by | UUID FK → users (receptionist) | |

### `chief_complaints`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| patient_id | UUID FK | |
| text | TEXT | raw complaint entered by receptionist |
| severity_level | INT | 1=Routine, 2=Urgent, 3=Critical |
| severity_source | VARCHAR | 'nlp_model' \| 'manual_override' |
| created_at | TIMESTAMP | |

### `doctor_queues`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| patient_id | UUID FK | |
| doctor_id | UUID FK → users | |
| chief_complaint_id | UUID FK | |
| token_number | INT | |
| status | ENUM('waiting','in_consult','completed') | |
| queued_at | TIMESTAMP | |

### `scans`
Generic table for uploaded documents (prescriptions, X-rays, lab reports).
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| patient_id | UUID FK | |
| uploaded_by | UUID FK → users | |
| category | ENUM('outside_prescription','xray','lab_report','other') | |
| file_url | VARCHAR | object storage signed path |
| ocr_status | ENUM('pending','processing','done','failed') | |
| ocr_raw_json | JSONB | TrOCR/YOLO output: text + bounding boxes |
| xray_analysis_json | JSONB | detector output: `[{label, confidence, box}]` |
| created_at | TIMESTAMP | |

### `medications` (reference/master data)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | VARCHAR | e.g. "Noveron 500mg" |
| generic_name | VARCHAR | |
| category | VARCHAR | e.g. "Beta Blocker" |
| interaction_tags | TEXT[] | used by guardrail engine |

### `prescriptions`
The clinical protocol drafted → verified per consult.
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| patient_id | UUID FK | |
| doctor_id | UUID FK | |
| doctor_queue_id | UUID FK | links to the consult |
| source_scan_id | UUID FK, nullable | if derived from OCR |
| status | ENUM('draft','verified','dispensed') | |
| soap_note_json | JSONB | Subjective/Objective/Assessment/Plan |
| icd10_codes | TEXT[] | |
| cpt_codes | TEXT[] | |
| created_at | TIMESTAMP | |
| verified_at | TIMESTAMP, nullable | |

### `prescription_items`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| prescription_id | UUID FK | |
| medication_id | UUID FK | |
| dosage | VARCHAR | e.g. "500mg" |
| frequency | VARCHAR | e.g. "1-0-1" |
| duration_days | INT | |
| condition_tag | VARCHAR | e.g. "Diabetes" — shown to patient |
| ocr_bounding_box | JSONB, nullable | `{x,y,w,h}` for evidence viewer |
| doctor_edited | BOOLEAN | true if doctor changed OCR value |

### `verification_logs`
Immutable, append-only. No UPDATE/DELETE DB grants.
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| prescription_id | UUID FK | |
| doctor_id | UUID FK | |
| protocol_hash | VARCHAR | SHA-256 of final JSON |
| signed_at | TIMESTAMP | |

### `interaction_flags`
Records guardrail warnings raised during a consult (for pharmacy safety-lock badge).
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| prescription_id | UUID FK | |
| conflicting_medication_id | UUID FK | |
| severity | ENUM('moderate','severe') | |
| message | TEXT | |
| acknowledged_by_doctor | BOOLEAN | |

### `pharmacy_dispense_log`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| prescription_id | UUID FK | |
| pharmacist_id | UUID FK | |
| dispensed | BOOLEAN | |
| dispensed_at | TIMESTAMP, nullable | |
| pill_verification_result | JSONB, nullable | MobileNetV3 output |

### `diagnostic_orders`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| patient_id | UUID FK | |
| doctor_id | UUID FK | |
| test_name | VARCHAR | e.g. "CBC" |
| status | ENUM('pending_draw','analyzing','results_ready') | |
| ordered_at | TIMESTAMP | |

### `lab_results`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| diagnostic_order_id | UUID FK | |
| lab_tech_id | UUID FK | |
| raw_values_json | JSONB | e.g. `{"hemoglobin": 11.2, "unit": "g/dL"}` |
| patient_summary_text | TEXT | LLM-generated plain-language version |
| created_at | TIMESTAMP | |

### `intake_logs`
Adherence tracking — one row per scheduled dose event.
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| patient_id | UUID FK | |
| prescription_item_id | UUID FK | |
| scheduled_at | TIMESTAMP | |
| taken | BOOLEAN | default false |
| taken_at | TIMESTAMP, nullable | |

### `copilot_conversations` / `copilot_messages`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| patient_id | UUID FK | |
| role | ENUM('user','assistant') | |
| content | TEXT | |
| flagged_diagnostic_attempt | BOOLEAN | true if fallback guardrail triggered |
| created_at | TIMESTAMP | |

### `inventory_stock`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| medication_id | UUID FK | |
| quantity_on_hand | INT | |
| projected_zero_date | DATE, nullable | output of forecasting job |
| updated_at | TIMESTAMP | |

## Indexing Notes
- `patients(phone)` — btree index for quick lookup search.
- `patients` full-text index (`to_tsvector(full_name)`) for name search.
- `doctor_queues(doctor_id, status, severity via join)` — composite index to support queue ordering.
- `prescriptions(patient_id, status)` — used constantly for cross-doctor interaction checks and patient timeline merge.
- `intake_logs(patient_id, scheduled_at)` — supports adherence score calculation window queries.

## Multi-Doctor Safety Query Pattern

The guardrail check for a *new* prescription always queries:
```sql
SELECT pi.*, m.interaction_tags
FROM prescription_items pi
JOIN prescriptions p ON pi.prescription_id = p.id
JOIN medications m ON pi.medication_id = m.id
WHERE p.patient_id = :patient_id
  AND p.status IN ('verified', 'dispensed')
  AND p.id != :current_draft_id;
```
This is what guarantees Doctor C sees a conflict against Doctor A's and Doctor B's active medications, not just their own.
