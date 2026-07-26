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

const PHYSICAL_ADDRESS_TYPES = new Set([
  "PHYSICAL",
  "RESIDENTIAL"
]);

const SOUTH_AFRICAN_PROVINCES = new Set([
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

function isNonEmptyString(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

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
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
}

export function validateProofOfAddress(
  result = {},
  context = {}
) {
  const fields =
    result &&
    typeof result === "object" &&
    !Array.isArray(result)
      ? result
      : {};

  const processingContext =
    context &&
    typeof context === "object" &&
    !Array.isArray(context)
      ? context
      : {};

  const issues = [];

  const detectedDocumentType =
    processingContext.documentTypeDetected ??
    processingContext.detectedDocumentType ??
    null;

  const hasPrimaryAddressLine =
    isNonEmptyString(
      fields.address_line_1
    );

  const hasSecondaryAddressLine =
    isNonEmptyString(
      fields.address_line_2
    );

  const hasLocality =
    isNonEmptyString(fields.city) ||
    isNonEmptyString(fields.suburb) ||
    isNonEmptyString(
      fields.postal_code
    );

  const isPhysicalAddress =
    PHYSICAL_ADDRESS_TYPES.has(
      fields.address_type
    );

  /*
   * Source-document classification
   */

  if (!detectedDocumentType) {
    issues.push({
      code: "MISSING_DOCUMENT_TYPE",
      field: "document_type_detected",
      message:
        "The underlying source-document type was not provided."
    });
  } else if (
    !KNOWN_DOCUMENT_TYPES.has(
      detectedDocumentType
    )
  ) {
    issues.push({
      code:
        "UNRECOGNISED_DOCUMENT_TYPE",
      field: "document_type_detected",
      actual: detectedDocumentType,
      message:
        "The source-document type is not in the current controlled list. Uncatalogued documents should normally use OTHER."
    });
  }

  if (
    detectedDocumentType === "OTHER" &&
    !isNonEmptyString(
      fields.document_type_description
    )
  ) {
    issues.push({
      code:
        "MISSING_DOCUMENT_TYPE_DESCRIPTION",
      field:
        "document_type_description",
      message:
        "A document description is required when document_type_detected is OTHER."
    });
  }

  if (
    detectedDocumentType !== "OTHER" &&
    isNonEmptyString(
      fields.document_type_description
    )
  ) {
    issues.push({
      code:
        "UNEXPECTED_DOCUMENT_TYPE_DESCRIPTION",
      field:
        "document_type_description",
      actual:
        fields.document_type_description,
      message:
        "document_type_description must be null unless document_type_detected is OTHER."
    });
  }

  /*
   * Address detection and completeness
   */

  if (
    fields.contains_address !== true
  ) {
    issues.push({
      code: "ADDRESS_NOT_DETECTED",
      field: "contains_address",
      message:
        "No usable recipient-associated address was detected in the document."
    });
  }

  if (
    fields.contains_address === true &&
    !fields.address_type
  ) {
    issues.push({
      code: "MISSING_ADDRESS_TYPE",
      field: "address_type",
      message:
        "An address was detected, but its address type was not identified."
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
      actual: fields.address_type,
      message:
        "The selected address type is not recognised."
    });
  }

  if (
    fields.contains_address === true &&
    !hasPrimaryAddressLine
  ) {
    issues.push({
      code: "MISSING_ADDRESS_LINE_1",
      field: "address_line_1",
      message:
        "An address was detected, but its primary address line is missing."
    });
  }

  /*
   * Physical or residential addresses may be valid without a
   * visible city, suburb, province, country, or postal code when
   * the document contains meaningful premises, stand, erf, plot,
   * unit, building, farm, site, or street information.
   */
  if (
    fields.contains_address === true &&
    hasPrimaryAddressLine &&
    !hasLocality &&
    !isPhysicalAddress
  ) {
    issues.push({
      code:
        "INSUFFICIENT_ADDRESS_LOCALITY",
      field: "address",
      message:
        "The selected non-physical address has no city, suburb, locality, or postal code."
    });
  }

  /*
   * Recipient association
   */

  if (
    !isNonEmptyString(
      fields.recipient_name
    )
  ) {
    issues.push({
      code: "MISSING_RECIPIENT_NAME",
      field: "recipient_name",
      message:
        "The person or organisation associated with the selected address was not identified."
    });
  }

  /*
   * Geographic validation
   */

  if (
    fields.province &&
    fields.country ===
      "SOUTH_AFRICA" &&
    !SOUTH_AFRICAN_PROVINCES.has(
      fields.province
    )
  ) {
    issues.push({
      code:
        "UNKNOWN_SOUTH_AFRICAN_PROVINCE",
      field: "province",
      actual: fields.province,
      message:
        "The extracted province is not a recognised South African province."
    });
  }

  if (
    fields.country ===
      "SOUTH_AFRICA" &&
    fields.postal_code &&
    !/^\d{4}$/.test(
      fields.postal_code
    )
  ) {
    issues.push({
      code:
        "INVALID_SOUTH_AFRICAN_POSTAL_CODE",
      field: "postal_code",
      actual: fields.postal_code,
      message:
        "A South African postal code must contain exactly four digits."
    });
  }

  /*
   * Document-date validation
   */

  if (
    fields.date_issued &&
    !isValidIsoDate(
      fields.date_issued
    )
  ) {
    issues.push({
      code: "INVALID_DATE_ISSUED",
      field: "date_issued",
      actual: fields.date_issued,
      message:
        "The issue date must be a valid date in YYYY-MM-DD format."
    });
  }

  const hasCompleteAddress =
    fields.contains_address === true &&
    hasPrimaryAddressLine &&
    (
      hasLocality ||
      isPhysicalAddress
    );

  return {
    valid: issues.length === 0,

    issues,

    derivedData: {
      hasCompleteAddress,

      hasPhysicalAddress:
        fields.contains_address === true &&
        hasPrimaryAddressLine &&
        isPhysicalAddress,

      hasPostalAddress:
        fields.contains_address === true &&
        hasPrimaryAddressLine &&
        fields.address_type ===
          "POSTAL",

      hasSecondaryAddressLine,

      hasLocality,

      underlyingDocumentType:
        detectedDocumentType
    }
  };
}
