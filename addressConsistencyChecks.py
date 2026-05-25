import re


POSTAL_CODE_RE = re.compile(r"^\d{4}$")


def run_address_consistency_checks(fields: dict):
    checks = {}

    postal_code = fields.get("postal_code")
    province = fields.get("province")
    city = fields.get("city")
    street_address = fields.get("street_address")
    country = fields.get("country")
    issuer = fields.get("issuer")
    issue_date = fields.get("issue_date")

    checks["postal_code"] = {
        "value": postal_code,
        "present": bool(postal_code),
        "format_ok": bool(postal_code and POSTAL_CODE_RE.match(postal_code))
    }

    checks["province"] = {
        "value": province,
        "present": bool(province)
    }

    checks["city"] = {
        "value": city,
        "present": bool(city)
    }

    checks["street_address"] = {
        "value": street_address,
        "present": bool(street_address)
    }

    checks["country"] = {
        "value": country,
        "present": bool(country)
    }

    checks["issuer"] = {
        "value": issuer,
        "present": bool(issuer)
    }

    checks["issue_date"] = {
        "value": issue_date,
        "present": bool(issue_date)
    }

    warnings = []

    for name, check in checks.items():
        if not check.get("present"):
            warnings.append(f"{name} is missing.")

        if "format_ok" in check and check.get("present") and not check.get("format_ok"):
            warnings.append(f"{name} format is invalid.")

    return {
        "passed": len(warnings) == 0,
        "checks": checks,
        "warnings": warnings
    }
