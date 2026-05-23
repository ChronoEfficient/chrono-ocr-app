import re
from datetime import datetime

from ocrNormalization import normalize_label


KNOWN_LABELS = [
    "SURNAME",
    "LAST NAME",
    "NAMES",
    "FORENAMES",
    "FIRST NAMES",
    "GIVEN NAMES",
    "DATE OF BIRTH",
    "BIRTH DATE",
    "DOB",
    "SEX",
    "GENDER",
    "NATIONALITY",
    "CITIZENSHIP",
    "STATUS",
    "COUNTRY OF BIRTH",
    "IDENTITY NUMBER"
]


def validate_sa_id(id_number: str) -> bool:
    if not id_number or len(id_number) != 13 or not id_number.isdigit():
        return False

    try:
        datetime.strptime(id_number[:6], "%y%m%d")
    except ValueError:
        return False

    digits = [int(d) for d in id_number]
    odd_sum = sum(digits[0::2][:-1])
    even_concat = "".join(str(d) for d in digits[1::2])
    even_sum = sum(int(d) for d in str(int(even_concat) * 2))
    check_digit = (10 - ((odd_sum + even_sum) % 10)) % 10

    return check_digit == digits[-1]


def extract_sa_id_number(text: str):
    candidates = []
    candidates.extend(re.findall(r"\b\d{13}\b", text))

    grouped_matches = re.findall(r"(?<!\d)(?:\d[\s\-]*){13}(?!\d)", text)

    for match in grouped_matches:
        cleaned = re.sub(r"\D", "", match)
        if len(cleaned) == 13:
            candidates.append(cleaned)

    unique_candidates = []
    seen = set()

    for candidate in candidates:
        if candidate not in seen:
            seen.add(candidate)
            unique_candidates.append(candidate)

    for candidate in unique_candidates:
        if validate_sa_id(candidate):
            return candidate

    return unique_candidates[0] if unique_candidates else None


def detect_id_variant(text: str):
    upper_text = text.upper()

    if "NATIONAL IDENTITY CARD" in upper_text:
        return "sa_smart_id_card"

    if "IDENTITY DOCUMENT" in upper_text or "GREEN BARCODED" in upper_text:
        return "sa_green_id_book"

    if "TEMPORARY IDENTITY CERTIFICATE" in upper_text:
        return "sa_temporary_id"

    if "REPUBLIC OF SOUTH AFRICA" in upper_text and (
        "IDENTITY NUMBER" in upper_text or "ID NUMBER" in upper_text
    ):
        return "unknown_sa_id"

    return "unknown"


def clean_value(value: str):
    if not value:
        return None

    value = value.strip()
    value = re.sub(r"\s+", " ", value)
    value = value.replace(":", "").strip()

    return value if value else None


def extract_label_value(text: str, target_labels: list[str]):
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    normalized_targets = [normalize_label(label) for label in target_labels]
    normalized_known = [normalize_label(label) for label in KNOWN_LABELS]

    for i, line in enumerate(lines):
        raw_label_candidate = line.split(":")[0].strip()
        normalized_line_label = normalize_label(raw_label_candidate)

        if normalized_line_label in normalized_targets:
            possible_value = ""

            if ":" in line:
                possible_value = line.split(":", 1)[1].strip()

            if possible_value:
                return clean_value(possible_value)

            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                next_label_candidate = next_line.split(":")[0].strip()
                normalized_next_label = normalize_label(next_label_candidate)

                if normalized_next_label in normalized_known:
                    return None

                return clean_value(next_line)

    return None


def extract_ocr_identity_fields(text: str):
    return {
        "surname": extract_label_value(text, ["SURNAME", "LAST NAME"]),
        "names": extract_label_value(text, ["NAMES", "FORENAMES", "FIRST NAMES", "GIVEN NAMES"]),
        "date_of_birth_ocr": extract_label_value(text, ["DATE OF BIRTH", "BIRTH DATE", "DOB"]),
        "sex_ocr": extract_label_value(text, ["SEX", "GENDER"]),
        "nationality": extract_label_value(text, ["NATIONALITY", "CITIZENSHIP"]),
    }


def derive_birth_date(id_number: str):
    yy = int(id_number[:2])
    mm = int(id_number[2:4])
    dd = int(id_number[4:6])

    current_year = datetime.now().year % 100
    century = 1900 if yy > current_year else 2000

    return f"{century + yy:04d}-{mm:02d}-{dd:02d}"


def derive_gender(id_number: str):
    return "Male" if int(id_number[6:10]) >= 5000 else "Female"


def verify_sa_id_document(text: str):
    upper_text = text.upper()
    indicators = []
    warnings = []

    if "REPUBLIC OF SOUTH AFRICA" in upper_text:
        indicators.append("republic_of_south_africa")

    if "IDENTITY NUMBER" in upper_text or "ID NUMBER" in upper_text:
        indicators.append("identity_number_label")

    document_variant = detect_id_variant(text)

    if document_variant != "unknown":
        indicators.append(f"variant_detected:{document_variant}")

    id_number = extract_sa_id_number(text)

    if id_number:
        indicators.append("id_number_detected")

    id_number_valid = validate_sa_id(id_number) if id_number else False

    if id_number_valid:
        indicators.append("valid_sa_id_number")
    elif id_number:
        indicators.append("invalid_checksum")
        warnings.append("ID number detected, but checksum validation failed.")

    ocr_fields = extract_ocr_identity_fields(text)

    appears_to_be_sa_id = (
        "republic_of_south_africa" in indicators
        and "identity_number_label" in indicators
        and id_number is not None
    )

    if not appears_to_be_sa_id:
        return {
            "document_type": "id_document",
            "document_variant": document_variant,
            "capture_type": "unknown",
            "document_verified": False,
            "verification_status": "rejected",
            "requires_review": True,
            "verification": {
                "matched_indicators": indicators,
                "warnings": warnings,
                "reason": "Document does not appear to be a South African ID document or ID number could not be detected."
            },
            "fields": ocr_fields
        }

    verification_status = "verified" if id_number_valid else "accepted_with_warnings"
    requires_review = not id_number_valid

    fields = {
        **ocr_fields,
        "id_number": id_number,
        "id_number_valid": id_number_valid,
        "checksum_status": "passed" if id_number_valid else "failed",
        "date_of_birth_derived": derive_birth_date(id_number) if id_number_valid else None,
        "gender_derived": derive_gender(id_number) if id_number_valid else None,
    }

    return {
        "document_type": "id_document",
        "document_variant": document_variant,
        "capture_type": "unknown",
        "document_verified": True,
        "verification_status": verification_status,
        "requires_review": requires_review,
        "verification": {
            "matched_indicators": indicators,
            "warnings": warnings,
            "reason": None if id_number_valid else "Document appears to be an SA ID, but one or more validations require review."
        },
        "fields": fields
    }
