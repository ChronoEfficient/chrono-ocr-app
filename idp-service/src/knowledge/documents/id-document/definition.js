import { buildIdDocumentPrompt } from "./prompt.js";
import { idDocumentSchema } from "./schema.js";
import { normalizeIdDocument } from "./normalizer.js";
import { validateIdDocument } from "./validator.js";

export const idDocumentDefinition = {
  id: "id-document",
  documentType: "ID_DOCUMENT",
  name: "South African Identity Document",
  version: "1.0",

  ai: {
    provider: "gemini",
    model: null,
    temperature: 0,
    maxOutputTokens: null
  },

  buildPrompt: buildIdDocumentPrompt,
  schema: idDocumentSchema,
  normalize: normalizeIdDocument,
  validate: validateIdDocument,

  reviewPolicy: {
    confidenceThreshold: 0.9,
    alwaysReview: true,
    reviewOnTypeMismatch: true,
    reviewOnExtractionFailure: true,
    reviewOnValidationFailure: true,
    reviewOnLowConfidence: true,

    requiredFields: [
      "surname",
      "given_names",
      "gender",
      "nationality",
      "id_number",
      "date_of_birth",
      "citizenship_status"
    ]
  },

  filePolicy: {
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "application/pdf"
    ],
    allowedExtensions: [
      ".jpg",
      ".jpeg",
      ".png",
      ".pdf"
    ],
    maximumFileSizeMb: 10
  },

  qualityPolicy: {
    minimumWidth: 600,
    minimumHeight: 400,
    minimumPixelCount: 300000,
    minimumSharpnessScore: 12,
    rejectBelowWidth: 250,
    rejectBelowHeight: 150,
    rejectUnacceptableImage: true,
    reviewOnWarning: true
  }
};
