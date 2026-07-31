import {
  buildProcurementDocumentPrompt
} from "./prompt.js";

import {
  procurementDocumentSchema
} from "./schema.js";

import {
  normalizeProcurementDocument
} from "./normalizer.js";

import {
  validateProcurementDocument
} from "./validator.js";

export const procurementDocumentDefinition = {
  id: "procurement-document",
  documentType: "PROCUREMENT_DOCUMENT",
  name: "Procurement Document",
  version: "1.0",

  ai: {
    provider: "gemini",
    model: null,
    temperature: 0,
    maxOutputTokens: null
  },

  buildPrompt: buildProcurementDocumentPrompt,
  schema: procurementDocumentSchema,
  normalize: normalizeProcurementDocument,
  validate: validateProcurementDocument,

  reviewPolicy: {
    confidenceThreshold: 0.9,
    alwaysReview: true,
    reviewOnTypeMismatch: true,
    reviewOnExtractionFailure: true,
    reviewOnValidationFailure: true,
    reviewOnLowConfidence: true,

    requiredFields: [
      "classified_document_type",
      "supplier_name",
      "customer_name",
      "line_items"
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
