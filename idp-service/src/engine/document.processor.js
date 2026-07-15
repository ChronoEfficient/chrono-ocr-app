import fs from "fs/promises";
import { getGeminiClient } from "./gemini.client.js";
import { getDocumentConfiguration } from "./document.registry.js";
import { validateUploadedFile } from "./file.validator.js";

function validateInput({
  domain,
  documentType,
  filePath,
  mimeType
}) {
  if (!domain) {
    throw new Error("domain is required");
  }

  if (!documentType) {
    throw new Error("documentType is required");
  }

  if (!filePath) {
    throw new Error("filePath is required");
  }

  if (!mimeType) {
    throw new Error("mimeType is required");
  }
}

function parseGeminiResponse(responseText) {
  if (!responseText) {
    const error = new Error("Gemini returned an empty response.");

    error.code = "EMPTY_MODEL_RESPONSE";
    error.statusCode = 502;

    throw error;
  }

  try {
    return JSON.parse(responseText);
  } catch (parseFailure) {
    const error = new Error(
      `Gemini returned invalid JSON: ${parseFailure.message}`
    );

    error.code = "INVALID_MODEL_RESPONSE";
    error.statusCode = 502;

    throw error;
  }
}

function isMissingRequiredValue(value) {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  );
}

function buildReviewReasons({
  validation,
  extractedResult,
  confidence,
  confidenceThreshold,
  reviewPolicy
}) {
  const reasons = [];

  if (
    reviewPolicy.reviewOnValidationFailure !== false &&
    Array.isArray(validation?.issues)
  ) {
    reasons.push(...validation.issues);
  }

  if (
    reviewPolicy.reviewOnTypeMismatch !== false &&
    extractedResult.is_document_type_match !== true
  ) {
    reasons.push(
      "Uploaded document does not match the requested document type."
    );
  }

  if (
    reviewPolicy.reviewOnExtractionFailure !== false &&
    extractedResult.extraction_status !== "SUCCESS"
  ) {
    reasons.push(
      `Extraction status is ${
        extractedResult.extraction_status || "UNKNOWN"
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

  const requiredFields = Array.isArray(reviewPolicy.requiredFields)
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

  if (reviewPolicy.alwaysReview === true) {
    reasons.push(
      "Human review is required by the document review policy."
    );
  }

  return [...new Set(reasons)];
}

export async function processDocument({
  domain,
  documentType,
  filePath,
  mimeType,
  originalName,
  fileSize
}) {
  validateInput({
    domain,
    documentType,
    filePath,
    mimeType
  });

  const normalizedDomain = String(domain)
    .trim()
    .toLowerCase();

  const normalizedDocumentType = String(documentType)
    .trim()
    .toUpperCase();

  const configuration = getDocumentConfiguration(
    normalizedDomain,
    normalizedDocumentType
  );

  const fileValidation = await validateUploadedFile({
    filePath,
    mimeType,
    originalName,
    fileSize,
    filePolicy: configuration.filePolicy
  });

  if (!fileValidation.valid) {
    const error = new Error(
      "Uploaded document failed file validation."
    );

    error.code = "FILE_VALIDATION_FAILED";
    error.statusCode = 400;
    error.details = fileValidation.issues;

    throw error;
  }

  const fileBuffer = await fs.readFile(filePath);
  const base64Document = fileBuffer.toString("base64");

  const client = getGeminiClient();

  const model =
    configuration.ai?.model ||
    process.env.GEMINI_OCR_MODEL ||
    "gemini-2.5-flash";

  const temperature =
    configuration.ai?.temperature ?? 0;

  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: configuration.buildPrompt()
          },
          {
            inlineData: {
              mimeType,
              data: base64Document
            }
          }
        ]
      }
    ],
    config: {
      temperature,
      responseMimeType: "application/json",
      responseSchema: configuration.schema
    }
  });

  const rawExtractedResult = parseGeminiResponse(
    response.text
  );

  const extractedResult = configuration.normalize
    ? configuration.normalize(rawExtractedResult)
    : rawExtractedResult;

  const validation = configuration.validate
    ? configuration.validate(extractedResult)
    : {
        valid: true,
        issues: [],
        derivedData: {}
      };

  const confidence = Number(
    extractedResult.confidence || 0
  );

  const reviewPolicy =
    configuration.reviewPolicy || {};

  const configuredThreshold = Number(
    reviewPolicy.confidenceThreshold
  );

  const confidenceThreshold =
    Number.isFinite(configuredThreshold) &&
    configuredThreshold > 0
      ? configuredThreshold
      : 0.9;

  const reviewReasons = buildReviewReasons({
    validation,
    extractedResult,
    confidence,
    confidenceThreshold,
    reviewPolicy
  });

  return {
    document: {
      domain: normalizedDomain,
      type: normalizedDocumentType,
      name:
        configuration.name || normalizedDocumentType,
      detectedType:
        extractedResult.document_type_detected || null,
      typeMatch:
        extractedResult.is_document_type_match === true,
      version: configuration.version || "1.0",
      file: fileValidation.metadata
    },

    extraction: {
      status:
        extractedResult.extraction_status || "FAILED",
      confidence,
      data: extractedResult.fields || {},
      warnings: Array.isArray(
        extractedResult.warnings
      )
        ? extractedResult.warnings
        : []
    },

    validation: {
      valid: validation.valid === true,
      issues: Array.isArray(validation.issues)
        ? validation.issues
        : [],
      derivedData:
        validation.derivedData &&
        typeof validation.derivedData === "object"
          ? validation.derivedData
          : {}
    },

    review: {
      required: reviewReasons.length > 0,
      reasons: reviewReasons,
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
        requiredFields: Array.isArray(
          reviewPolicy.requiredFields
        )
          ? reviewPolicy.requiredFields
          : []
      }
    },

    processing: {
      model,
      temperature,
      definitionVersion:
        configuration.version || "1.0"
    }
  };
}
