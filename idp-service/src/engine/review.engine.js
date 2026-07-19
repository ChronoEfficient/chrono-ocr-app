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

/**
 * Converts strings or partial issue objects into
 * the enterprise Issue model.
 */
function normalizeIssues(issues, source = "SYSTEM") {
  if (!Array.isArray(issues)) {
    return [];
  }

  return issues
    .map((issue) => {
      if (typeof issue === "string") {
        return {
          source,
          code: "GENERAL",
          severity: "WARNING",
          field: null,
          message: issue.trim()
        };
      }

      if (!issue || typeof issue !== "object") {
        return null;
      }

      return {
        source,
        code: issue.code ?? "GENERAL",
        severity: issue.severity ?? "WARNING",
        field: issue.field ?? null,
        message:
          issue.message ??
          issue.code ??
          "Unknown issue",
        expected: issue.expected,
        actual: issue.actual
      };
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

  // Backward compatibility
  extractedResult,
  qualityAssessment,
  reviewPolicy,
  qualityPolicy
} = {}) {

  const reviewIssues = [];

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
   * Validation
   */

  if (
    resolvedReviewPolicy.reviewOnValidationFailure !== false &&
    validation?.valid === false
  ) {
    reviewIssues.push(
      ...normalizeIssues(
        validation.issues,
        "VALIDATION"
      )
    );
  }

  /*
   * Document type mismatch
   */

  if (
    resolvedReviewPolicy.reviewOnTypeMismatch !== false &&
    resolvedTypeMatch !== true
  ) {
    reviewIssues.push({
      source: "EXTRACTION",
      code: "DOCUMENT_TYPE_MISMATCH",
      severity: "ERROR",
      field: null,
      message:
        "Uploaded document does not match the requested document type."
    });
  }

  /*
   * Extraction failure
   */

  if (
    resolvedReviewPolicy.reviewOnExtractionFailure !== false &&
    resolvedExtractionStatus !== "SUCCESS"
  ) {
    reviewIssues.push({
      source: "EXTRACTION",
      code: "EXTRACTION_FAILED",
      severity: "ERROR",
      field: null,
      message:
        `Extraction status is ${resolvedExtractionStatus}.`
    });
  }

  /*
   * Confidence
   */

  if (
    resolvedReviewPolicy.reviewOnLowConfidence !== false &&
    resolvedConfidence < resolvedConfidenceThreshold
  ) {
    reviewIssues.push({
      source: "EXTRACTION",
      code: "LOW_CONFIDENCE",
      severity: "WARNING",
      field: null,
      message:
        `Confidence ${resolvedConfidence} is below the threshold ${resolvedConfidenceThreshold}.`
    });
  }

  /*
   * Missing required fields
   */

  for (const fieldName of resolvedRequiredFields) {

    if (
      isMissingRequiredValue(
        resolvedExtractedData[fieldName]
      )
    ) {
      reviewIssues.push({
        source: "EXTRACTION",
        code: "MISSING_REQUIRED_FIELD",
        severity: "ERROR",
        field: fieldName,
        message:
          `Required field '${fieldName}' was not extracted.`
      });
    }

  }

  /*
   * Quality
   */

  if (
    resolvedQualityPolicy.reviewOnWarning !== false &&
    resolvedQuality.reviewRequired === true
  ) {

    reviewIssues.push(
      ...normalizeIssues(
        resolvedQuality.issues,
        "QUALITY"
      ),
      ...normalizeIssues(
        resolvedQuality.warnings,
        "QUALITY"
      )
    );

  }

  /*
   * Always Review
   */

  if (resolvedReviewPolicy.alwaysReview === true) {

    reviewIssues.push({
      source: "POLICY",
      code: "ALWAYS_REVIEW",
      severity: "INFO",
      field: null,
      message:
        "Human review is required by the document review policy."
    });

  }

  /*
   * Remove duplicates.
   */

  const uniqueIssues = Array.from(
    new Map(
      reviewIssues.map(issue => [
        `${issue.code}:${issue.field ?? ""}:${issue.message}`,
        issue
      ])
    ).values()
  );

  return {

    required: uniqueIssues.length > 0,

    /*
     * New enterprise contract.
     */
    issues: uniqueIssues,

    /*
     * Backwards compatibility.
     */
    reasons: uniqueIssues.map(issue => issue.message),

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

      requiredFields:
        resolvedRequiredFields

    }

  };

}
