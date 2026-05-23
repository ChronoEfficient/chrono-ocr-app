def calculate_banking_confidence(verification_result: dict, quality_result: dict):
    score = 0.0
    factors = []

    fields = verification_result.get("fields", {})
    verification = verification_result.get("verification", {})
    indicators = verification.get("matched_indicators", [])

    if "bank_name_detected" in indicators:
        score += 0.20
        factors.append("Bank name detected")

    if "banking_keywords_detected" in indicators:
        score += 0.15
        factors.append("Banking-related keywords detected")

    if fields.get("account_number"):
        score += 0.25
        factors.append("Account number extracted")

    if fields.get("branch_code"):
        score += 0.15
        factors.append("Branch code extracted")

    if fields.get("account_holder"):
        score += 0.15
        factors.append("Account holder extracted")

    if fields.get("account_type"):
        score += 0.10
        factors.append("Account type extracted")

    if quality_result.get("quality_checked"):
        if not quality_result.get("resolution_ok", True):
            score -= 0.05
        if quality_result.get("blur_detected"):
            score -= 0.10
        if quality_result.get("low_light"):
            score -= 0.05
        if quality_result.get("over_exposed"):
            score -= 0.05

    score = max(0.0, min(score, 1.0))

    if score >= 0.90:
        confidence_band = "high"
    elif score >= 0.70:
        confidence_band = "medium"
    else:
        confidence_band = "low"

    return {
        "overall_score": round(score, 2),
        "confidence_band": confidence_band,
        "factors": factors
    }
