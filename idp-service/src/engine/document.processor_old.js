import path from "node:path";

// Registry
import { getDocumentConfiguration } from "../platform/registry/document.registry.js";

// Validation
import { validateUploadedFile } from "../platform/validation/file.validator.js";
import { validateProcessingRequest } from "../platform/validation/processing-request.validator.js";

// AI
import { extractDocumentWithGemini } from "../platform/ai/providers/gemini.client.js";

// Quality
import { assessDocumentQuality } from "../platform/quality/document-quality.assessor.js";

// Review
import { evaluateReview } from "../platform/review/review.engine.js";

// Processor
import {
    mapGeminiError,
    createProcessingError
} from "../platform/processor/processor.errors.js";

import { evaluateTypeMatch } from "../platform/processor/type.matcher.js";

import {
    normaliseArray,
    normaliseConfidence,
    normaliseExtractionStatus,
    uniqueMessages,
    describeTrafficType
} from "../platform/processor/processor.utils.js";

/**
 * Processes a document through the Intelligent Document Processing (IDP)
 * pipeline.
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

    // -------------------------------------------------------------------------
    // 1. Validate uploaded file
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // 2. Assess document quality
    // -------------------------------------------------------------------------

    const quality = await assessDocumentQuality({
        filePath,
        mimeType,
        policy: definition.qualityPolicy
    });

    if (
        definition.qualityPolicy?.rejectUnacceptableImage &&
        !quality.acceptable
    ) {
        throw createProcessingError({
            code: "DOCUMENT_QUALITY_FAILED",
            message:
                "The uploaded document does not meet the minimum quality requirements.",
            retryable: false,
            details: quality.issues
        });
    }

    // -------------------------------------------------------------------------
    // 3. Build extraction prompt
    // -------------------------------------------------------------------------

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
                `No extraction prompt is configured for document type '${documentType}'.`,
            retryable: false,
            details: {
                domain,
                documentType
            }
        });
    }

    // -------------------------------------------------------------------------
    // 4. Extract document
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // 5. Resolve extracted fields
    // -------------------------------------------------------------------------

    // Existing extractedFields logic...

    // -------------------------------------------------------------------------
    // 6. Normalise extracted data
    // -------------------------------------------------------------------------

    const normalisedData =
        typeof definition.normalize === "function"
            ? definition.normalize(extractedFields)
            : extractedFields;

    // -------------------------------------------------------------------------
    // 7. Business validation
    // -------------------------------------------------------------------------

    const validation =
        typeof definition.validate === "function"
            ? await definition.validate(normalisedData)
            : {
                  valid: true,
                  issues: [],
                  derivedData: {}
              };

    // -------------------------------------------------------------------------
    // 8. Resolve extraction metadata
    // -------------------------------------------------------------------------

    // Existing extraction metadata logic...

    // -------------------------------------------------------------------------
    // 9. Evaluate review requirements
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // 10. Build processing response
    // -------------------------------------------------------------------------

    const completedAtDate = new Date();
    const completedAt = completedAtDate.toISOString();

    const durationMs =
        completedAtDate.getTime() -
        startedAtDate.getTime();

    const validatedFileMetadata =
        fileValidation.metadata ?? {};

    return {
        // Existing response object...
    };
}
