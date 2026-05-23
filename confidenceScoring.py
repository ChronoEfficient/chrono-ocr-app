def calculate_id_confidence(verification_result: dict, quality_result: dict):
    score = 0.0
    factors = []

    fields = verification_result.get("fields", {})
    verification = verification_result.get("verification", {})
    indicators = verification.get("matched_indicators", [])

    # Document indicators
    if "republic_of_south_africa" in indicators:
        score += 0.15
        factors.append("Republic of South Africa detected")

    if "identity_number_label" in indicators:
        score += 0.15
        factors.append("Identity number label detected")

    if any(i.startswith("variant_detected") for i in indicators):
        score += 0.10
        factors.append("ID document variant detected")

    # Field extraction
    if fields.get("id_number"):
        score += 0.20
        factors.append("ID number extracted")

    if fields.get("surname"):
        score += 0.10
        factors.append("Surname extracted")

    if fields.get("names"):
        score += 0.10
        factors.append("Names extracted")

    if fields.get("date_of_birth_ocr"):
        score += 0.05
        factors.append("Date of birth extracted from OCR")

    if fields.get("nationality"):
        score += 0.05
        factors.append("Nationality extracted")

    # Validation
    if fields.get("id_number_valid"):
        score += 0.15
        factors.append("SA ID checksum passed")

    # Quality penalties
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
