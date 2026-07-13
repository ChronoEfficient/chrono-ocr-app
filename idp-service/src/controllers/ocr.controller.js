import { extractWithGemini } from "../services/gemini.service.js";

export async function extractDocument(req, res) {
  try {
    const documentType = req.body.documentType;

    if (!req.file) {
      return res.status(400).json({
        error: "No document uploaded. Use form-data field name 'document'."
      });
    }

    if (!documentType) {
      return res.status(400).json({
        error: "documentType is required."
      });
    }

    const result = await extractWithGemini({
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      documentType
    });

    return res.json({
      status: "success",
      documentType,
      result
    });
  } catch (error) {
    console.error("OCR extraction failed:", error);

    return res.status(500).json({
      status: "error",
      message: "OCR extraction failed",
      detail: error.message
    });
  }
}
