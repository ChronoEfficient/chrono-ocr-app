import { buildBankConfirmationPrompt } from "./prompt.js";
import { bankConfirmationSchema } from "./schema.js";
import { normalizeBankConfirmation } from "./normalizer.js";
import { validateBankConfirmation } from "./validator.js";

export const bankConfirmationDefinition = {
  id: "bank-confirmation",
  documentType: "BANK_CONFIRMATION",
  name: "Bank Confirmation",
  version: "1.0",

  ai: {
    provider: "gemini",
    model: null,          // Uses service default if null
    temperature: 0,
    maxOutputTokens: null // Uses service default if null
  },

  buildPrompt: buildBankConfirmationPrompt,
  schema: bankConfirmationSchema,
  normalize: normalizeBankConfirmation,
  validate: validateBankConfirmation,

  reviewPolicy: {
    confidenceThreshold: 0.9,

    // Keep all uploaded bank confirmations under human review during the pilot.
    alwaysReview: true,

    reviewOnTypeMismatch: true,
    reviewOnExtractionFailure: true,
    reviewOnValidationFailure: true,
    reviewOnLowConfidence: true,

    requiredFields: [
      "bank_name",
      "branch_code",
      "account_holder",
      "account_number",
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
