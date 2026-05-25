import re


SA_PROVINCES = [
    "GAUTENG",
    "WESTERN CAPE",
    "EASTERN CAPE",
    "NORTHERN CAPE",
    "FREE STATE",
    "MPUMALANGA",
    "LIMPOPO",
    "NORTH WEST",
    "KWAZULU-NATAL",
    "KWAZULU NATAL",
    "KZN"
]


PROVINCE_CANONICAL = {
    "KZN": "KwaZulu-Natal",
    "KWAZULU NATAL": "KwaZulu-Natal",
    "KWAZULU-NATAL": "KwaZulu-Natal",
    "GAUTENG": "Gauteng",
    "WESTERN CAPE": "Western Cape",
    "EASTERN CAPE": "Eastern Cape",
    "NORTHERN CAPE": "Northern Cape",
    "FREE STATE": "Free State",
    "MPUMALANGA": "Mpumalanga",
    "LIMPOPO": "Limpopo",
    "NORTH WEST": "North West"
}


PROOF_OF_ADDRESS_KEYWORDS = [
    "PROOF OF RESIDENCE",
    "PROOF OF ADDRESS",
    "STATEMENT OF ACCOUNT",
    "ACCOUNT STATEMENT",
    "MUNICIPAL ACCOUNT",
    "MUNICIPAL STATEMENT",
    "TAX INVOICE",
    "UTILITY BILL",
    "BILLING ADDRESS",
    "POSTAL ADDRESS",
    "PHYSICAL ADDRESS",
    "RESIDENTIAL ADDRESS",
    "DELIVERY ADDRESS",
    "SERVICE ADDRESS",
    "STATEMENT DATE",
    "DUE DATE",
    "INVOICE DATE",
    "ACCOUNT NUMBER"
]


ADDRESS_LABELS = [
    "BILLING ADDRESS",
    "POSTAL ADDRESS",
    "PHYSICAL ADDRESS",
    "RESIDENTIAL ADDRESS",
    "DELIVERY ADDRESS",
    "SERVICE ADDRESS",
    "ADDRESS"
]


KNOWN_ISSUERS = [
    "CITY OF CAPE TOWN",
    "CITY OF JOHANNESBURG",
    "CITY OF TSHWANE",
    "CITY OF EKURHULENI",
    "ETHEKWINI",
    "NELSON MANDELA BAY",
    "MANGAUNG",
    "BUFFALO CITY",
    "ESKOM",
    "VODACOM",
    "MTN",
    "TELKOM",
    "CELL C",
    "RAIN",
    "DISCOVERY",
    "OUTSURANCE",
    "SANLAM",
    "OLD MUTUAL",
    "MOMENTUM",
    "FNB",
    "FIRST NATIONAL BANK",
    "ABSA",
    "STANDARD BANK",
    "NEDBANK",
    "CAPITEC",
    "INVESTEC",
    "TYMEBANK",
    "AFRICAN BANK"
]


STREET_SUFFIXES = [
    "STREET", "ROAD", "AVENUE", "DRIVE", "LANE", "CRESCENT",
    "CLOSE", "WAY", "PLACE", "BOULEVARD", "HIGHWAY", "SQUARE",
    "PARK", "TERRACE",
    "ST", "RD", "AVE", "DR", "CRES", "CL", "BLVD"
]


POSTAL_CODE_RE = re.compile(r"\b\d{4}\b")
DATE_RE = re.compile(
    r"\b(\d{1,2})[\s/\-](\d{1,2}|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*[\s/\-](\d{2,4})\b",
    re.IGNORECASE
)


def clean_value(value: str):
    if not value:
        return None

    value = value.strip()
    value = re.sub(r"\s+", " ", value)
    value = value.strip(" :,;")

    return value if value else None


def split_lines(text: str):
    return [line.strip() for line in text.splitlines() if line.strip()]


def detect_issuer(text: str):
    upper_text = text.upper()

    for issuer in KNOWN_ISSUERS:
        if issuer in upper_text:
            return issuer.title()

    return None


def detect_issue_date(text: str):
    labels = ["STATEMENT DATE", "INVOICE DATE", "ISSUE DATE", "DATE OF ISSUE", "BILLING DATE"]
    lines = split_lines(text)

    for i, line in enumerate(lines):
        upper_line = line.upper()

        for label in labels:
            if label in upper_line:
                tail = re.sub(label, "", line, flags=re.IGNORECASE).strip(" :,")
                match = DATE_RE.search(tail) if tail else None

                if not match and i + 1 < len(lines):
                    match = DATE_RE.search(lines[i + 1])

                if match:
                    return clean_value(match.group(0))

    match = DATE_RE.search(text)

    return clean_value(match.group(0)) if match else None


def detect_province(text: str):
    upper_text = text.upper()

    for province in SA_PROVINCES:
        if re.search(rf"\b{re.escape(province)}\b", upper_text):
            return PROVINCE_CANONICAL[province]

    return None


def extract_postal_code(text: str):
    candidates = POSTAL_CODE_RE.findall(text)

    if not candidates:
        return None

    # Bias toward 4-digit codes that appear on a line with a province or right at end of an address block.
    upper_text = text.upper()
    province = detect_province(upper_text)

    if province:
        upper_province = province.upper()
        for line in split_lines(text):
            if upper_province in line.upper():
                line_matches = POSTAL_CODE_RE.findall(line)

                if line_matches:
                    return line_matches[0]

    return candidates[0]


def looks_like_street(line: str):
    if not line:
        return False

    if not re.search(r"\d", line):
        return False

    upper_line = line.upper()

    return any(re.search(rf"\b{re.escape(s)}\b", upper_line) for s in STREET_SUFFIXES)


def extract_address_block_from_label(text: str):
    lines = split_lines(text)

    for i, line in enumerate(lines):
        upper_line = line.upper()

        for label in ADDRESS_LABELS:
            if label in upper_line:
                tail = re.sub(label, "", line, flags=re.IGNORECASE).strip(" :,")

                block = []
                if tail:
                    block.append(tail)

                for offset in range(1, 7):
                    if i + offset >= len(lines):
                        break

                    candidate = lines[i + offset]
                    upper_candidate = candidate.upper()

                    # stop when we hit a new section
                    if any(other in upper_candidate for other in ADDRESS_LABELS if other != label):
                        break

                    block.append(candidate)

                    if POSTAL_CODE_RE.search(candidate):
                        break

                if block:
                    return block

    return None


def extract_address_block_from_postal(text: str):
    lines = split_lines(text)

    for i, line in enumerate(lines):
        if not POSTAL_CODE_RE.search(line):
            continue

        block = []

        for offset in range(max(0, i - 5), i + 1):
            block.append(lines[offset])

        return block

    return None


def parse_address_block(block: list):
    cleaned = [clean_value(line) for line in block if clean_value(line)]

    if not cleaned:
        return {}

    street = None
    suburb = None
    city = None
    province = None
    postal_code = None
    country = None

    province = detect_province(" ".join(cleaned))

    for line in cleaned:
        if POSTAL_CODE_RE.search(line):
            match = POSTAL_CODE_RE.search(line)

            if match:
                postal_code = match.group(0)
            break

    for line in cleaned:
        if looks_like_street(line):
            street = line
            break

    upper_country_hits = ["SOUTH AFRICA", "RSA"]
    for line in cleaned:
        upper_line = line.upper()

        if any(hit == upper_line or hit in upper_line for hit in upper_country_hits):
            country = "South Africa"
            break

    if not country and province:
        country = "South Africa"

    # City/suburb: of the non-street, non-postal, non-province lines, pick the last as city and the prior as suburb.
    leftover = []
    for line in cleaned:
        upper_line = line.upper()

        if street and line == street:
            continue
        if POSTAL_CODE_RE.fullmatch(line):
            continue
        if line.upper() in PROVINCE_CANONICAL:
            continue
        if any(c in upper_line for c in ["SOUTH AFRICA", "RSA"]) and not re.search(r"[A-Z]{4,}", upper_line.replace("SOUTH AFRICA", "").replace("RSA", "")):
            continue

        leftover.append(line)

    if leftover:
        city_candidate = leftover[-1]

        match = POSTAL_CODE_RE.search(city_candidate)
        if match:
            city_candidate = POSTAL_CODE_RE.sub("", city_candidate).strip(" ,")

        for prov_upper, prov_canonical in PROVINCE_CANONICAL.items():
            city_candidate = re.sub(rf"\b{re.escape(prov_upper)}\b", "", city_candidate, flags=re.IGNORECASE).strip(" ,")

        if city_candidate:
            city = city_candidate

        if len(leftover) >= 2:
            suburb_candidate = leftover[-2]

            if suburb_candidate and suburb_candidate != street and not POSTAL_CODE_RE.fullmatch(suburb_candidate):
                suburb = suburb_candidate

    return {
        "street_address": street,
        "suburb": suburb,
        "city": city,
        "province": province,
        "postal_code": postal_code,
        "country": country,
        "full_address": ", ".join(cleaned)
    }


def verify_proof_of_address(text: str):
    upper_text = text.upper()
    indicators = []
    warnings = []

    keyword_matches = [
        keyword for keyword in PROOF_OF_ADDRESS_KEYWORDS
        if keyword in upper_text
    ]

    if keyword_matches:
        indicators.append("proof_of_address_keywords_detected")

    issuer = detect_issuer(text)

    if issuer:
        indicators.append("known_issuer_detected")

    issue_date = detect_issue_date(text)

    if issue_date:
        indicators.append("issue_date_detected")

    block = extract_address_block_from_label(text) or extract_address_block_from_postal(text)

    parsed = parse_address_block(block) if block else {}

    if parsed.get("postal_code"):
        indicators.append("postal_code_detected")

    if parsed.get("province"):
        indicators.append("province_detected")

    if parsed.get("street_address"):
        indicators.append("street_address_detected")

    if parsed.get("city"):
        indicators.append("city_detected")

    document_verified = bool(
        keyword_matches
        and parsed.get("postal_code")
        and (parsed.get("province") or parsed.get("city"))
    )

    if not keyword_matches:
        warnings.append("No proof-of-address keywords detected.")

    if not parsed.get("postal_code"):
        warnings.append("Postal code could not be detected.")

    if not parsed.get("province"):
        warnings.append("Province could not be detected.")

    if not parsed.get("street_address"):
        warnings.append("Street address could not be detected.")

    if not issuer:
        warnings.append("Document issuer could not be detected.")

    if document_verified and warnings:
        verification_status = "accepted_with_warnings"
        requires_review = True
    elif document_verified:
        verification_status = "verified"
        requires_review = False
    else:
        verification_status = "rejected"
        requires_review = True

    return {
        "document_type": "proof_of_address",
        "document_variant": "unknown",
        "document_verified": document_verified,
        "verification_status": verification_status,
        "requires_review": requires_review,
        "verification": {
            "matched_indicators": indicators,
            "warnings": warnings,
            "reason": (
                None
                if document_verified
                else "Document does not appear to be valid proof of address."
            )
        },
        "fields": {
            "issuer": issuer,
            "issue_date": issue_date,
            "street_address": parsed.get("street_address"),
            "suburb": parsed.get("suburb"),
            "city": parsed.get("city"),
            "province": parsed.get("province"),
            "postal_code": parsed.get("postal_code"),
            "country": parsed.get("country"),
            "full_address": parsed.get("full_address")
        }
    }
