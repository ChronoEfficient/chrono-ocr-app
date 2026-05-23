def run_banking_consistency_checks(fields: dict):
    checks = {}

    bank_name = fields.get("bank_name")
    account_holder = fields.get("account_holder")
    account_number = fields.get("account_number")
    branch_code = fields.get("branch_code")
    account_type = fields.get("account_type")

    checks["bank_name"] = {
        "value": bank_name,
        "present": bool(bank_name)
    }

    checks["account_holder"] = {
        "value": account_holder,
        "present": bool(account_holder)
    }

    checks["account_number"] = {
        "value": account_number,
        "present": bool(account_number),
        "length_ok": 6 <= len(account_number) <= 16 if account_number else False,
        "numeric": account_number.isdigit() if account_number else False
    }

    checks["branch_code"] = {
        "value": branch_code,
        "present": bool(branch_code),
        "length_ok": 3 <= len(branch_code) <= 6 if branch_code else False,
        "numeric": branch_code.isdigit() if branch_code else False
    }

    checks["account_type"] = {
        "value": account_type,
        "present": bool(account_type)
    }

    warnings = []

    for name, check in checks.items():
        if not check.get("present"):
            warnings.append(f"{name} is missing.")

        if "numeric" in check and not check.get("numeric"):
            warnings.append(f"{name} is not numeric.")

        if "length_ok" in check and not check.get("length_ok"):
            warnings.append(f"{name} length is outside expected range.")

    return {
        "passed": len(warnings) == 0,
        "checks": checks,
        "warnings": warnings
    }
