import { buildRegistrationCertificatePrompt } from "./prompt.js";
import { registrationCertificateSchema } from "./schema.js";
import { normalizeRegistrationCertificate } from "./normalizer.js";
import { validateRegistrationCertificate } from "./validator.js";

export const registrationCertificateDefinition = {
  id: "registration-certificate",
  documentType: "REGISTRATION_CERTIFICATE",
  name: "Registration Certificate",
  version: "1.0",

  ai: {
    provider: "gemini",
    model: null,
    temperature: 0,
    maxOutputTokens: null
  },

  buildPrompt: buildRegistrationCertificatePrompt,
  schema: registrationCertificateSchema,
  normalize: normalizeRegistrationCertificate,
  validate: validateRegistrationCertificate,

  reviewPolicy: {
    confidenceThreshold: 0.9,
    alwaysReview: false,
    reviewOnTypeMismatch: true,
    reviewOnExtractionFailure: true,
    reviewOnValidationFailure: true,
    reviewOnLowConfidence: true,

    requiredFields: [
      "document_type",
      "issuing_authority",
      "registration_number",
      "enterprise_name",
      "registration_date",
      "enterprise_type"
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
