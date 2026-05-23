from datetime import datetime


MONTHS = {
    "JAN": "01",
    "FEB": "02",
    "MAR": "03",
    "APR": "04",
    "MAY": "05",
    "JUN": "06",
    "JUL": "07",
    "AUG": "08",
    "SEP": "09",
    "OCT": "10",
    "NOV": "11",
    "DEC": "12"
}


def normalize_ocr_dob(value: str):
    if not value:
        return None

    value = value.strip().upper()

    # Example: 28 JAN 2000
    parts = value.split()

    if len(parts) == 3:
        day, month_text, year = parts

        month = MONTHS.get(month_text[:3])

        if month:
            return f"{year}-{month}-{int(day):02d}"

    # Example: 2000-01-28
    try:
        return datetime.strptime(value, "%Y-%m-%d").strftime("%Y-%m-%d")
    except Exception:
        return None


def normalize_gender(value: str):
    if not value:
        return None

    value = value.strip().upper()

    if value in ["M", "MALE"]:
        return "Male"

    if value in ["F", "FEMALE"]:
        return "Female"

    return None


def run_id_consistency_checks(fields: dict):
    checks = {}

    dob_ocr = normalize_ocr_dob(fields.get("date_of_birth_ocr"))
    dob_derived = fields.get("date_of_birth_derived")

    checks["dob"] = {
        "ocr_value": dob_ocr,
        "derived_value": dob_derived,
        "match": dob_ocr == dob_derived if dob_ocr and dob_derived else None
    }

    gender_ocr = normalize_gender(fields.get("sex_ocr"))
    gender_derived = fields.get("gender_derived")

    checks["gender"] = {
        "ocr_value": gender_ocr,
        "derived_value": gender_derived,
        "match": gender_ocr == gender_derived if gender_ocr and gender_derived else None
    }

    nationality = fields.get("nationality")

    checks["nationality"] = {
        "ocr_value": nationality,
        "expected_values": ["RSA", "SOUTH AFRICAN"],
        "match": nationality.upper() in ["RSA", "SOUTH AFRICAN"] if nationality else None
    }

    warnings = []

    for check_name, check in checks.items():
        if check["match"] is False:
            warnings.append(f"{check_name} does not match expected or derived value.")

    return {
        "checks": checks,
        "warnings": warnings,
        "passed": len(warnings) == 0
    }
