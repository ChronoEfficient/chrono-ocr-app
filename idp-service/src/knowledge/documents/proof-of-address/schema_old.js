/**
 * Gemini structured-output schema for proof-of-address extraction.
 *
 * PROOF_OF_ADDRESS represents the intended processing purpose.
 * The underlying document may be a bank statement, utility bill,
 * municipal account, invoice, correspondence, or another document
 * containing a usable address.
 */
export const proofOfAddressSchema = {
  type: "OBJECT",

  properties: {
    document_type: {
      type: "STRING",
      nullable: true,
      description:
        "The actual underlying document type, such as BANK_STATEMENT, UTILITY_BILL, MUNICIPAL_ACCOUNT, OTHER, or UNKNOWN."
    },

    document_type_description: {
      type: "STRING",
      nullable: true,
      description:
        "A short free-text description of the document when document_type is OTHER. Must otherwise be null."
    },

    contains_address: {
      type: "BOOLEAN",
      description:
        "True only when a usable address associated with the recipient or account holder is visibly present."
    },

    issuer_name: {
      type: "STRING",
      nullable: true,
      description:
        "The organisation, institution, authority, landlord, supplier, employer, or other party that issued the document."
    },

    recipient_name: {
      type: "STRING",
      nullable: true,
      description:
        "The person or organisation associated with the extracted address."
    },

    address_type: {
      type: "STRING",
      nullable: true,
      description:
        "The address classification when visible or reliably identifiable.",
      enum: [
        "RESIDENTIAL",
        "PHYSICAL",
        "POSTAL",
        "BUSINESS",
        "REGISTERED",
        "OTHER",
        "UNKNOWN"
      ]
    },

    address_line_1: {
      type: "STRING",
      nullable: true,
      description:
        "The primary address line, normally including the street number, street name, building, unit, plot, farm, or postal-box information."
    },

    address_line_2: {
      type: "STRING",
      nullable: true,
      description:
        "The secondary address line, such as a building, complex, floor, unit, village, extension, or additional locality."
    },

    suburb: {
      type: "STRING",
      nullable: true,
      description:
        "The suburb, township, village, district, extension, or local area."
    },

    city: {
      type: "STRING",
      nullable: true,
      description:
        "The city or town associated with the address."
    },

    province: {
      type: "STRING",
      nullable: true,
      description:
        "The province, state, or regional administrative area."
    },

    postal_code: {
      type: "STRING",
      nullable: true,
      description:
        "The postal or ZIP code exactly as shown, excluding unnecessary spaces."
    },

    country: {
      type: "STRING",
      nullable: true,
      description:
        "The country associated with the address."
    },

    date_issued: {
      type: "STRING",
      nullable: true,
      description:
        "The issue, statement, invoice, correspondence, or document date in YYYY-MM-DD format."
    },

    reference_number: {
      type: "STRING",
      nullable: true,
      description:
        "A visible account number, statement number, invoice number, policy number, correspondence reference, or similar document reference."
    }
  },

  required: [
    "document_type",
    "document_type_description",
    "contains_address",
    "issuer_name",
    "recipient_name",
    "address_type",
    "address_line_1",
    "address_line_2",
    "suburb",
    "city",
    "province",
    "postal_code",
    "country",
    "date_issued",
    "reference_number"
  ]
};
