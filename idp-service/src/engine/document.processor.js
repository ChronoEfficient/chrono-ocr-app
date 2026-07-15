import fs from "fs/promises";
import { getGeminiClient } from "./gemini.client.js";
import { getDocumentConfiguration } from "./document.registry.js";
import { validateUploadedFile } from "./file.validator.js";
import { assessDocumentQuality } from "./document-quality.assessor.js";
import { evaluateReview } from "./review.engine.js";

function validateInput({
  processingId,
  domain,
  documentType,
  filePath,
  mimeType
}) {
  if (!processingId) {
    throw new Error("processingId is required");
  }

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

export async function processDocument({
  processingId,
  domain,
  documentType,
  filePath,
  mimeType,
  originalName,
  fileSize
}) {
  validateInput({
    processingId,
    domain,
    documentType,
    filePath,
    mimeType
  });

  const startedAt = new Date();

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

  const qualityAssessment = await assessDocumentQuality({
    filePath,
    mimeType,
    qualityPolicy: configuration.qualityPolicy
  });

  if (
    qualityAssessment.acceptable === false &&
    configuration.qualityPolicy?.rejectUnacceptableImage !== false
  ) {
    const error = new Error(
      "Uploaded document failed image-quality assessment."
    );

    error.code = "DOCUMENT_QUALITY_FAILED";
    error.statusCode = 400;
    error.details = qualityAssessment.issues;

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

  const review = evaluateReview({
    validation,
    extractedResult,
    qualityAssessment,
    reviewPolicy: configuration.reviewPolicy || {},
    qualityPolicy: configuration.qualityPolicy || {}
  });

  const completedAt = new Date();

  const durationMs =
    completedAt.getTime() - startedAt.getTime();

  return {
    document: {
      domain: normalizedDomain,
      type: normalizedDocumentType,
      name: configuration.name || normalizedDocumentType,
      detectedType:
        extractedResult.document_type_detected || null,
      typeMatch:
        extractedResult.is_document_type_match === true,
      version: configuration.version || "1.0",
      file: fileValidation.metadata
    },

    quality: qualityAssessment,

    extraction: {
      status:
        extractedResult.extraction_status || "FAILED",
      confidence: Number(
        extractedResult.confidence || 0
      ),
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

    review,

    processing: {
      model,
      temperature,
      definitionVersion:
        configuration.version || "1.0",
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs
    }
  };
}
