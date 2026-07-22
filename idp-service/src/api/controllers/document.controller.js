import fs from "fs/promises";
import { processDocument } from "../../platform/processor/document.processor.js";
import { validateProcessingId } from "../../platform/validation/processing-id.validator.js";

export async function extractDocument(req, res) {
  const filePath = req.file?.path;

  try {
    const suppliedProcessingId = req.body.processingId;
    const documentType = req.body.documentType;

    const processingIdValidation =
      validateProcessingId(suppliedProcessingId);

    if (!processingIdValidation.valid) {
      return res.status(400).json({
        status: "error",
        processingId: suppliedProcessingId || null,
        code: "INVALID_PROCESSING_ID",
        message: "processingId is invalid.",
        details: processingIdValidation.issues
      });
    }

    const processingId =
      processingIdValidation.normalizedProcessingId;

    if (!req.file) {
      return res.status(400).json({
        status: "error",
        processingId,
        code: "FILE_REQUIRED",
        message:
          "No document uploaded. Use form-data field name 'document'.",
        details: []
      });
    }

    if (!documentType) {
      return res.status(400).json({
        status: "error",
        processingId,
        code: "DOCUMENT_TYPE_REQUIRED",
        message: "documentType is required.",
        details: []
      });
    }

    const result = await processDocument({
      processingId,
      documentType,
      filePath,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      fileSize: req.file.size
    });

    return res.status(200).json({
      status: "success",
      processingId,
      ...result
    });
  } catch (error) {
    const processingId =
      req.body.processingId || null;

    console.error("Document processing failed:", {
      processingId,
      code: error.code,
      message: error.message,
      details: error.details
    });

    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      status: "error",
      processingId,
      code: error.code || "DOCUMENT_PROCESSING_FAILED",
      message:
        error.message || "Document processing failed.",
      details: Array.isArray(error.details)
        ? error.details
        : []
    });
  } finally {
    if (filePath) {
      await fs.unlink(filePath).catch(
        (cleanupError) => {
          console.error(
            "Temporary file cleanup failed:",
            {
              processingId:
                req.body.processingId || null,
              filePath,
              message: cleanupError.message
            }
          );
        }
      );
    }
  }
}
