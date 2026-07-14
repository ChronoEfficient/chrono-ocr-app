export const idDocumentSchema = {
  type: "object",
  properties: {
    document_type_detected: { type: "string" },
    is_document_type_match: { type: "boolean" },
    extraction_status: {
      type: "string",
      enum: ["SUCCESS", "PARTIAL", "FAILED"]
    },
    fields: {
      type: "object",
      properties: {
        surname: { type: ["string", "null"] },
        given_names: { type: ["string", "null"] },
        gender: { type: ["string", "null"] },
        nationality: { type: ["string", "null"] },
        id_number: { type: ["string", "null"] },
        date_of_birth: { type: ["string", "null"] },
        country_of_birth: { type: ["string", "null"] },
        citizenship_status: { type: ["string", "null"] },
        document_number: { type: ["string", "null"] },
        date_of_issue: { type: ["string", "null"] },
        date_of_expiry: { type: ["string", "null"] }
      },
      required: [
        "surname",
        "given_names",
        "gender",
        "nationality",
        "id_number",
        "date_of_birth",
        "country_of_birth",
        "citizenship_status",
        "document_number",
        "date_of_issue",
        "date_of_expiry"
      ]
    },
    warnings: {
      type: "array",
      items: { type: "string" }
    },
    validation_issues: {
      type: "array",
      items: { type: "string" }
    },
    confidence: { type: "number" }
  },
  required: [
    "document_type_detected",
    "is_document_type_match",
    "extraction_status",
    "fields",
    "warnings",
    "validation_issues",
    "confidence"
  ]
};
