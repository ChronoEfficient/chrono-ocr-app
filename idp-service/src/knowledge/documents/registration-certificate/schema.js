/**
 * Gemini structured-output schema for registration-certificate extraction.
 *
 * This schema follows the standard extraction contract used by all document
 * types in the platform:
 *
 * {
 *   document_type_detected,
 *   is_document_type_match,
 *   extraction_status,
 *   fields,
 *   confidence
 * }
 *
 * The registration-certificate-specific fields are contained within the
 * "fields" property.
 */

const addressSchema = {
  type: "OBJECT",

  nullable: true,

  properties: {
    address_line_1: {
      type: "STRING",
      nullable: true,
      description:
        "The primary address line, such as a building, unit, stand, erf, plot, street number, street name, farm, or PO Box."
    },

    address_line_2: {
      type: "STRING",
      nullable: true,
      description:
        "The secondary address line belonging to the same address, such as a building name, complex, additional street line, or locality."
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
        "The postal or ZIP code exactly as shown, excluding unnecessary spacing."
    },

    country: {
      type: "STRING",
      nullable: true,
      description:
        "The country associated with the address."
    },

    full_address: {
      type: "STRING",
      nullable: true,
      description:
        "The complete address as a single value when reliable separation into individual address components is not possible."
    }
  },

  required: [
    "address_line_1",
    "address_line_2",
    "suburb",
    "city",
    "province",
    "postal_code",
    "country",
    "full_address"
  ]
};

const directorSchema = {
  type: "OBJECT",

  properties: {
    full_name: {
      type: "STRING",
      nullable: true,
      description:
        "The complete displayed name of the director, member, officer, or responsible person."
    },

    role: {
      type: "STRING",
      nullable: true,
      description:
        "The person's displayed role, such as DIRECTOR, MEMBER, CEO, CFO, SECRETARY, TRUSTEE, or another role."
    },

    identification_number: {
      type: "STRING",
      nullable: true,
      description:
        "The visible national identity number, passport number, registration identifier, or similar personal identifier. Return null when only a date of birth is shown."
    },

    identification_type: {
      type: "STRING",
      nullable: true,
      enum: [
        "SOUTH_AFRICAN_ID",
        "PASSPORT",
        "FOREIGN_ID",
        "OTHER",
        "UNKNOWN"
      ],
      description:
        "The type of personal identifier when visible or reliably identifiable."
    },

    date_of_birth: {
      type: "STRING",
      nullable: true,
      description:
        "The person's date of birth in YYYY-MM-DD format when explicitly shown."
    },

    appointment_date: {
      type: "STRING",
      nullable: true,
      description:
        "The appointment date in YYYY-MM-DD format."
    },

    postal_address: {
      ...addressSchema,
      description:
        "The postal address associated with the director or member."
    },

    residential_address: {
      ...addressSchema,
      description:
        "The residential or physical address associated with the director or member."
    }
  },

  required: [
    "full_name",
    "role",
    "identification_number",
    "identification_type",
    "date_of_birth",
    "appointment_date",
    "postal_address",
    "residential_address"
  ]
};

const registrationFieldsSchema = {
  type: "OBJECT",

  properties: {
    document_type: {
      type: "STRING",
      nullable: true,
      enum: [
        "REGISTRATION_CERTIFICATE",
        "OTHER",
        "UNKNOWN"
      ]
    },

    document_subtype: {
      type: "STRING",
      nullable: true
    },

    document_title: {
      type: "STRING",
      nullable: true
    },

    issuing_authority: {
      type: "STRING",
      nullable: true
    },

    country_of_registration: {
      type: "STRING",
      nullable: true
    },

    certificate_issued_at: {
      type: "STRING",
      nullable: true
    },

    registration_number: {
      type: "STRING",
      nullable: true
    },

    enterprise_name: {
      type: "STRING",
      nullable: true
    },

    registration_date: {
      type: "STRING",
      nullable: true
    },

    business_start_date: {
      type: "STRING",
      nullable: true
    },

    enterprise_type: {
      type: "STRING",
      nullable: true,

      enum: [
        "PRIVATE_COMPANY",
        "PUBLIC_COMPANY",
        "NON_PROFIT_COMPANY",
        "CLOSE_CORPORATION",
        "SOLE_PROPRIETORSHIP",
        "PARTNERSHIP",
        "COOPERATIVE",
        "EXTERNAL_COMPANY",
        "STATE_OWNED_COMPANY",
        "PERSONAL_LIABILITY_COMPANY",
        "TRUST",
        "OTHER",
        "UNKNOWN"
      ]
    },

    enterprise_type_description: {
      type: "STRING",
      nullable: true
    },

    enterprise_status: {
      type: "STRING",
      nullable: true,

      enum: [
        "IN_BUSINESS",
        "ACTIVE",
        "DEREGISTERED",
        "DEREGISTRATION_PROCESS",
        "LIQUIDATION",
        "BUSINESS_RESCUE",
        "FINAL_DEREGISTRATION",
        "OTHER",
        "UNKNOWN"
      ]
    },

    enterprise_status_description: {
      type: "STRING",
      nullable: true
    },

    financial_year_end: {
      type: "STRING",
      nullable: true
    },

    tax_number: {
      type: "STRING",
      nullable: true
    },

    postal_address: addressSchema,

    registered_office_address: addressSchema,

    directors: {
      type: "ARRAY",
      items: directorSchema
    },

    source_page_count: {
      type: "INTEGER",
      nullable: true
    }
  },

  required: [
    "document_type",
    "document_subtype",
    "document_title",
    "issuing_authority",
    "country_of_registration",
    "certificate_issued_at",
    "registration_number",
    "enterprise_name",
    "registration_date",
    "business_start_date",
    "enterprise_type",
    "enterprise_type_description",
    "enterprise_status",
    "enterprise_status_description",
    "financial_year_end",
    "tax_number",
    "postal_address",
    "registered_office_address",
    "directors",
    "source_page_count"
  ]
};

export const registrationCertificateSchema = {
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
      enum: [
        "SUCCESS",
        "PARTIAL",
        "FAILED"
      ]
    },

    fields: registrationFieldsSchema,

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
