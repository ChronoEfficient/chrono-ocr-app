import { buildPassportDocumentPrompt } from "./prompt.js";
import { passportDocumentSchema } from "./schema.js";
import { normalizePassportDocument } from "./normalizer.js";
import { validatePassportDocument } from "./validator.js";

export const passportDocumentDefinition = {
  id: "passport-document",
  documentType: "PASSPORT",
  name: "Passport",
  version: "1.0",

  ai: {
    provider: "gemini",
    model: null,
    temperature: 0,
    maxOutputTokens: null
  },

  buildPrompt: buildPassportDocumentPrompt,
  schema: passportDocumentSchema,
  normalize: normalizePassportDocument,
  validate: validatePassportDocument,

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
      "nationality",
      "passport_number",
      "date_of_birth",
      "gender",
      "date_of_expiry"
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
