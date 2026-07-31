import test from "node:test";
import assert from "node:assert/strict";
import { evaluateReview } from "../../src/engine/review.engine.js";

function createSuccessfulExtraction(overrides = {}) {
  return {
    document_type_detected: "NATIONAL_IDENTITY_CARD",
    is_document_type_match: true,
    extraction_status: "SUCCESS",
    confidence: 0.95,
    fields: {
      surname: "CENGIMBO",
      given_names: "THUSO CARLO",
      gender: "MALE",
      nationality: "ZA",
      id_number: "6308125520085",
      date_of_birth: "1963-08-12",
      citizenship_status: "CITIZEN"
    },
    ...overrides
  };
}

test("requires review when alwaysReview is enabled", () => {
  const result = evaluateReview({
    validation: {
      valid: true,
      issues: []
    },
    extractedResult: createSuccessfulExtraction(),
    qualityAssessment: {
      reviewRequired: false,
      issues: [],
      warnings: []
    },
    reviewPolicy: {
      alwaysReview: true,
      confidenceThreshold: 0.9
    },
    qualityPolicy: {}
  });

  assert.equal(result.required, true);
  assert.ok(
    result.reasons.includes(
      "Human review is required by the document review policy."
    )
  );
});

test("requires review when validation fails", () => {
  const result = evaluateReview({
    validation: {
      valid: false,
      issues: [
        "South African ID number failed checksum validation."
      ]
    },
    extractedResult: createSuccessfulExtraction(),
    qualityAssessment: {
      reviewRequired: false,
      issues: [],
      warnings: []
    },
    reviewPolicy: {
      reviewOnValidationFailure: true,
      confidenceThreshold: 0.9
    },
    qualityPolicy: {}
  });

  assert.equal(result.required, true);
  assert.deepEqual(result.reasons, [
    "South African ID number failed checksum validation."
  ]);
});

test("requires review when confidence is below threshold", () => {
  const result = evaluateReview({
    validation: {
      valid: true,
      issues: []
    },
    extractedResult: createSuccessfulExtraction({
      confidence: 0.7
    }),
    qualityAssessment: {
      reviewRequired: false,
      issues: [],
      warnings: []
    },
    reviewPolicy: {
      reviewOnLowConfidence: true,
      confidenceThreshold: 0.9
    },
    qualityPolicy: {}
  });

  assert.equal(result.required, true);
  assert.ok(
    result.reasons.includes(
      "Confidence 0.7 is below the threshold 0.9."
    )
  );
});

test("requires review when a mandatory field is missing", () => {
  const extraction = createSuccessfulExtraction();
  extraction.fields.surname = null;

  const result = evaluateReview({
    validation: {
      valid: true,
      issues: []
    },
    extractedResult: extraction,
    qualityAssessment: {
      reviewRequired: false,
      issues: [],
      warnings: []
    },
    reviewPolicy: {
      requiredFields: [
        "surname",
        "given_names",
        "id_number"
      ]
    },
    qualityPolicy: {}
  });

  assert.equal(result.required, true);
  assert.ok(
    result.reasons.includes(
      "Required field 'surname' was not extracted."
    )
  );
});

test("includes image-quality warnings when configured", () => {
  const result = evaluateReview({
    validation: {
      valid: true,
      issues: []
    },
    extractedResult: createSuccessfulExtraction(),
    qualityAssessment: {
      reviewRequired: true,
      issues: [],
      warnings: [
        "The image may be blurred."
      ]
    },
    reviewPolicy: {},
    qualityPolicy: {
      reviewOnWarning: true
    }
  });

  assert.equal(result.required, true);
  assert.ok(
    result.reasons.includes(
      "The image may be blurred."
    )
  );
});

test("does not require review for a fully valid result when alwaysReview is disabled", () => {
  const result = evaluateReview({
    validation: {
      valid: true,
      issues: []
    },
    extractedResult: createSuccessfulExtraction(),
    qualityAssessment: {
      reviewRequired: false,
      issues: [],
      warnings: []
    },
    reviewPolicy: {
      alwaysReview: false,
      confidenceThreshold: 0.9,
      reviewOnValidationFailure: true,
      reviewOnTypeMismatch: true,
      reviewOnExtractionFailure: true,
      reviewOnLowConfidence: true
    },
    qualityPolicy: {
      reviewOnWarning: true
    }
  });

  assert.equal(result.required, false);
  assert.deepEqual(result.reasons, []);
});
