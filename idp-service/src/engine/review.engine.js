function isMissingRequiredValue(value) {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  );
}

export function evaluateReview({
  validation,
  extractedResult,
  qualityAssessment,
  reviewPolicy = {},
  qualityPolicy = {}
}) {
  const reasons = [];

  const confidence = Number(extractedResult?.confidence || 0);

  const configuredThreshold = Number(
    reviewPolicy.confidenceThreshold
  );

  const confidenceThreshold =
    Number.isFinite(configuredThreshold) &&
    configuredThreshold > 0
      ? configuredThreshold
      : 0.9;

  if (
    reviewPolicy.reviewOnValidationFailure !== false &&
    Array.isArray(validation?.issues)
  ) {
    reasons.push(...validation.issues);
  }

  if (
    reviewPolicy.reviewOnTypeMismatch !== false &&
    extractedResult?.is_document_type_match !== true
  ) {
    reasons.push(
      "Uploaded document does not match the requested document type."
    );
  }

  if (
    reviewPolicy.reviewOnExtractionFailure !== false &&
    extractedResult?.extraction_status !== "SUCCESS"
  ) {
    reasons.push(
      `Extraction status is ${
        extractedResult?.extraction_status || "UNKNOWN"
      }.`
    );
  }

  if (
    reviewPolicy.reviewOnLowConfidence !== false &&
    confidence < confidenceThreshold
  ) {
    reasons.push(
      `Confidence ${confidence} is below the threshold ${confidenceThreshold}.`
    );
  }

  const requiredFields = Array.isArray(
    reviewPolicy.requiredFields
  )
    ? reviewPolicy.requiredFields
    : [];

  const extractedFields =
    extractedResult?.fields &&
    typeof extractedResult.fields === "object"
      ? extractedResult.fields
      : {};

  for (const fieldName of requiredFields) {
    if (isMissingRequiredValue(extractedFields[fieldName])) {
      reasons.push(
        `Required field '${fieldName}' was not extracted.`
      );
    }
  }

  if (
    qualityPolicy.reviewOnWarning !== false &&
    qualityAssessment?.reviewRequired === true
  ) {
    if (Array.isArray(qualityAssessment.issues)) {
      reasons.push(...qualityAssessment.issues);
    }

    if (Array.isArray(qualityAssessment.warnings)) {
      reasons.push(...qualityAssessment.warnings);
    }
  }

  if (reviewPolicy.alwaysReview === true) {
    reasons.push(
      "Human review is required by the document review policy."
    );
  }

  const uniqueReasons = [...new Set(reasons)];

  return {
    required: uniqueReasons.length > 0,
    reasons: uniqueReasons,
    confidenceThreshold,
    policy: {
      alwaysReview:
        reviewPolicy.alwaysReview === true,
      reviewOnTypeMismatch:
        reviewPolicy.reviewOnTypeMismatch !== false,
      reviewOnExtractionFailure:
        reviewPolicy.reviewOnExtractionFailure !== false,
      reviewOnValidationFailure:
        reviewPolicy.reviewOnValidationFailure !== false,
      reviewOnLowConfidence:
        reviewPolicy.reviewOnLowConfidence !== false,
      requiredFields
    }
  };
}
