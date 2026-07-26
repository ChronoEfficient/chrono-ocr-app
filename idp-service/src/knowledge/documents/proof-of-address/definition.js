import {
  buildProofOfAddressPrompt
} from "./prompt.js";

import {
  proofOfAddressSchema
} from "./schema.js";

import {
  normalizeProofOfAddress
} from "./normalizer.js";

import {
  validateProofOfAddress
} from "./validator.js";

const REQUIRED_FIELDS = Object.freeze([
  "contains_address",
  "recipient_name",
  "address_type",
  "address_line_1"
]);

const ACCEPTED_SOURCE_DOCUMENT_TYPES =
  Object.freeze([
    "BANK_STATEMENT",
    "MUNICIPAL_ACCOUNT",
    "UTILITY_BILL",
    "CELLPHONE_STATEMENT",
    "LEASE_AGREEMENT",
    "INSURANCE_DOCUMENT",
    "GOVERNMENT_CORRESPONDENCE",
    "MEDICAL_AID_STATEMENT",
    "SCHOOL_CORRESPONDENCE",
    "UNIVERSITY_CORRESPONDENCE",
    "EMPLOYER_CORRESPONDENCE",
    "INVOICE",
    "ACCOUNT_STATEMENT",
    "OTHER"
  ]);

export const proofOfAddressDefinition = {
  id: "proof-of-address",

  documentType: "PROOF_OF_ADDRESS",

  name: "Proof of Address",

  version: "1.2",

  description:
    "Extracts the best available recipient-associated address evidence from an eligible source document, prioritising physical, premises, service and property addresses over postal addresses.",

  ai: {
    provider: "gemini",
    model: null,
    temperature: 0,
    maxOutputTokens: null
  },

  buildPrompt: buildProofOfAddressPrompt,

  schema: proofOfAddressSchema,

  normalize: normalizeProofOfAddress,

  validate: validateProofOfAddress,

  /*
   * PROOF_OF_ADDRESS is a functional document type.
   *
   * The detected source document may therefore be a utility bill,
   * bank statement, municipal account, lease agreement or another
   * document that contains acceptable address evidence.
   */
  typePolicy: {
    matchingMode: "FUNCTIONAL",

    acceptedDetectedTypes:
      ACCEPTED_SOURCE_DOCUMENT_TYPES
  },

  reviewPolicy: {
    confidenceThreshold: 0.9,

    /*
     * Proof-of-address submissions require confirmation that the
     * selected address belongs to the expected person or
     * organisation and is appropriate for the downstream process.
     */
    alwaysReview: true,

    /*
     * Type matching must be evaluated using typePolicy rather than
     * exact equality between PROOF_OF_ADDRESS and the detected
     * source-document type.
     */
    reviewOnTypeMismatch: true,

    reviewOnExtractionFailure: true,

    reviewOnValidationFailure: true,

    reviewOnLowConfidence: true,

    reviewOnQualityIssue: true,

    reviewOnMissingRequiredFields: true,

    requiredFields: REQUIRED_FIELDS
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
