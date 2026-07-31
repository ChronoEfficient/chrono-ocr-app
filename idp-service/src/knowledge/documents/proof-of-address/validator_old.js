const KNOWN_DOCUMENT_TYPES = new Set([
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
]);

const KNOWN_ADDRESS_TYPES = new Set([
  "RESIDENTIAL",
  "PHYSICAL",
  "POSTAL",
  "BUSINESS",
  "REGISTERED",
  "OTHER",
  "UNKNOWN"
]);

const SOUTH_AFRICAN_PROVINCES =
  new Set([
    "GAUTENG",
    "LIMPOPO",
    "MPUMALANGA",
    "NORTH_WEST",
    "FREE_STATE",
    "KWAZULU_NATAL",
    "EASTERN_CAPE",
    "WESTERN_CAPE",
    "NORTHERN_CAPE"
  ]);

function isValidIsoDate(value) {
  if (!value) {
    return false;
  }

  const match = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!match) {
    return false;
  }

  const [, year, month, day] = match;

  const date = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day)
    )
  );

  return (
    date.getUTCFullYear() ===
      Number(year) &&
    date.getUTCMonth() ===
      Number(month) - 1 &&
    date.getUTCDate() ===
      Number(day)
  );
}

export function validateProofOfAddress(
  result = {}
) {
  const fields =
    result &&
    typeof result === "object" &&
    !Array.isArray(result)
      ? result
      : {};

  const issues = [];

  if (!fields.document_type) {
    issues.push({
      code: "MISSING_DOCUMENT_TYPE",
      field: "document_type",
      message:
        "The underlying document type was not provided."
    });
  } else if (
    !KNOWN_DOCUMENT_TYPES.has(
      fields.document_type
    )
  ) {
    issues.push({
      code: "UNRECOGNISED_DOCUMENT_TYPE",
      field: "document_type",
      actual: fields.document_type,
      message:
        "The document type is not in the current controlled list."
    });
  }

  if (
    fields.document_type === "OTHER" &&
    !fields.document_type_description
  ) {
    issues.push({
      code:
        "MISSING_DOCUMENT_TYPE_DESCRIPTION",
      field:
        "document_type_description",
      message:
        "A description is required when the document type is OTHER."
    });
  }

  if (!fields.contains_address) {
    issues.push({
      code: "ADDRESS_NOT_DETECTED",
      field: "contains_address",
      message:
        "No usable address was detected in the document."
    });
  }

  if (
    fields.contains_address &&
    !fields.address_line_1
  ) {
    issues.push({
      code: "MISSING_ADDRESS_LINE_1",
      field: "address_line_1",
      message:
        "An address was detected, but the primary address line is missing."
    });
  }

  if (
    fields.contains_address &&
    !fields.city &&
    !fields.suburb &&
    !fields.postal_code
  ) {
    issues.push({
      code:
        "INSUFFICIENT_ADDRESS_LOCALITY",
      field: "address",
      message:
        "The extracted address has no city, suburb, locality, or postal code."
    });
  }

  if (!fields.recipient_name) {
    issues.push({
      code: "MISSING_RECIPIENT_NAME",
      field: "recipient_name",
      message:
        "The person or organisation associated with the address was not identified."
    });
  }

  if (
    fields.address_type &&
    !KNOWN_ADDRESS_TYPES.has(
      fields.address_type
    )
  ) {
    issues.push({
      code: "UNKNOWN_ADDRESS_TYPE",
      field: "address_type",
      actual: fields.address_type
    });
  }

  if (
    fields.province &&
    fields.country === "SOUTH_AFRICA" &&
    !SOUTH_AFRICAN_PROVINCES.has(
      fields.province
    )
  ) {
    issues.push({
      code:
        "UNKNOWN_SOUTH_AFRICAN_PROVINCE",
      field: "province",
      actual: fields.province
    });
  }

  if (
    fields.country === "SOUTH_AFRICA" &&
    fields.postal_code &&
    !/^\d{4}$/.test(
      fields.postal_code
    )
  ) {
    issues.push({
      code:
        "INVALID_SOUTH_AFRICAN_POSTAL_CODE",
      field: "postal_code",
      actual: fields.postal_code
    });
  }

  if (
    fields.date_issued &&
    !isValidIsoDate(
      fields.date_issued
    )
  ) {
    issues.push({
      code: "INVALID_DATE_ISSUED",
      field: "date_issued",
      actual: fields.date_issued
    });
  }

  return {
    valid: issues.length === 0,
    issues,
    derivedData: {
      hasCompleteAddress:
        Boolean(
          fields.address_line_1
        ) &&
        Boolean(
          fields.city ||
          fields.suburb ||
          fields.postal_code
        ),

      underlyingDocumentType:
        fields.document_type ?? null
    }
  };
}
