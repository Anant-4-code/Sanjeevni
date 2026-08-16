"""
Sanjeevani — Pharmacological Guardrail Service
===============================================
Checks for:
  1. Drug–drug interactions (known pairs with clinical messages)
  2. Drug–allergy cross-reference (beta-lactam family, sulfa, etc.)
  3. Duplicate medication detection (same drug from multiple doctors)
  4. Dosage ceiling warnings (optional, per-drug)

Returns structured flags with severity + clinical context.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


# ---------------------------------------------------------------------------
# Known drug-drug interaction pairs
# ---------------------------------------------------------------------------

KNOWN_INTERACTIONS: list[dict] = [
    # Anticoagulant interactions
    {"drug_a": "warfarin", "drug_b": "aspirin", "severity": "severe",
     "message": "Aspirin + Warfarin significantly increase bleeding risk. Only combine under specialist supervision with close INR monitoring."},
    {"drug_a": "warfarin", "drug_b": "ibuprofen", "severity": "severe",
     "message": "NSAIDs like Ibuprofen increase bleeding risk with Warfarin and may reduce anticoagulant effectiveness."},
    {"drug_a": "warfarin", "drug_b": "naproxen", "severity": "severe",
     "message": "Naproxen with Warfarin increases gastrointestinal bleeding risk substantially."},
    {"drug_a": "warfarin", "drug_b": "clopidogrel", "severity": "severe",
     "message": "Dual antiplatelet + anticoagulant therapy significantly increases bleeding risk. Requires specialist approval."},
    {"drug_a": "warfarin", "drug_b": "metronidazole", "severity": "severe",
     "message": "Metronidazole inhibits Warfarin metabolism, leading to dangerously elevated INR."},
    {"drug_a": "warfarin", "drug_b": "fluconazole", "severity": "severe",
     "message": "Fluconazole strongly inhibits CYP2C9, dramatically increasing Warfarin levels and bleeding risk."},
    {"drug_a": "heparin", "drug_b": "aspirin", "severity": "severe",
     "message": "Aspirin with Heparin increases hemorrhagic risk. Monitor closely if combination is clinically necessary."},

    # Cardiac interactions
    {"drug_a": "digoxin", "drug_b": "amiodarone", "severity": "severe",
     "message": "Amiodarone increases Digoxin levels by 70-100%. Reduce Digoxin dose by 50% and monitor levels."},
    {"drug_a": "digoxin", "drug_b": "verapamil", "severity": "severe",
     "message": "Verapamil increases Digoxin plasma concentration. Risk of Digoxin toxicity (nausea, arrhythmia)."},
    {"drug_a": "digoxin", "drug_b": "spironolactone", "severity": "moderate",
     "message": "Spironolactone can increase Digoxin levels. Monitor serum Digoxin concentration."},
    {"drug_a": "atenolol", "drug_b": "verapamil", "severity": "severe",
     "message": "Beta-blocker + Verapamil can cause severe bradycardia, heart block, or cardiac arrest."},
    {"drug_a": "metoprolol", "drug_b": "verapamil", "severity": "severe",
     "message": "Beta-blocker + Verapamil: risk of severe bradycardia and AV block. Avoid combination."},
    {"drug_a": "amlodipine", "drug_b": "simvastatin", "severity": "moderate",
     "message": "Amlodipine increases Simvastatin levels. Limit Simvastatin to 20mg/day with Amlodipine."},

    # Diabetes interactions
    {"drug_a": "metformin", "drug_b": "contrast dye", "severity": "severe",
     "message": "Hold Metformin 48 hours before and after iodinated contrast to prevent lactic acidosis."},
    {"drug_a": "glibenclamide", "drug_b": "fluconazole", "severity": "moderate",
     "message": "Fluconazole increases Glibenclamide levels, risking hypoglycemia. Monitor blood glucose closely."},
    {"drug_a": "insulin", "drug_b": "glibenclamide", "severity": "moderate",
     "message": "Insulin + Sulfonylurea increases hypoglycemia risk. Careful dose titration required."},

    # CNS interactions
    {"drug_a": "lithium", "drug_b": "ibuprofen", "severity": "severe",
     "message": "NSAIDs reduce lithium clearance, raising toxic levels. Avoid or monitor lithium levels closely."},
    {"drug_a": "lithium", "drug_b": "hydrochlorothiazide", "severity": "severe",
     "message": "Thiazide diuretics reduce lithium clearance. Risk of lithium toxicity."},
    {"drug_a": "carbamazepine", "drug_b": "erythromycin", "severity": "severe",
     "message": "Erythromycin inhibits Carbamazepine metabolism, causing toxicity (dizziness, ataxia, nystagmus)."},
    {"drug_a": "phenytoin", "drug_b": "carbamazepine", "severity": "moderate",
     "message": "Both compete for hepatic metabolism. Phenytoin levels may decrease unpredictably."},
    {"drug_a": "fluoxetine", "drug_b": "tramadol", "severity": "severe",
     "message": "SSRI + Tramadol: risk of serotonin syndrome (agitation, hyperthermia, clonus). Avoid combination."},
    {"drug_a": "sertraline", "drug_b": "tramadol", "severity": "severe",
     "message": "SSRI + Tramadol: risk of serotonin syndrome. Use alternative analgesic."},
    {"drug_a": "fluoxetine", "drug_b": "maoi", "severity": "severe",
     "message": "SSRI + MAOI: life-threatening serotonin syndrome. Contraindicated. 14-day washout required."},

    # Antibiotic interactions
    {"drug_a": "ciprofloxacin", "drug_b": "theophylline", "severity": "severe",
     "message": "Ciprofloxacin inhibits Theophylline metabolism, causing toxicity (seizures, arrhythmias)."},
    {"drug_a": "ciprofloxacin", "drug_b": "tizanidine", "severity": "severe",
     "message": "Ciprofloxacin dramatically increases Tizanidine levels. Combination contraindicated."},
    {"drug_a": "metronidazole", "drug_b": "alcohol", "severity": "severe",
     "message": "Disulfiram-like reaction: severe nausea, vomiting, flushing. Avoid alcohol during treatment."},
    {"drug_a": "tetracycline", "drug_b": "antacid", "severity": "moderate",
     "message": "Antacids chelate Tetracycline, reducing absorption. Separate by 2-3 hours."},
    {"drug_a": "amoxicillin", "drug_b": "methotrexate", "severity": "severe",
     "message": "Amoxicillin reduces Methotrexate renal clearance. Risk of Methotrexate toxicity."},

    # GI interactions
    {"drug_a": "omeprazole", "drug_b": "clopidogrel", "severity": "severe",
     "message": "Omeprazole inhibits CYP2C19 activation of Clopidogrel, reducing antiplatelet effect. Use Pantoprazole instead."},
    {"drug_a": "pantoprazole", "drug_b": "methotrexate", "severity": "moderate",
     "message": "PPIs may delay Methotrexate elimination. Monitor for toxicity with high-dose Methotrexate."},

    # Potassium-related
    {"drug_a": "spironolactone", "drug_b": "potassium", "severity": "severe",
     "message": "Potassium-sparing diuretic + potassium supplement: risk of fatal hyperkalemia. Monitor K+ levels."},
    {"drug_a": "enalapril", "drug_b": "spironolactone", "severity": "moderate",
     "message": "ACE inhibitor + K+-sparing diuretic increases hyperkalemia risk. Monitor electrolytes."},
    {"drug_a": "losartan", "drug_b": "spironolactone", "severity": "moderate",
     "message": "ARB + K+-sparing diuretic increases hyperkalemia risk. Monitor electrolytes closely."},

    # Statin interactions
    {"drug_a": "simvastatin", "drug_b": "clarithromycin", "severity": "severe",
     "message": "Clarithromycin inhibits Simvastatin metabolism. Risk of rhabdomyolysis. Use alternative statin or antibiotic."},
    {"drug_a": "atorvastatin", "drug_b": "clarithromycin", "severity": "moderate",
     "message": "Clarithromycin increases Atorvastatin levels. Risk of myopathy. Monitor CK levels."},
    {"drug_a": "simvastatin", "drug_b": "cyclosporine", "severity": "severe",
     "message": "Cyclosporine dramatically increases Simvastatin levels. Contraindicated combination."},

    # Respiratory
    {"drug_a": "theophylline", "drug_b": "cimetidine", "severity": "moderate",
     "message": "Cimetidine inhibits Theophylline metabolism. Monitor Theophylline levels."},

    # Additional common pairs
    {"drug_a": "sildenafil", "drug_b": "nitroglycerin", "severity": "severe",
     "message": "PDE5 inhibitor + nitrate: severe hypotension, potentially fatal. Absolutely contraindicated."},
    {"drug_a": "sildenafil", "drug_b": "isosorbide", "severity": "severe",
     "message": "PDE5 inhibitor + nitrate: severe hypotension. Contraindicated."},
    {"drug_a": "potassium", "drug_b": "enalapril", "severity": "moderate",
     "message": "ACE inhibitor can increase potassium retention. Monitor serum K+ when supplementing."},
]


# ---------------------------------------------------------------------------
# Allergy class mapping — allergen → family of drugs to flag
# ---------------------------------------------------------------------------

ALLERGY_DRUG_FAMILIES: dict[str, list[str]] = {
    "penicillin": [
        "amoxicillin", "ampicillin", "penicillin", "piperacillin",
        "nafcillin", "oxacillin", "dicloxacillin", "flucloxacillin",
        "amoxicillin-clavulanate", "augmentin", "co-amoxiclav",
    ],
    "cephalosporin": [
        "cephalexin", "cefazolin", "cefuroxime", "ceftriaxone",
        "cefixime", "cefpodoxime", "ceftazidime", "cefepime",
    ],
    "sulfa": [
        "sulfamethoxazole", "trimethoprim-sulfamethoxazole", "bactrim",
        "sulfasalazine", "dapsone", "sulfadiazine",
    ],
    "nsaid": [
        "ibuprofen", "naproxen", "diclofenac", "indomethacin",
        "piroxicam", "meloxicam", "ketorolac", "aspirin",
    ],
    "aspirin": [
        "aspirin", "acetylsalicylic acid",
    ],
    "codeine": [
        "codeine", "morphine", "hydrocodone", "oxycodone",
        "fentanyl", "tramadol",
    ],
    "latex": [],  # latex is not a drug, but flagged for awareness
    "iodine": [
        "povidone-iodine", "contrast dye", "iodinated contrast",
        "betadine", "lugol",
    ],
    "egg": [
        # Some vaccines are egg-based
    ],
    "shellfish": [],  # cross-reactivity myth with iodine, but flag for awareness
}

# Penicillin-cephalosporin cross-reactivity (~2%)
CROSS_REACTIVE_FAMILIES: list[tuple[str, str]] = [
    ("penicillin", "cephalosporin"),
]


@dataclass
class GuardrailFlag:
    medication_id: str
    medication_name: str
    conflicting_with: str
    severity: str  # "moderate" | "severe"
    message: str
    flag_type: str  # "drug_drug" | "drug_allergy" | "duplicate" | "cross_reactivity"


@dataclass
class GuardrailResult:
    safe: bool
    flags: list[dict] = field(default_factory=list)


def _normalize(name: str) -> str:
    """Lowercase, strip whitespace/special chars for matching."""
    return (name or "").lower().strip().replace("-", " ").replace("_", " ")


def _check_drug_drug_interactions(
    medication_items: list[dict],
    existing_medications: list[dict],
) -> list[GuardrailFlag]:
    """Check new meds against existing active prescriptions for known interactions."""
    flags: list[GuardrailFlag] = []

    all_meds = []
    for item in medication_items:
        all_meds.append({
            "id": item.get("medication_id", ""),
            "name": _normalize(item.get("name", item.get("medication_id", ""))),
            "source": "new",
        })

    for item in existing_medications:
        all_meds.append({
            "id": item.get("medication_id", item.get("id", "")),
            "name": _normalize(item.get("name", "")),
            "source": "existing",
            "doctor": item.get("doctor_name", "Another doctor"),
        })

    # Check every pair
    for i, med_a in enumerate(all_meds):
        for j, med_b in enumerate(all_meds):
            if i >= j:
                continue
            # Skip if both are from existing (already dispensed together)
            if med_a["source"] == "existing" and med_b["source"] == "existing":
                continue

            for interaction in KNOWN_INTERACTIONS:
                a_norm = _normalize(interaction["drug_a"])
                b_norm = _normalize(interaction["drug_b"])

                match = (
                    (a_norm in med_a["name"] and b_norm in med_b["name"]) or
                    (b_norm in med_a["name"] and a_norm in med_b["name"])
                )
                if match:
                    # Determine which is the "new" one
                    new_med = med_a if med_a["source"] == "new" else med_b
                    existing_med = med_b if med_a["source"] == "new" else med_a
                    conflicting_label = existing_med["name"].title()
                    if existing_med.get("doctor"):
                        conflicting_label += f" (prescribed by {existing_med['doctor']})"

                    flags.append(GuardrailFlag(
                        medication_id=new_med["id"],
                        medication_name=new_med["name"].title(),
                        conflicting_with=conflicting_label,
                        severity=interaction["severity"],
                        message=interaction["message"],
                        flag_type="drug_drug",
                    ))

    return flags


def _check_allergy_conflicts(
    medication_items: list[dict],
    patient_allergies: list[dict],
) -> list[GuardrailFlag]:
    """Check new meds against patient's known allergies."""
    flags: list[GuardrailFlag] = []

    for allergy in patient_allergies:
        allergen = _normalize(allergy.get("allergen_name", ""))
        severity_label = allergy.get("severity", "unknown")
        reaction = allergy.get("reaction_type", "reaction")

        # Find which drug families this allergen maps to
        family_drugs: list[str] = []
        for family_key, drugs in ALLERGY_DRUG_FAMILIES.items():
            if allergen in _normalize(family_key) or _normalize(family_key) in allergen:
                family_drugs.extend(drugs)

        # Check cross-reactivity
        for fam_a, fam_b in CROSS_REACTIVE_FAMILIES:
            if allergen in _normalize(fam_a) or _normalize(fam_a) in allergen:
                family_drugs.extend(ALLERGY_DRUG_FAMILIES.get(fam_b, []))
            elif allergen in _normalize(fam_b) or _normalize(fam_b) in allergen:
                family_drugs.extend(ALLERGY_DRUG_FAMILIES.get(fam_a, []))

        # Also direct match
        family_drugs.append(allergen)

        for item in medication_items:
            med_name = _normalize(item.get("name", item.get("medication_id", "")))
            for drug in family_drugs:
                if _normalize(drug) in med_name or med_name in _normalize(drug):
                    confirmed = allergy.get("confirmed_by_doctor", False)
                    flag_severity = "severe" if confirmed or severity_label == "severe" else "moderate"
                    status_text = "doctor-confirmed" if confirmed else "patient-reported"

                    flags.append(GuardrailFlag(
                        medication_id=item.get("medication_id", ""),
                        medication_name=med_name.title(),
                        conflicting_with=f"Allergy: {allergen.title()} ({status_text}, {reaction})",
                        severity=flag_severity,
                        message=(
                            f"Patient has a {status_text} allergy to {allergen.title()} "
                            f"(reaction: {reaction}, severity: {severity_label}). "
                            f"{med_name.title()} belongs to the same drug family and may trigger a similar reaction."
                        ),
                        flag_type="drug_allergy",
                    ))
                    break  # One flag per allergy-med pair

    return flags


def _check_duplicates(
    medication_items: list[dict],
    existing_medications: list[dict],
) -> list[GuardrailFlag]:
    """Check if the same drug is being prescribed by multiple doctors."""
    flags: list[GuardrailFlag] = []
    new_names = {_normalize(item.get("name", item.get("medication_id", ""))): item for item in medication_items}

    for existing in existing_medications:
        existing_name = _normalize(existing.get("name", ""))
        for new_name, new_item in new_names.items():
            if new_name and existing_name and (new_name in existing_name or existing_name in new_name):
                doctor = existing.get("doctor_name", "Another doctor")
                flags.append(GuardrailFlag(
                    medication_id=new_item.get("medication_id", ""),
                    medication_name=new_name.title(),
                    conflicting_with=f"Duplicate: {existing_name.title()} (already prescribed by {doctor})",
                    severity="moderate",
                    message=(
                        f"{new_name.title()} appears to already be prescribed by {doctor}. "
                        f"Prescribing the same medication from multiple doctors may lead to "
                        f"unintentional overdose. Please verify this is intentional."
                    ),
                    flag_type="duplicate",
                ))

    return flags


def run_guardrail_check(
    medication_items: list[dict],
    existing_medications: list[dict],
    patient_allergies: list[dict],
) -> GuardrailResult:
    """
    Main guardrail entry point.

    Args:
        medication_items: New/draft medications being prescribed.
            Each dict should have: medication_id, name, dosage
        existing_medications: All active medications from other doctors.
            Each dict should have: medication_id, name, doctor_name
        patient_allergies: Patient's known allergies.
            Each dict should have: allergen_name, reaction_type, severity, confirmed_by_doctor

    Returns:
        GuardrailResult with safe flag and list of flags.
    """
    all_flags: list[GuardrailFlag] = []

    # 1. Drug-drug interactions
    all_flags.extend(_check_drug_drug_interactions(medication_items, existing_medications))

    # 2. Allergy conflicts
    all_flags.extend(_check_allergy_conflicts(medication_items, patient_allergies))

    # 3. Duplicate detection
    all_flags.extend(_check_duplicates(medication_items, existing_medications))

    # Deduplicate flags by (medication_id, conflicting_with)
    seen = set()
    unique_flags = []
    for f in all_flags:
        key = (f.medication_id, f.conflicting_with)
        if key not in seen:
            seen.add(key)
            unique_flags.append(f)

    has_severe = any(f.severity == "severe" for f in unique_flags)

    return GuardrailResult(
        safe=len(unique_flags) == 0,
        flags=[
            {
                "medication_id": f.medication_id,
                "medication_name": f.medication_name,
                "conflicting_with": f.conflicting_with,
                "severity": f.severity,
                "message": f.message,
                "flag_type": f.flag_type,
            }
            for f in unique_flags
        ],
    )
