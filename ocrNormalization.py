from difflib import SequenceMatcher


CANONICAL_LABELS = [
    "SURNAME",
    "NAMES",
    "DATE OF BIRTH",
    "SEX",
    "NATIONALITY",
    "IDENTITY NUMBER",
    "STATUS",
    "COUNTRY OF BIRTH"
]


COMMON_OCR_LABEL_FIXES = {
    "SUMAME": "SURNAME",
    "SURNARNE": "SURNAME",
    "SURNAME": "SURNAME",

    "NARNES": "NAMES",
    "NAMES": "NAMES",

    "IDENTlTY NUMBER": "IDENTITY NUMBER",
    "LDENTITY NUMBER": "IDENTITY NUMBER",
    "IDENTITY NUNBER": "IDENTITY NUMBER",

    "NATLONALITY": "NATIONALITY",
    "NATIONALITY": "NATIONALITY",

    "SEK": "SEX",
    "SEX": "SEX",

    "DATE 0F BIRTH": "DATE OF BIRTH",
    "DATE OF BLRTH": "DATE OF BIRTH",
    "DATE OF BIRTH": "DATE OF BIRTH"
}


def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.upper(), b.upper()).ratio()


def normalize_label(label: str) -> str:
    cleaned = label.upper().strip().replace(":", "")

    if cleaned in COMMON_OCR_LABEL_FIXES:
        return COMMON_OCR_LABEL_FIXES[cleaned]

    best_label = None
    best_score = 0

    for canonical in CANONICAL_LABELS:
        score = similarity(cleaned, canonical)

        if score > best_score:
            best_score = score
            best_label = canonical

    if best_score >= 0.82:
        return best_label

    return cleaned
