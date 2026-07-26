import { buildProofOfAddressPrompt } from "./prompt.js";
import { proofOfAddressSchema } from "./schema.js";
import { normalizeProofOfAddress } from "./normalizer.js";
import { validateProofOfAddress } from "./validator.js";

/**
 * Definition for extracting address evidence from any document.
 *
 * PROOF_OF_ADDRESS describes the processing purpose rather than the
 * underlying source-document type.
 *
 * For example, a bank statement may be processed using:
 *
 *   documentType=PROOF_OF_ADDRESS
 *
 * and the extracted document_type may be:
 *
 *   BANK_STATEMENT
 */
export const proofOfAddressDefinition = {
  id: "proof-of-address",
  documentType: "PROOF_OF_ADDRESS",
  name: "Proof of Address",
  version: "1.0",
  description:
    "Extracts address evidence from any document containing an address associated with a person or organisation.",

  buildPrompt: buildProofOfAddressPrompt,
  schema: proofOfAddressSchema,
  normalize: normalizeProofOfAddress,
  validate: validateProofOfAddress,

  /**
   * Minimum model confidence before confidence alone causes
   * the document to be sent for manual review.
   */
  confidenceThreshold: 0.9,

  /**
   * Fields evaluated by the generic review engine.
   *
   * These are not the same as the Gemini schema's required fields.
   * These fields determine whether the extraction is sufficiently
   * complete for the intended purpose.
   */
  requiredFields: [
    "document_type",
    "contains_address",
    "recipient_name",
    "address_line_1"
  ],

  reviewPolicy: {
    /**
     * Address evidence usually requires a human or consuming
     * application to confirm that the address belongs to the
     * expected person.
     */
    alwaysReview: true,

    confidenceThreshold: 0.9,

    reviewOnTypeMismatch: true,

    reviewOnValidationFailure: true,

    reviewOnQualityIssue: true,

    reviewOnMissingRequiredFields: true
  }
};
