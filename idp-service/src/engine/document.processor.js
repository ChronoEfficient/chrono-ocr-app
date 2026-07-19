import path from "node:path";

import { getDocumentConfiguration } from "./document.registry.js";
import { validateFile } from "./file.validator.js";
import { assessDocumentQuality } from "./document-quality.assessor.js";
import { extractDocumentWithGemini } from "./gemini.client.js";
import { evaluateReview } from "./review.engine.js";

/**
 * Process a document through the IDP pipeline.
 *
 * @param {object} params
 * @param {string} params.processingId
 * @param {string} params.domain
 * @param {string} params.documentType
 * @param {string} params.filePath
 * @param {string} params.originalName
 * @param {string} params.mimeType
 * @param {number} params.fileSize
 *
 * @returns {Promise<object>}
 */
export async function processDocument({
  processingId,
  domain,
  documentType,
  filePath,
  originalName,
  mimeType,
  fileSize
}) {
  const startedAtDate = new Date();
  const startedAt = startedAtDate.toISOString();

  validateProcessingRequest({
    processingId,
    domain,
    documentType,
    filePath,
    originalName,
    mimeType,
    fileSize
  });

  const definition = getDocumentConfiguration(
    domain,
    documentType
  );

  if (!definition) {
    throw createProcessingError({
      code: "DOCUMENT_DEFINITION_NOT_FOUND",
      message:
        `No document definition was found for domain '${domain}' ` +
        `and document type '${documentType}'.`,
      retryable: false,
      details: {
        domain,
        documentType
      }
    });
  }

  const extension = path
    .extname(originalName)
    .toLowerCase();

  /*
   * 1. File validation
   */
  const fileValidation = await validateFile({
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

  /*
   * 2. Document quality assessment
   */
  const quality = await assessDocumentQuality({
    filePath,
    mimeType,
    policy: definition.qualityPolicy
  });

  if (
    definition.qualityPolicy
      ?.rejectUnacceptableImage === true &&
    quality.acceptable === false
  ) {
    throw createProcessingError({
      code: "DOCUMENT_QUALITY_FAILED",
      message:
        "The uploaded document does not meet the minimum " +
        "quality requirements.",
      retryable: false,
      details: quality.issues
    });
  }

  /*
   * 3. Build the document-specific extraction prompt
   */
  const prompt =
    typeof definition.buildPrompt === "function"
      ? definition.buildPrompt({
          processingId,
          domain,
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
        `No extraction prompt is configured for document type ` +
        `'${documentType}'.`,
      retryable: false,
      details: {
        domain,
        documentType
      }
    });
  }

  /*
   * 4. Gemini extraction
   *
   * Expected result:
   *
   * {
   *   extraction: {
   *     document_type_detected,
   *     is_document_type_match,
   *     extraction_status,
   *     fields,
   *     warnings,
   *     validation_issues,
   *     confidence
   *   },
   *   metadata: {
   *     model,
   *     trafficType,
   *     tokenUsage,
   *     finishReason
   *   }
   * }
   */
  let geminiResult;

  try {
    geminiResult =
      await extractDocumentWithGemini({
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

  /*
   * 5. Separate extracted document fields from Gemini metadata.
   */
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
            typeof rawExtraction.extracted_fields ===
              "object" &&
            !Array.isArray(
              rawExtraction.extracted_fields
            )
          ? rawExtraction.extracted_fields
          : rawExtraction.extractedFields &&
              typeof rawExtraction.extractedFields ===
                "object" &&
              !Array.isArray(
                rawExtraction.extractedFields
              )
            ? rawExtraction.extractedFields
            : {};

  /*
   * 6. Normalisation
   */
  const normalisedData =
    typeof definition.normalize === "function"
      ? definition.normalize(extractedFields)
      : extractedFields;

  /*
   * 7. Business validation
   */
  const validation =
    typeof definition.validate === "function"
      ? await definition.validate(normalisedData)
      : {
          valid: true,
          issues: [],
          derivedData: {}
        };

  /*
   * 8. Resolve model extraction metadata
   */
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
          expectedTypes:
            definition.detectedTypes,
          configuredDocumentType:
            documentType
        });

  const extractionWarnings = normaliseArray(
    rawExtraction.warnings ??
      rawExtraction.extraction_warnings ??
      rawExtraction.extractionWarnings
  );

  const extractionValidationIssues =
    normaliseArray(
      rawExtraction.validation_issues ??
        rawExtraction.validationIssues
    );

  /*
   * Include model-reported validation issues in the
   * application validation result without duplicating them.
   */
  const combinedValidationIssues =
    uniqueMessages([
      ...normaliseArray(validation?.issues),
      ...extractionValidationIssues
    ]);

  const resolvedValidation = {
    valid:
      validation?.valid !== false &&
      extractionValidationIssues.length === 0,

    issues: combinedValidationIssues,

    derivedData:
      validation?.derivedData ?? {}
  };

  /*
   * 9. Manual-review evaluation
   */

  const confidenceThreshold =
    definition.reviewPolicy?.confidenceThreshold ??
    0.9;
  
  const requiredFields =
    definition.reviewPolicy?.requiredFields ??
    [];

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

  /*
   * 10. Complete processing metadata
   */
  const completedAtDate = new Date();
  const completedAt =
    completedAtDate.toISOString();

  const durationMs =
    completedAtDate.getTime() -
    startedAtDate.getTime();

  const validatedFileMetadata =
    fileValidation.metadata ?? {};

  return {
    status: "success",

    processingId,

    document: {
      domain,
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
          validatedFileMetadata
            .maximumSizeBytes ??
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
         geminiMetadata.tokenUsage
           ?.promptTokens ??
         null,
   
       candidateTokens:
         geminiMetadata.tokenUsage
           ?.candidateTokens ??
         null,
   
       totalTokens:
         geminiMetadata.tokenUsage
           ?.totalTokens ??
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

/**
 * Validate the processing request received from the controller.
 */
function validateProcessingRequest({
  processingId,
  domain,
  documentType,
  filePath,
  originalName,
  mimeType,
  fileSize
}) {
  const missingFields = [];

  if (!processingId) {
    missingFields.push("processingId");
  }

  if (!domain) {
    missingFields.push("domain");
  }

  if (!documentType) {
    missingFields.push("documentType");
  }

  if (!filePath) {
    missingFields.push("filePath");
  }

  if (!originalName) {
    missingFields.push("originalName");
  }

  if (!mimeType) {
    missingFields.push("mimeType");
  }

  if (
    fileSize === undefined ||
    fileSize === null ||
    Number.isNaN(Number(fileSize))
  ) {
    missingFields.push("fileSize");
  }

  if (missingFields.length > 0) {
    throw createProcessingError({
      code: "INVALID_PROCESSING_REQUEST",
      message:
        "The document-processing request is missing " +
        "required fields.",
      retryable: false,
      details: missingFields.map((field) => ({
        field,
        message: `${field} is required.`
      }))
    });
  }

  const processingIdPattern =
    /^DOC-\d{8}-\d{6}$/;

  if (
    !processingIdPattern.test(processingId)
  ) {
    throw createProcessingError({
      code: "INVALID_PROCESSING_ID",
      message:
        "processingId must use the format " +
        "DOC-YYYYMMDD-000001.",
      retryable: false,
      details: [
        {
          field: "processingId",
          value: processingId
        }
      ]
    });
  }

  if (Number(fileSize) <= 0) {
    throw createProcessingError({
      code: "INVALID_FILE_SIZE",
      message:
        "The uploaded file size must be greater than zero.",
      retryable: false,
      details: [
        {
          field: "fileSize",
          value: fileSize
        }
      ]
    });
  }
}

/**
 * Convert Gemini and Vertex AI errors into stable IDP error codes.
 */
function mapGeminiError(error) {
  const status =
    error?.status ??
    error?.statusCode ??
    error?.code ??
    error?.response?.status;

  const message =
    error?.message ??
    error?.response?.data?.error
      ?.message ??
    "Gemini document extraction failed.";

  if (
    status === 429 ||
    String(status) === "429" ||
    message.includes("RESOURCE_EXHAUSTED")
  ) {
    return createProcessingError({
      code: "GEMINI_CAPACITY_UNAVAILABLE",
      message:
        "Gemini processing capacity is temporarily unavailable.",
      retryable: true,
      details: [
        {
          providerStatus:
            status ?? 429,
          providerMessage: message
        }
      ],
      cause: error
    });
  }

  if (
    status === 401 ||
    status === 403 ||
    String(status) === "401" ||
    String(status) === "403"
  ) {
    return createProcessingError({
      code: "GEMINI_AUTHENTICATION_FAILED",
      message:
        "The IDP service could not authenticate with Vertex AI.",
      retryable: false,
      details: [
        {
          providerStatus: status,
          providerMessage: message
        }
      ],
      cause: error
    });
  }

  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    ["500", "502", "503", "504"].includes(
      String(status)
    )
  ) {
    return createProcessingError({
      code: "GEMINI_SERVICE_UNAVAILABLE",
      message:
        "Gemini is temporarily unavailable. " +
        "The request may be retried.",
      retryable: true,
      details: [
        {
          providerStatus: status,
          providerMessage: message
        }
      ],
      cause: error
    });
  }

  if (error instanceof SyntaxError) {
    return createProcessingError({
      code: "GEMINI_RESPONSE_PARSE_FAILED",
      message:
        "Gemini returned a response that could not be parsed.",
      retryable: true,
      details: [
        {
          providerMessage: message
        }
      ],
      cause: error
    });
  }

  return createProcessingError({
    code: "GEMINI_EXTRACTION_FAILED",
    message:
      "Gemini document extraction failed.",
    retryable: false,
    details: [
      {
        providerStatus:
          status ?? null,
        providerMessage: message
      }
    ],
    cause: error
  });
}

/**
 * Create a consistent processing error.
 */
function createProcessingError({
  code,
  message,
  retryable = false,
  details = [],
  cause
}) {
  const error = new Error(
    message,
    cause ? { cause } : undefined
  );

  error.name =
    "DocumentProcessingError";
  error.code = code;
  error.retryable = retryable;
  error.details =
    Array.isArray(details)
      ? details
      : [details];

  return error;
}

/**
 * Normalise an extraction status.
 */
function normaliseExtractionStatus(value) {
  const normalisedValue =
    String(value ?? "")
      .trim()
      .toUpperCase();

  return normalisedValue || "UNKNOWN";
}

/**
 * Normalise confidence to a number between 0 and 1.
 */
function normaliseConfidence(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  if (
    numericValue > 1 &&
    numericValue <= 100
  ) {
    return Number(
      (numericValue / 100).toFixed(4)
    );
  }

  return Number(
    Math.min(
      Math.max(numericValue, 0),
      1
    ).toFixed(4)
  );
}

/**
 * Determine whether the detected document type matches the configured type.
 */
function evaluateTypeMatch({
  detectedType,
  expectedTypes,
  configuredDocumentType
}) {
  if (!detectedType) {
    return false;
  }

  const normalisedDetectedType =
    String(detectedType)
      .trim()
      .toUpperCase();

  const acceptedTypes =
    Array.isArray(expectedTypes) &&
    expectedTypes.length > 0
      ? expectedTypes
      : [configuredDocumentType];

  return acceptedTypes
    .filter(Boolean)
    .map((value) =>
      String(value)
        .trim()
        .toUpperCase()
    )
    .includes(normalisedDetectedType);
}

/**
 * Convert unknown values into an array.
 */
function normaliseArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return [];
  }

  return [value];
}

/**
 * Convert validation issues into unique readable messages.
 */
function uniqueMessages(values) {
  return [
    ...new Set(
      values
        .map((value) => {
          if (typeof value === "string") {
            return value.trim();
          }

          if (
            value &&
            typeof value === "object" &&
            typeof value.message ===
              "string"
          ) {
            return value.message.trim();
          }

          return String(
            value ?? ""
          ).trim();
        })
        .filter(Boolean)
    )
  ];
}

/**
 * Provide a readable description for Vertex AI traffic metadata.
 */
function describeTrafficType(trafficType) {
  const descriptions = {
    ON_DEMAND_PRIORITY:
      "Priority PayGo",

    ON_DEMAND:
      "Standard PayGo",

    PROVISIONED_THROUGHPUT:
      "Provisioned Throughput",

    UNKNOWN:
      "Traffic type not reported"
  };

  return (
    descriptions[trafficType] ??
    "Unrecognised traffic type"
  );
}
