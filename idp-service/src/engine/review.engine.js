// src/engine/review.engine.js

function isMissingRequiredValue(value) {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  );
}

function normalizeConfidence(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(1, Math.max(0, numericValue));
}

function normalizeExtractionStatus(value) {
  const normalizedValue = String(value ?? "")
    .trim()
    .toUpperCase();

  return normalizedValue || "UNKNOWN";
}

function normalizeIssues(issues) {
  if (!Array.isArray(issues)) {
    return [];
  }

  return issues
    .map((issue) => {
      if (typeof issue === "string") {
        return issue.trim();
      }

      if (
        issue &&
        typeof issue === "object" &&
        typeof issue.message === "string"
      ) {
        return issue.message.trim();
      }

      return String(issue ?? "").trim();
    })
    .filter(Boolean);
}

function resolveConfidenceThreshold({
  confidenceThreshold,
  reviewPolicy
}) {
  const directThreshold = Number(confidenceThreshold);

  if (
    Number.isFinite(directThreshold) &&
    directThreshold > 0 &&
    directThreshold <= 1
  ) {
    return directThreshold;
  }

  const policyThreshold = Number(
    reviewPolicy?.confidenceThreshold
  );

  if (
    Number.isFinite(policyThreshold) &&
    policyThreshold > 0 &&
    policyThreshold <= 1
  ) {
    return policyThreshold;
  }

  return 0.9;
}

function resolveRequiredFields({
  requiredFields,
  reviewPolicy
}) {
  if (Array.isArray(requiredFields)) {
    return requiredFields;
  }

  if (Array.isArray(reviewPolicy?.requiredFields)) {
    return reviewPolicy.requiredFields;
  }

  return [];
}

/**
 * Determines whether a document requires human review.
 *
 * Supports the current processor contract:
 *
 * {
 *   extractionStatus,
 *   confidence,
 *   confidenceThreshold,
 *   extractedData,
 *   validation,
 *   quality,
 *   typeMatch,
 *   requiredFields,
 *   policy
 * }
 *
 * It also remains compatible with the previous contract:
 *
 * {
 *   validation,
 *   extractedResult,
 *   qualityAssessment,
 *   reviewPolicy,
 *   qualityPolicy
 * }
 */
export function evaluateReview({
  extractionStatus,
  confidence,
  confidenceThreshold,
  extractedData,
  validation,
  quality,
  typeMatch,
  requiredFields,
  policy,

  // Backward-compatible properties
  extractedResult,
  qualityAssessment,
  reviewPolicy,
  qualityPolicy
} = {}) {
  const reasons = [];

  const resolvedReviewPolicy =
    policy ??
    reviewPolicy ??
    {};

  const resolvedQualityPolicy =
    qualityPolicy ??
    resolvedReviewPolicy.qualityPolicy ??
    {};

  const resolvedExtractionStatus =
    normalizeExtractionStatus(
      extractionStatus ??
        extractedResult?.extraction_status ??
        extractedResult?.extractionStatus ??
        extractedResult?.status
    );

  const resolvedConfidence =
    normalizeConfidence(
      confidence ??
        extractedResult?.confidence
    );

  const resolvedTypeMatch =
    typeof typeMatch === "boolean"
      ? typeMatch
      : (
          extractedResult?.is_document_type_match ??
          extractedResult?.typeMatch ??
          extractedResult?.type_match ??
          false
        );

  const resolvedExtractedData =
    extractedData &&
    typeof extractedData === "object"
      ? extractedData
      : (
          extractedResult?.fields &&
          typeof extractedResult.fields === "object"
            ? extractedResult.fields
            : {}
        );

  const resolvedQuality =
    quality ??
    qualityAssessment ??
    {};

  const resolvedConfidenceThreshold =
    resolveConfidenceThreshold({
      confidenceThreshold,
      reviewPolicy: resolvedReviewPolicy
    });

  const resolvedRequiredFields =
    resolveRequiredFields({
      requiredFields,
      reviewPolicy: resolvedReviewPolicy
    });

  /*
   * Validation failure.
   */
  if (
    resolvedReviewPolicy.reviewOnValidationFailure !== false &&
    validation?.valid === false
  ) {
    reasons.push(
      ...normalizeIssues(validation.issues)
    );
  }

  /*
   * Document type mismatch.
   */
  if (
    resolvedReviewPolicy.reviewOnTypeMismatch !== false &&
    resolvedTypeMatch !== true
  ) {
    reasons.push(
      "Uploaded document does not match the requested document type."
    );
  }

  /*
   * Extraction did not complete successfully.
   */
  if (
    resolvedReviewPolicy.reviewOnExtractionFailure !== false &&
    resolvedExtractionStatus !== "SUCCESS"
  ) {
    reasons.push(
      `Extraction status is ${resolvedExtractionStatus}.`
    );
  }

  /*
   * Confidence below threshold.
   */
  if (
    resolvedReviewPolicy.reviewOnLowConfidence !== false &&
    resolvedConfidence < resolvedConfidenceThreshold
  ) {
    reasons.push(
      `Confidence ${resolvedConfidence} is below the threshold ` +
        `${resolvedConfidenceThreshold}.`
    );
  }

  /*
   * Missing required fields.
   */
  for (const fieldName of resolvedRequiredFields) {
    if (
      isMissingRequiredValue(
        resolvedExtractedData[fieldName]
      )
    ) {
      reasons.push(
        `Required field '${fieldName}' was not extracted.`
      );
    }
  }

  /*
   * Document quality warnings.
   */
  if (
    resolvedQualityPolicy.reviewOnWarning !== false &&
    resolvedQuality.reviewRequired === true
  ) {
    reasons.push(
      ...normalizeIssues(resolvedQuality.issues),
      ...normalizeIssues(resolvedQuality.warnings)
    );
  }

  /*
   * Always-review policy.
   */
  if (resolvedReviewPolicy.alwaysReview === true) {
    reasons.push(
      "Human review is required by the document review policy."
    );
  }

  const uniqueReasons = [
    ...new Set(
      reasons
        .map((reason) => String(reason).trim())
        .filter(Boolean)
    )
  ];

  return {
    required: uniqueReasons.length > 0,
    reasons: uniqueReasons,
    confidenceThreshold:
      resolvedConfidenceThreshold,

    policy: {
      alwaysReview:
        resolvedReviewPolicy.alwaysReview === true,

      reviewOnTypeMismatch:
        resolvedReviewPolicy.reviewOnTypeMismatch !== false,

      reviewOnExtractionFailure:
        resolvedReviewPolicy.reviewOnExtractionFailure !== false,

      reviewOnValidationFailure:
        resolvedReviewPolicy.reviewOnValidationFailure !== false,

      reviewOnLowConfidence:
        resolvedReviewPolicy.reviewOnLowConfidence !== false,

      requiredFields: resolvedRequiredFields
    }
  };
}
