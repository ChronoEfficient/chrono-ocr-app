import fs from "fs/promises";
import { processDocument } from "../engine/document.processor.js";

export async function extractDocument(req, res) {
  const filePath = req.file?.path;

  try {
    if (!req.file) {
      return res.status(400).json({
        status: "error",
        code: "FILE_REQUIRED",
        message: "No document uploaded. Use form-data field name 'document'.",
        details: []
      });
    }

    const domain = req.body.domain || "hr";
    const documentType = req.body.documentType;

    if (!documentType) {
      return res.status(400).json({
        status: "error",
        code: "DOCUMENT_TYPE_REQUIRED",
        message: "documentType is required.",
        details: []
      });
    }

    const result = await processDocument({
      domain,
      documentType,
      filePath,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      fileSize: req.file.size
    });

    return res.status(200).json({
      status: "success",
      ...result
    });
  } catch (error) {
    console.error("Document extraction failed:", {
      code: error.code,
      message: error.message,
      details: error.details
    });

    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      status: "error",
      code: error.code || "DOCUMENT_PROCESSING_FAILED",
      message: error.message || "Document processing failed.",
      details: Array.isArray(error.details) ? error.details : []
    });
  } finally {
    if (filePath) {
      await fs.unlink(filePath).catch(() => {});
    }
  }
}
