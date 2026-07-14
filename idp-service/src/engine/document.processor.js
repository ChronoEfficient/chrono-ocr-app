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
    throw new Error("Gemini returned an empty response.");
  }

  try {
    return JSON.parse(responseText);
  } catch (error) {
    const parseError = new Error(
      `Gemini returned invalid JSON: ${error.message}`
    );

    parseError.code = "INVALID_MODEL_RESPONSE";
    parseError.statusCode = 502;

    throw parseError;
  }
}

function buildReviewReasons({
  validation,
  extractedResult,
  confidence,
  confidenceThreshold
}) {
  const reasons = [];

  if (Array.isArray(validation?.issues)) {
    reasons.push(...validation.issues);
  }

  if (!extractedResult.is_document_type_match) {
    reasons.push(
      "Uploaded document does not match the requested document type."
    );
  }

  if (extractedResult.extraction_status !== "SUCCESS") {
    reasons.push(
      `Extraction status is ${
        extractedResult.extraction_status || "UNKNOWN"
      }.`
    );
  }

  if (confidence < confidenceThreshold) {
    reasons.push(
      `Confidence ${confidence} is below the threshold ${confidenceThreshold}.`
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

  const fileValidation = await validateUploadedFile({
    filePath,
    mimeType,
    originalName,
    fileSize
  });

  if (!fileValidation.valid) {
    const validationError = new Error(
      "Uploaded document failed file validation."
    );

    validationError.code = "FILE_VALIDATION_FAILED";
    validationError.statusCode = 400;
    validationError.details = fileValidation.issues;

    throw validationError;
  }

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

  const fileBuffer = await fs.readFile(filePath);
  const base64Document = fileBuffer.toString("base64");

  const client = getGeminiClient();
  const model =
    process.env.GEMINI_OCR_MODEL || "gemini-2.5-flash";

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
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: configuration.schema
    }
  });

  const extractedResult = parseGeminiResponse(response.text);

  const validation = configuration.validate
    ? configuration.validate(extractedResult)
    : {
        valid: true,
        issues: []
      };

  const confidence = Number(
    extractedResult.confidence || 0
  );

  const confidenceThreshold =
    Number(configuration.confidenceThreshold) || 0.9;

  const reviewReasons = buildReviewReasons({
    validation,
    extractedResult,
    confidence,
    confidenceThreshold
  });

  return {
    document: {
      domain: normalizedDomain,
      type: normalizedDocumentType,
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
        : []
    },

    review: {
      required: reviewReasons.length > 0,
      reasons: reviewReasons,
      confidenceThreshold
    }
  };
}
