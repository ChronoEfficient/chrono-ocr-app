export const bankConfirmationSchema = {
  type: "object",
  properties: {
    document_type_detected: {
      type: "string"
    },

    is_document_type_match: {
      type: "boolean"
    },

    extraction_status: {
      type: "string",
      enum: ["SUCCESS", "PARTIAL", "FAILED"]
    },

    fields: {
      type: "object",

      properties: {
        bank_name: {
          type: ["string", "null"]
        },

        branch_code: {
          type: ["string", "null"]
        },

        account_holder: {
          type: ["string", "null"]
        },

        account_number: {
          type: ["string", "null"]
        },

        account_type: {
          type: ["string", "null"]
        },

        swift_code: {
          type: ["string", "null"]
        },

        date_issued: {
          type: ["string", "null"]
        }
      },

      required: [
        "bank_name",
        "branch_code",
        "account_holder",
        "account_number",
        "account_type",
        "swift_code",
        "date_issued"
      ],

      additionalProperties: false
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
  ],

  additionalProperties: false
};
