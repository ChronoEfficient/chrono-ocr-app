export const bankConfirmationSchema = {
  type: "object",
  properties: {
    detected_document_type: {
      type: ["string", "null"]
    },
    type_match: {
      type: "boolean"
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1
    },
    data: {
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
    warnings: {
      type: "array",
      items: {
        type: "string"
      }
    }
  },
  required: [
    "detected_document_type",
    "type_match",
    "confidence",
    "data",
    "warnings"
  ],
  additionalProperties: false
};
