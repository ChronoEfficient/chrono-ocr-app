import re


SA_BANKS = [
    "FNB",
    "FIRST NATIONAL BANK",
    "ABSA",
    "STANDARD BANK",
    "NEDBANK",
    "CAPITEC",
    "INVESTEC",
    "TYMEBANK",
    "AFRICAN BANK",
    "BIDVEST BANK"
]


BANKING_KEYWORDS = [
    "ACCOUNT NUMBER",
    "ACCOUNT NO",
    "ACC NO",
    "BRANCH CODE",
    "BRANCH NUMBER",
    "ACCOUNT HOLDER",
    "ACCOUNT TYPE",
    "BANK STATEMENT",
    "PROOF OF BANKING",
    "CONFIRMATION OF BANKING",
    "BANKING DETAILS"
]


ACCOUNT_TYPE_WORDS = [
    "CHEQUE ACCOUNT",
    "SAVINGS ACCOUNT",
    "CURRENT ACCOUNT",
    "TRANSMISSION ACCOUNT",
    "BUSINESS ACCOUNT",
    "CREDIT ACCOUNT",
    "PRIVATE BANKING ACCOUNT",
    "PERSONAL ACCOUNT",
    "MYMO ACCOUNT",
    "ACCESS ACCOUNT",
    "ELITE ACCOUNT",
    "GOLD ACCOUNT",
    "PLATINUM ACCOUNT",
    "CHEQUE",
    "SAVINGS",
    "CURRENT",
    "TRANSMISSION",
    "BUSINESS",
    "CREDIT",
    "ACCOUNT TYPE"
]


NON_NAME_PHRASES = [
    "TO WHOM IT MAY CONCERN",
    "DEAR SIR",
    "DEAR MADAM",
    "BANKING DETAILS",
    "PROOF OF BANKING",
    "ACCOUNT CONFIRMATION",
    "CONFIRMATION OF BANKING",
    "THIS LETTER",
    "PLEASE NOTE"
]


def clean_value(value: str):
    if not value:
        return None

    value = value.strip()
    value = re.sub(r"\s+", " ", value)
    value = value.replace(":", "").strip()

    return value if value else None


def looks_like_account_type(value: str):
    if not value:
        return False

    upper_value = value.upper()

    return any(
        term == upper_value or term in upper_value
        for term in ACCOUNT_TYPE_WORDS
    )


def looks_like_person_name(value: str):
    if not value:
        return False

    value = clean_value(value)

    if not value:
        return False

    upper_value = value.upper()

    if any(phrase in upper_value for phrase in NON_NAME_PHRASES):
        return False

    if looks_like_account_type(value):
        return False

    if re.search(r"\d", value):
        return False

    words = value.split()

    if len(words) < 2:
        return False

    alpha_chars = re.sub(r"[^A-Za-z]", "", value)

    return len(alpha_chars) >= 4


def detect_bank_name(text: str):
    upper_text = text.upper()

    for bank in SA_BANKS:
        if bank in upper_text:
            return bank

    return None


def extract_label_value(text: str, labels: list[str]):
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    for i, line in enumerate(lines):
        upper_line = line.upper()

        for label in labels:
            if label.upper() in upper_line:
                possible_value = re.sub(
                    label,
                    "",
                    line,
                    flags=re.IGNORECASE
                ).strip(" :")

                if possible_value:
                    return clean_value(possible_value)

                if i + 1 < len(lines):
                    return clean_value(lines[i + 1])

    return None


def extract_account_number(text: str):
    value = extract_label_value(
        text,
        ["ACCOUNT NUMBER", "ACCOUNT NO", "ACC NO"]
    )

    if value:
        digits = re.sub(r"\D", "", value)

        if 6 <= len(digits) <= 16:
            return digits

    candidates = re.findall(r"\b\d{6,16}\b", text)

    return candidates[0] if candidates else None


def extract_branch_code(text: str):
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    labels = [
        "BRANCH CODE",
        "BRANCH NUMBER",
        "BRANCH"
    ]

    for i, line in enumerate(lines):
        upper_line = line.upper()

        for label in labels:
            if label in upper_line:
                possible_value = re.sub(
                    label,
                    "",
                    line,
                    flags=re.IGNORECASE
                ).strip(" :")

                if possible_value:
                    digits = re.sub(r"\D", "", possible_value)

                    if 3 <= len(digits) <= 6:
                        return digits

                # Check next 3 lines after label
                for offset in range(1, 4):
                    if i + offset < len(lines):
                        next_line = lines[i + offset]
                        digits = re.sub(r"\D", "", next_line)

                        if 3 <= len(digits) <= 6:
                            return digits

    # Fallback only if label not found
    candidates = re.findall(r"\b\d{6}\b", text)

    return candidates[0] if candidates else None


def extract_account_type(text: str):
    value = extract_label_value(
        text,
        [
            "ACCOUNT TYPE",
            "TYPE OF ACCOUNT",
            "PRODUCT",
            "PRODUCT TYPE",
            "ACCOUNT DESCRIPTION"
        ]
    )

    if value:
        cleaned = clean_value(value)
        upper_value = cleaned.upper()

        for account_type in ACCOUNT_TYPE_WORDS:
            if account_type == "ACCOUNT TYPE":
                continue

            if upper_value == account_type or account_type in upper_value:
                return account_type.title()

    upper_text = text.upper()

    for account_type in ACCOUNT_TYPE_WORDS:
        if account_type == "ACCOUNT TYPE":
            continue

        if account_type in upper_text:
            return account_type.title()

    return None


def extract_account_holder(text: str):
    value = extract_label_value(
        text,
        [
            "ACCOUNT HOLDER",
            "ACCOUNT NAME",
            "NAME OF ACCOUNT HOLDER",
            "CLIENT NAME",
            "CUSTOMER NAME"
        ]
    )

    if looks_like_person_name(value):
        return clean_value(value)

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    candidate_names = []

    for line in lines:
        cleaned = clean_value(line)

        if looks_like_person_name(cleaned):
            upper_cleaned = cleaned.upper()

            if any(bank in upper_cleaned for bank in SA_BANKS):
                continue

            if any(keyword in upper_cleaned for keyword in BANKING_KEYWORDS):
                continue

            if any(phrase in upper_cleaned for phrase in NON_NAME_PHRASES):
                continue

            candidate_names.append(cleaned)

    return candidate_names[0] if candidate_names else None


def extract_from_layout(layout, labels):
    if not layout:
        return None

    for page in layout:
        for line in page.get("lines", []):
            text = line.get("text", "").strip()

            upper_text = text.upper()

            for label in labels:
                if label.upper() in upper_text:
                    possible_value = re.sub(
                        label,
                        "",
                        text,
                        flags=re.IGNORECASE
                    ).strip(" :")

                    if possible_value:
                        return clean_value(possible_value)

    return None


def verify_banking_document(text: str, layout=None):
    upper_text = text.upper()
    indicators = []
    warnings = []

    bank_name = detect_bank_name(text)

    if bank_name:
        indicators.append("bank_name_detected")

    keyword_matches = [
        keyword for keyword in BANKING_KEYWORDS
        if keyword in upper_text
    ]

    if keyword_matches:
        indicators.append("banking_keywords_detected")

    account_number = extract_from_layout(
        layout,
        ["ACCOUNT NUMBER", "ACCOUNT NO", "ACC NO"]
    )

    if not account_number:
        account_number = extract_account_number(text)

    if account_number:
        indicators.append("account_number_detected")

    branch_code = extract_from_layout(
        layout,
        ["BRANCH CODE", "BRANCH NUMBER"]
    )

    if not branch_code:
        branch_code = extract_branch_code(text)

    if branch_code:
        indicators.append("branch_code_detected")

    account_holder = extract_from_layout(
        layout,
        [
            "ACCOUNT HOLDER",
            "ACCOUNT NAME",
            "NAME OF ACCOUNT HOLDER",
            "CLIENT NAME",
            "CUSTOMER NAME"
        ]
    )

    if not account_holder or not looks_like_person_name(account_holder):
        account_holder = extract_account_holder(text)

    if account_holder:
        indicators.append("account_holder_detected")

    account_type = extract_from_layout(
        layout,
        [
            "ACCOUNT TYPE",
            "TYPE OF ACCOUNT",
            "PRODUCT",
            "PRODUCT TYPE"
        ]
    )

    if not account_type:
        account_type = extract_account_type(text)

    if account_type:
        indicators.append("account_type_detected")

    document_verified = (
        bank_name is not None
        and account_number is not None
        and len(keyword_matches) > 0
    )

    if not bank_name:
        warnings.append("Bank name could not be detected.")

    if not account_number:
        warnings.append("Account number could not be detected.")

    if not branch_code:
        warnings.append("Branch code could not be detected.")

    if not account_holder:
        warnings.append("Account holder could not be detected.")

    if not account_type:
        warnings.append("Account type could not be detected.")

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
        "document_type": "proof_of_banking",
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
                else "Document does not appear to be valid proof of banking."
            )
        },
        "fields": {
            "bank_name": bank_name,
            "account_holder": account_holder,
            "account_number": account_number,
            "branch_code": branch_code,
            "account_type": account_type
        }
    }
