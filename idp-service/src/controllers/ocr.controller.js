import fs from "fs/promises";
import { processDocument } from "../engine/document.processor.js";

export async function extractDocument(req, res) {
  const filePath = req.file?.path;

  try {
    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "No document uploaded. Use form-data field name 'document'."
      });
    }

    const domain = req.body.domain || "hr";
    const documentType = req.body.documentType;

    if (!documentType) {
      return res.status(400).json({
        status: "error",
        message: "documentType is required."
      });
    }

    const result = await processDocument({
      domain,
      documentType,
      filePath,
      mimeType: req.file.mimetype
    });

    return res.status(200).json({
      status: "success",
      ...result
    });
  } catch (error) {
    console.error("Document extraction failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Document extraction failed",
      detail: error.message
    });
  } finally {
    if (filePath) {
      await fs.unlink(filePath).catch(() => {});
    }
  }
}
