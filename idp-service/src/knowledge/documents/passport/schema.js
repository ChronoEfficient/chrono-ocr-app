export const passportDocumentSchema = {
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
        document_code: { type: ["string", "null"] },
        issuing_country: { type: ["string", "null"] },
        surname: { type: ["string", "null"] },
        given_names: { type: ["string", "null"] },
        nationality: { type: ["string", "null"] },
        passport_number: { type: ["string", "null"] },
        date_of_birth: { type: ["string", "null"] },
        gender: { type: ["string", "null"] },
        place_of_birth: { type: ["string", "null"] },
        date_of_issue: { type: ["string", "null"] },
        date_of_expiry: { type: ["string", "null"] },
        issuing_authority: { type: ["string", "null"] },
        personal_number: { type: ["string", "null"] },
        mrz_line_1: { type: ["string", "null"] },
        mrz_line_2: { type: ["string", "null"] }
      },
      required: [
        "document_code",
        "issuing_country",
        "surname",
        "given_names",
        "nationality",
        "passport_number",
        "date_of_birth",
        "gender",
        "place_of_birth",
        "date_of_issue",
        "date_of_expiry",
        "issuing_authority",
        "personal_number",
        "mrz_line_1",
        "mrz_line_2"
      ]
    },
    confidence: { type: "number" }
  },
  required: [
    "document_type_detected",
    "is_document_type_match",
    "extraction_status",
    "fields",
    "confidence"
  ]
};
