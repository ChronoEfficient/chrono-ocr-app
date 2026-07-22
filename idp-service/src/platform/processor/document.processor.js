import path from "node:path";

/* -------------------------------------------------------------------------- */
/* Registry                                                                   */
/* -------------------------------------------------------------------------- */

import { getDocumentConfiguration } from "../registry/document.registry.js";

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

import { validateUploadedFile } from "../validation/file.validator.js";
import { validateProcessingRequest } from "../validation/processing-request.validator.js";

/* -------------------------------------------------------------------------- */
/* Artificial Intelligence                                                    */
/* -------------------------------------------------------------------------- */

import { extractDocumentWithGemini } from "../ai/providers/gemini.client.js";

/* -------------------------------------------------------------------------- */
/* Quality                                                                    */
/* -------------------------------------------------------------------------- */

import { assessDocumentQuality } from "../quality/document-quality.assessor.js";

/* -------------------------------------------------------------------------- */
/* Review                                                                     */
/* -------------------------------------------------------------------------- */

import { evaluateReview } from "../review/review.engine.js";

/* -------------------------------------------------------------------------- */
/* Processing                                                                 */
/* -------------------------------------------------------------------------- */

import { evaluateTypeMatch } from "./type.matcher.js";

import {
  describeTrafficType,
  normaliseArray,
  normaliseConfidence,
  normaliseExtractionStatus,
  uniqueMessages
} from "./processor.utils.js";

import {
  createProcessingError,
  mapGeminiError
} from "./processor.errors.js";

/* -------------------------------------------------------------------------- */
/* Document Processing                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Process a document through the complete IDP pipeline.
 *
 * @param {Object} params
 * @param {string} params.processingId
 * @param {string} params.documentType
 * @param {string} params.filePath
 * @param {string} params.originalName
 * @param {string} params.mimeType
 * @param {number} params.fileSize
 *
 * @returns {Promise<Object>}
 */
export async function processDocument({
  processingId,
  documentType,
  filePath,
  originalName,
  mimeType,
  fileSize
}) {
  const startedAtDate = new Date();
  const startedAt = startedAtDate.toISOString();

  /* ------------------------------------------------------------------------ */
  /* Validate request                                                         */
  /* ------------------------------------------------------------------------ */

  validateProcessingRequest({
    processingId,
    documentType,
    filePath,
    originalName,
    mimeType,
    fileSize
  });

  /* ------------------------------------------------------------------------ */
  /* Resolve document definition                                              */
  /* ------------------------------------------------------------------------ */

  const definition = getDocumentConfiguration(
    documentType
  );

  if (!definition) {
    throw createProcessingError({
      code: "DOCUMENT_DEFINITION_NOT_FOUND",
      message:
        `No document definition was found for document type '${documentType}'.`,
      retryable: false,
      details: {
        documentType
      }
    });
  }

  const extension = path
    .extname(originalName)
    .toLowerCase();

  /* ------------------------------------------------------------------------ */
  /* 1. File validation                                                       */
  /* ------------------------------------------------------------------------ */

  const fileValidation = await validateUploadedFile({
    filePath,
    mimeType,
    originalName,
    extension,
    fileSize,
    policy: definition.filePolicy
  });

  if (!fileValidation.valid) {
    throw createProcessingError({
      code: "FILE_VALIDATION_FAILED",
      message:
        "The uploaded document failed file validation.",
      retryable: false,
      details: fileValidation.issues
    });
  }

  /* ------------------------------------------------------------------------ */
  /* 2. Document quality assessment                                           */
  /* ------------------------------------------------------------------------ */

  const quality = await assessDocumentQuality({
    filePath,
    mimeType,
    policy: definition.qualityPolicy
  });

  if (
    definition.qualityPolicy?.rejectUnacceptableImage === true &&
    quality.acceptable === false
  ) {
    throw createProcessingError({
      code: "DOCUMENT_QUALITY_FAILED",
      message:
        "The uploaded document does not meet the minimum quality requirements.",
      retryable: false,
      details: quality.issues
    });
  }

  /* ------------------------------------------------------------------------ */
  /* 3. Build extraction prompt                                               */
  /* ------------------------------------------------------------------------ */

  const prompt =
    typeof definition.buildPrompt === "function"
      ? definition.buildPrompt({
          processingId,
          documentType,
          originalName,
          mimeType,
          quality
        })
      : definition.prompt;

  if (!prompt) {
    throw createProcessingError({
      code: "DOCUMENT_PROMPT_NOT_CONFIGURED",
      message:
        `No extraction prompt is configured for document type '${documentType}'.`,
      retryable: false,
      details: {
        documentType
      }
    });
  }

  /* ------------------------------------------------------------------------ */
  /* 4. AI Extraction                                                         */
  /* ------------------------------------------------------------------------ */

  let geminiResult;

  try {
    geminiResult = await extractDocumentWithGemini({
      ai: definition.ai,
      prompt,
      schema: definition.schema,
      mimeType,
      filePath
    });
  } catch (error) {
    throw mapGeminiError(error);
  }

  const rawExtraction =
    geminiResult?.extraction &&
    typeof geminiResult.extraction === "object"
      ? geminiResult.extraction
      : {};

  const geminiMetadata =
    geminiResult?.metadata &&
    typeof geminiResult.metadata === "object"
      ? geminiResult.metadata
      : {};

  /* ------------------------------------------------------------------------ */
  /* 5. Resolve extracted fields                                              */
  /* ------------------------------------------------------------------------ */

  const extractedFields =
    rawExtraction.fields &&
    typeof rawExtraction.fields === "object" &&
    !Array.isArray(rawExtraction.fields)
      ? rawExtraction.fields
      : rawExtraction.data &&
          typeof rawExtraction.data === "object" &&
          !Array.isArray(rawExtraction.data)
        ? rawExtraction.data
        : rawExtraction.extracted_fields &&
            typeof rawExtraction.extracted_fields === "object" &&
            !Array.isArray(rawExtraction.extracted_fields)
          ? rawExtraction.extracted_fields
          : rawExtraction.extractedFields &&
              typeof rawExtraction.extractedFields === "object" &&
              !Array.isArray(rawExtraction.extractedFields)
            ? rawExtraction.extractedFields
            : {};

  /* ------------------------------------------------------------------------ */
  /* 6. Normalisation                                                         */
  /* ------------------------------------------------------------------------ */

  const normalisedData =
    typeof definition.normalize === "function"
      ? definition.normalize(extractedFields)
      : extractedFields;

  /* ------------------------------------------------------------------------ */
  /* 7. Business validation                                                   */
  /* ------------------------------------------------------------------------ */

  const validation =
    typeof definition.validate === "function"
      ? await definition.validate(normalisedData)
      : {
          valid: true,
          issues: [],
          derivedData: {}
        };

  /* ------------------------------------------------------------------------ */
  /* 8. Resolve extraction metadata                                           */
  /* ------------------------------------------------------------------------ */

  const extractionStatus = normaliseExtractionStatus(
    rawExtraction.extraction_status ??
      rawExtraction.extractionStatus ??
      rawExtraction.status ??
      "SUCCESS"
  );

  const confidence = normaliseConfidence(
    rawExtraction.confidence ??
      rawExtraction.extraction_confidence ??
      rawExtraction.extractionConfidence
  );

  const detectedType =
    rawExtraction.document_type_detected ??
    rawExtraction.detected_document_type ??
    rawExtraction.detectedDocumentType ??
    rawExtraction.document_type ??
    rawExtraction.documentType ??
    null;

  const explicitTypeMatch =
    rawExtraction.is_document_type_match ??
    rawExtraction.type_match ??
    rawExtraction.typeMatch;

  const typeMatch =
    typeof explicitTypeMatch === "boolean"
      ? explicitTypeMatch
      : evaluateTypeMatch({
          detectedType,
          expectedTypes: definition.detectedTypes,
          configuredDocumentType: documentType
        });

  const extractionWarnings = normaliseArray(
    rawExtraction.warnings ??
      rawExtraction.extraction_warnings ??
      rawExtraction.extractionWarnings
  );

  const extractionValidationIssues = normaliseArray(
    rawExtraction.validation_issues ??
      rawExtraction.validationIssues
  );

  const combinedValidationIssues = uniqueMessages([
    ...normaliseArray(validation?.issues),
    ...extractionValidationIssues
  ]);

  const resolvedValidation = {
    valid:
      validation?.valid !== false &&
      extractionValidationIssues.length === 0,

    issues: combinedValidationIssues,

    derivedData: validation?.derivedData ?? {}
  };

  /* ------------------------------------------------------------------------ */
  /* 9. Review evaluation                                                     */
  /* ------------------------------------------------------------------------ */

  const confidenceThreshold =
    definition.reviewPolicy?.confidenceThreshold ?? 0.9;

  const requiredFields =
    definition.reviewPolicy?.requiredFields ?? [];

  const review = evaluateReview({
    extractionStatus,
    confidence,
    confidenceThreshold,
    extractedData: normalisedData,
    validation: resolvedValidation,
    quality,
    typeMatch,
    requiredFields,
    policy: definition.reviewPolicy
  });

  /* ------------------------------------------------------------------------ */
  /* 10. Build processing metadata                                            */
  /* ------------------------------------------------------------------------ */

  const completedAtDate = new Date();
  const completedAt = completedAtDate.toISOString();

  const durationMs =
    completedAtDate.getTime() -
    startedAtDate.getTime();

  const validatedFileMetadata =
    fileValidation.metadata ?? {};

  return {
    status: "success",

    processingId,

    document: {
      type: documentType,
      name: definition.name,
      detectedType,
      typeMatch,
      version: definition.version ?? "1.0",

      file: {
        originalName:
          validatedFileMetadata.originalName ??
          originalName ??
          null,

        mimeType:
          validatedFileMetadata.mimeType ??
          mimeType ??
          null,

        extension:
          validatedFileMetadata.extension ??
          extension ??
          null,

        sizeBytes:
          validatedFileMetadata.sizeBytes ??
          Number(fileSize),

        maximumSizeBytes:
          validatedFileMetadata.maximumSizeBytes ??
          null,

        maximumSizeMb:
          validatedFileMetadata.maximumSizeMb ??
          null
      }
    },

    quality,

    extraction: {
      status: extractionStatus,
      confidence,
      data: normalisedData,
      warnings: extractionWarnings
    },

    validation: resolvedValidation,

    review,

    processing: {
      provider:
        geminiMetadata.provider ??
        "GOOGLE_VERTEX_AI",

      aiProvider:
        geminiMetadata.aiProvider ??
        "gemini",

      model:
        geminiMetadata.model ??
        null,

      traffic: {
        type:
          geminiMetadata.trafficType ??
          "UNKNOWN",

        description: describeTrafficType(
          geminiMetadata.trafficType
        )
      },

      finishReason:
        geminiMetadata.finishReason ??
        null,

      tokenUsage: {
        promptTokens:
          geminiMetadata.tokenUsage?.promptTokens ??
          null,

        candidateTokens:
          geminiMetadata.tokenUsage?.candidateTokens ??
          null,

        totalTokens:
          geminiMetadata.tokenUsage?.totalTokens ??
          null
      },

      temperature:
        geminiMetadata.temperature ??
        null,

      maxOutputTokens:
        geminiMetadata.maxOutputTokens ??
        null,

      responseMimeType:
        geminiMetadata.responseMimeType ??
        null,

      definitionVersion:
        definition.version ?? "1.0",

      startedAt,
      completedAt,
      durationMs
    }
  };
}
