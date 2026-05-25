def calculate_address_confidence(verification_result: dict, quality_result: dict):
    score = 0.0
    factors = []

    fields = verification_result.get("fields", {})
    verification = verification_result.get("verification", {})
    indicators = verification.get("matched_indicators", [])

    if "proof_of_address_keywords_detected" in indicators:
        score += 0.15
        factors.append("Proof-of-address keywords detected")

    if "known_issuer_detected" in indicators:
        score += 0.15
        factors.append("Known issuer detected")

    if "issue_date_detected" in indicators:
        score += 0.10
        factors.append("Issue date detected")

    if fields.get("postal_code"):
        score += 0.20
        factors.append("Postal code extracted")

    if fields.get("province"):
        score += 0.15
        factors.append("Province extracted")

    if fields.get("city"):
        score += 0.10
        factors.append("City extracted")

    if fields.get("street_address"):
        score += 0.10
        factors.append("Street address extracted")

    if fields.get("suburb"):
        score += 0.05
        factors.append("Suburb extracted")

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
