export const proofOfAddressSchema = {
  type: "object",

  properties: {
    document_type_detected: {
      type: "string",
      enum: [
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
        "OTHER",
        "UNKNOWN"
      ]
    },

    is_document_type_match: {
      type: "boolean"
    },

    extraction_status: {
      type: "string",
      enum: [
        "SUCCESS",
        "PARTIAL",
        "FAILED"
      ]
    },

    fields: {
      type: "object",

      properties: {
        document_type_description: {
          type: ["string", "null"]
        },

        contains_address: {
          type: "boolean"
        },

        issuer_name: {
          type: ["string", "null"]
        },

        recipient_name: {
          type: ["string", "null"]
        },

        address_type: {
          type: ["string", "null"],
          enum: [
            "RESIDENTIAL",
            "PHYSICAL",
            "POSTAL",
            "BUSINESS",
            "REGISTERED",
            "OTHER",
            "UNKNOWN",
            null
          ]
        },

        address_line_1: {
          type: ["string", "null"]
        },

        address_line_2: {
          type: ["string", "null"]
        },

        suburb: {
          type: ["string", "null"]
        },

        city: {
          type: ["string", "null"]
        },

        province: {
          type: ["string", "null"]
        },

        postal_code: {
          type: ["string", "null"]
        },

        country: {
          type: ["string", "null"]
        },

        date_issued: {
          type: ["string", "null"]
        },

        reference_number: {
          type: ["string", "null"]
        }
      },

      required: [
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
    },

    confidence: {
      type: "number"
    }
  },

  required: [
    "document_type_detected",
    "is_document_type_match",
    "extraction_status",
    "fields",
    "confidence"
  ]
};
