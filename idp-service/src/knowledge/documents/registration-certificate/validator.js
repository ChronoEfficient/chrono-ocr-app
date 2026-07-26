const KNOWN_DOCUMENT_TYPES = new Set([
  "REGISTRATION_CERTIFICATE",
  "OTHER",
  "UNKNOWN"
]);

const KNOWN_DOCUMENT_SUBTYPES = new Set([
  "CIPC_COR14_3",
  "CIPC_COR14_1",
  "CERTIFICATE_OF_INCORPORATION",
  "COOPERATIVE_REGISTRATION_CERTIFICATE",
  "TRUST_REGISTRATION_CERTIFICATE",
  "OTHER",
  "UNKNOWN"
]);

const KNOWN_ENTERPRISE_TYPES = new Set([
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
]);

const KNOWN_ENTERPRISE_STATUSES = new Set([
  "IN_BUSINESS",
  "ACTIVE",
  "DEREGISTERED",
  "DEREGISTRATION_PROCESS",
  "LIQUIDATION",
  "BUSINESS_RESCUE",
  "FINAL_DEREGISTRATION",
  "OTHER",
  "UNKNOWN"
]);

const KNOWN_IDENTIFICATION_TYPES = new Set([
  "SOUTH_AFRICAN_ID",
  "PASSPORT",
  "FOREIGN_ID",
  "OTHER",
  "UNKNOWN"
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

const MONTHS = new Set([
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER"
]);

const CIPC_FOOTER_PATTERNS = [
  /\bTHE DTI CAMPUS\b/i,
  /\bMEINTJIES STREET\b/i,
  /\bP\s*O\s*BOX\s*429\b/i,
  /\bDOcex\s*:\s*256\b/i,
  /\b086\s*100\s*2472\b/i,
  /\bWWW\.CIPC\.CO\.ZA\b/i,
  /\bCOMPANIES AND INTELLECTUAL PROPERTY COMMISSION\b/i
];

function isPlainObject(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

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

function isValidIsoDateTime(value) {
  if (!value) {
    return false;
  }

  const match = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/
  );

  if (!match) {
    return false;
  }

  const [
    ,
    year,
    month,
    day,
    hour,
    minute,
    second
  ] = match;

  const numericHour = Number(hour);
  const numericMinute = Number(minute);
  const numericSecond = Number(second);

  if (
    numericHour < 0 ||
    numericHour > 23 ||
    numericMinute < 0 ||
    numericMinute > 59 ||
    numericSecond < 0 ||
    numericSecond > 59
  ) {
    return false;
  }

  return isValidIsoDate(
    `${year}-${month}-${day}`
  );
}

function isValidCipcRegistrationNumber(value) {
  if (!isNonEmptyString(value)) {
    return false;
  }

  return /^\d{4}\/\d{6}\/\d{2}$/.test(
    value.trim()
  );
}

function isValidSouthAfricanIdFormat(value) {
  return /^\d{13}$/.test(
    String(value ?? "")
  );
}

function isValidTaxNumberFormat(value) {
  return /^\d+$/.test(
    String(value ?? "")
  );
}

function hasAnyAddressValue(address) {
  if (!isPlainObject(address)) {
    return false;
  }

  return [
    address.address_line_1,
    address.address_line_2,
    address.suburb,
    address.city,
    address.province,
    address.postal_code,
    address.country,
    address.full_address
  ].some(isNonEmptyString);
}

function getAddressText(address) {
  if (!isPlainObject(address)) {
    return "";
  }

  return [
    address.address_line_1,
    address.address_line_2,
    address.suburb,
    address.city,
    address.province,
    address.postal_code,
    address.country,
    address.full_address
  ]
    .filter(isNonEmptyString)
    .join(" ");
}

function appearsToBeCipcFooterAddress(address) {
  const text = getAddressText(address);

  if (!text) {
    return false;
  }

  return CIPC_FOOTER_PATTERNS.some(
    (pattern) => pattern.test(text)
  );
}

function validateAddress(
  address,
  {
    field,
    required = false,
    rejectCipcFooter = false
  } = {}
) {
  const issues = [];

  if (address == null) {
    if (required) {
      issues.push({
        code: "MISSING_ADDRESS",
        field,
        message:
          `The required address '${field}' was not extracted.`
      });
    }

    return issues;
  }

  if (!isPlainObject(address)) {
    issues.push({
      code: "INVALID_ADDRESS_STRUCTURE",
      field,
      message:
        `The address '${field}' must be an object or null.`
    });

    return issues;
  }

  if (!hasAnyAddressValue(address)) {
    issues.push({
      code: "EMPTY_ADDRESS",
      field,
      message:
        `The address '${field}' was returned without any address values.`
    });
  }

  if (
    address.country === "SOUTH_AFRICA" &&
    address.province &&
    !SOUTH_AFRICAN_PROVINCES.has(
      address.province
    )
  ) {
    issues.push({
      code:
        "UNKNOWN_SOUTH_AFRICAN_PROVINCE",
      field: `${field}.province`,
      actual: address.province,
      message:
        "The extracted province is not a recognised South African province."
    });
  }

  if (
    address.country === "SOUTH_AFRICA" &&
    address.postal_code &&
    !/^\d{4}$/.test(
      address.postal_code
    )
  ) {
    issues.push({
      code:
        "INVALID_SOUTH_AFRICAN_POSTAL_CODE",
      field: `${field}.postal_code`,
      actual: address.postal_code,
      message:
        "A South African postal code must contain exactly four digits."
    });
  }

  if (
    rejectCipcFooter &&
    appearsToBeCipcFooterAddress(
      address
    )
  ) {
    issues.push({
      code: "ISSUER_ADDRESS_EXTRACTED",
      field,
      message:
        "The extracted address appears to belong to the issuing authority rather than the registered enterprise or director."
    });
  }

  return issues;
}

function validateDirector(
  director,
  index
) {
  const issues = [];

  const prefix =
    `directors[${index}]`;

  if (!isPlainObject(director)) {
    issues.push({
      code: "INVALID_DIRECTOR_STRUCTURE",
      field: prefix,
      message:
        "Each director entry must be an object."
    });

    return issues;
  }

  if (
    !isNonEmptyString(
      director.full_name
    )
  ) {
    issues.push({
      code: "MISSING_DIRECTOR_NAME",
      field: `${prefix}.full_name`,
      message:
        "The director or member name was not extracted."
    });
  }

  if (
    !isNonEmptyString(
      director.role
    )
  ) {
    issues.push({
      code: "MISSING_DIRECTOR_ROLE",
      field: `${prefix}.role`,
      message:
        "The director or member role was not extracted."
    });
  }

  if (
    director.identification_type &&
    !KNOWN_IDENTIFICATION_TYPES.has(
      director.identification_type
    )
  ) {
    issues.push({
      code:
        "UNKNOWN_IDENTIFICATION_TYPE",
      field:
        `${prefix}.identification_type`,
      actual:
        director.identification_type,
      message:
        "The director identification type is not recognised."
    });
  }

  if (
    director.identification_type ===
      "SOUTH_AFRICAN_ID" &&
    !isValidSouthAfricanIdFormat(
      director.identification_number
    )
  ) {
    issues.push({
      code:
        "INVALID_SOUTH_AFRICAN_ID_FORMAT",
      field:
        `${prefix}.identification_number`,
      actual:
        director.identification_number,
      message:
        "A South African identity number must contain exactly 13 digits."
    });
  }

  if (
    director.identification_number &&
    !director.identification_type
  ) {
    issues.push({
      code:
        "MISSING_IDENTIFICATION_TYPE",
      field:
        `${prefix}.identification_type`,
      message:
        "An identification number was extracted without an identification type."
    });
  }

  if (
    director.date_of_birth &&
    !isValidIsoDate(
      director.date_of_birth
    )
  ) {
    issues.push({
      code:
        "INVALID_DATE_OF_BIRTH",
      field:
        `${prefix}.date_of_birth`,
      actual:
        director.date_of_birth,
      message:
        "The date of birth must be a valid date in YYYY-MM-DD format."
    });
  }

  if (
    director.appointment_date &&
    !isValidIsoDate(
      director.appointment_date
    )
  ) {
    issues.push({
      code:
        "INVALID_APPOINTMENT_DATE",
      field:
        `${prefix}.appointment_date`,
      actual:
        director.appointment_date,
      message:
        "The appointment date must be a valid date in YYYY-MM-DD format."
    });
  }

  if (
    director.identification_number &&
    director.date_of_birth
  ) {
    issues.push({
      code:
        "IDENTIFICATION_AND_DATE_OF_BIRTH_BOTH_PRESENT",
      field: prefix,
      message:
        "Both an identification number and a date of birth were extracted. Verify that the shared certificate column was interpreted correctly."
    });
  }

  issues.push(
    ...validateAddress(
      director.postal_address,
      {
        field:
          `${prefix}.postal_address`,
        required: false,
        rejectCipcFooter: true
      }
    )
  );

  issues.push(
    ...validateAddress(
      director.residential_address,
      {
        field:
          `${prefix}.residential_address`,
        required: false,
        rejectCipcFooter: true
      }
    )
  );

  return issues;
}

export function validateRegistrationCertificate(
  result = {}
) {
  const fields =
    isPlainObject(result)
      ? result
      : {};

  const issues = [];

  /*
   * Document classification
   */

  if (!fields.document_type) {
    issues.push({
      code: "MISSING_DOCUMENT_TYPE",
      field: "document_type",
      message:
        "The document type was not extracted."
    });
  } else if (
    !KNOWN_DOCUMENT_TYPES.has(
      fields.document_type
    )
  ) {
    issues.push({
      code:
        "UNRECOGNISED_DOCUMENT_TYPE",
      field: "document_type",
      actual: fields.document_type,
      message:
        "The document type is not in the controlled list."
    });
  } else if (
    fields.document_type !==
      "REGISTRATION_CERTIFICATE"
  ) {
    issues.push({
      code:
        "NOT_REGISTRATION_CERTIFICATE",
      field: "document_type",
      actual: fields.document_type,
      message:
        "The uploaded document was not classified as a registration certificate."
    });
  }

  if (
    fields.document_subtype &&
    !KNOWN_DOCUMENT_SUBTYPES.has(
      fields.document_subtype
    )
  ) {
    issues.push({
      code:
        "UNRECOGNISED_DOCUMENT_SUBTYPE",
      field: "document_subtype",
      actual: fields.document_subtype,
      message:
        "The registration-certificate subtype is not recognised."
    });
  }

  /*
   * Core enterprise information
   */

  if (
    !isNonEmptyString(
      fields.issuing_authority
    )
  ) {
    issues.push({
      code:
        "MISSING_ISSUING_AUTHORITY",
      field: "issuing_authority",
      message:
        "The issuing authority was not extracted."
    });
  }

  if (
    !isNonEmptyString(
      fields.registration_number
    )
  ) {
    issues.push({
      code:
        "MISSING_REGISTRATION_NUMBER",
      field: "registration_number",
      message:
        "The enterprise registration number was not extracted."
    });
  }

  if (
    fields.document_subtype ===
      "CIPC_COR14_3" &&
    fields.registration_number &&
    !isValidCipcRegistrationNumber(
      fields.registration_number
    )
  ) {
    issues.push({
      code:
        "INVALID_CIPC_REGISTRATION_NUMBER",
      field: "registration_number",
      actual:
        fields.registration_number,
      message:
        "A CIPC registration number is expected in the format YYYY/NNNNNN/NN."
    });
  }

  if (
    !isNonEmptyString(
      fields.enterprise_name
    )
  ) {
    issues.push({
      code:
        "MISSING_ENTERPRISE_NAME",
      field: "enterprise_name",
      message:
        "The registered enterprise name was not extracted."
    });
  }

  if (
    !fields.registration_date
  ) {
    issues.push({
      code:
        "MISSING_REGISTRATION_DATE",
      field: "registration_date",
      message:
        "The enterprise registration date was not extracted."
    });
  } else if (
    !isValidIsoDate(
      fields.registration_date
    )
  ) {
    issues.push({
      code:
        "INVALID_REGISTRATION_DATE",
      field: "registration_date",
      actual:
        fields.registration_date,
      message:
        "The registration date must be a valid date in YYYY-MM-DD format."
    });
  }

  if (
    fields.business_start_date &&
    !isValidIsoDate(
      fields.business_start_date
    )
  ) {
    issues.push({
      code:
        "INVALID_BUSINESS_START_DATE",
      field: "business_start_date",
      actual:
        fields.business_start_date,
      message:
        "The business start date must be a valid date in YYYY-MM-DD format."
    });
  }

  if (
    fields.certificate_issued_at &&
    !isValidIsoDateTime(
      fields.certificate_issued_at
    )
  ) {
    issues.push({
      code:
        "INVALID_CERTIFICATE_ISSUED_AT",
      field:
        "certificate_issued_at",
      actual:
        fields.certificate_issued_at,
      message:
        "The certificate issue timestamp must use YYYY-MM-DDTHH:mm:ss."
    });
  }

  /*
   * Enterprise type and status
   */

  if (!fields.enterprise_type) {
    issues.push({
      code:
        "MISSING_ENTERPRISE_TYPE",
      field: "enterprise_type",
      message:
        "The legal enterprise type was not extracted."
    });
  } else if (
    !KNOWN_ENTERPRISE_TYPES.has(
      fields.enterprise_type
    )
  ) {
    issues.push({
      code:
        "UNRECOGNISED_ENTERPRISE_TYPE",
      field: "enterprise_type",
      actual: fields.enterprise_type,
      message:
        "The enterprise type is not in the controlled list."
    });
  }

  if (
    fields.enterprise_type ===
      "OTHER" &&
    !isNonEmptyString(
      fields.enterprise_type_description
    )
  ) {
    issues.push({
      code:
        "MISSING_ENTERPRISE_TYPE_DESCRIPTION",
      field:
        "enterprise_type_description",
      message:
        "A description is required when enterprise_type is OTHER."
    });
  }

  if (
    fields.enterprise_status &&
    !KNOWN_ENTERPRISE_STATUSES.has(
      fields.enterprise_status
    )
  ) {
    issues.push({
      code:
        "UNRECOGNISED_ENTERPRISE_STATUS",
      field: "enterprise_status",
      actual:
        fields.enterprise_status,
      message:
        "The enterprise status is not in the controlled list."
    });
  }

  if (
    fields.enterprise_status ===
      "OTHER" &&
    !isNonEmptyString(
      fields.enterprise_status_description
    )
  ) {
    issues.push({
      code:
        "MISSING_ENTERPRISE_STATUS_DESCRIPTION",
      field:
        "enterprise_status_description",
      message:
        "A description is required when enterprise_status is OTHER."
    });
  }

  if (
    fields.financial_year_end &&
    !MONTHS.has(
      fields.financial_year_end
    )
  ) {
    issues.push({
      code:
        "INVALID_FINANCIAL_YEAR_END",
      field: "financial_year_end",
      actual:
        fields.financial_year_end,
      message:
        "The financial year end must be a valid month name."
    });
  }

  if (
    fields.tax_number &&
    !isValidTaxNumberFormat(
      fields.tax_number
    )
  ) {
    issues.push({
      code:
        "INVALID_TAX_NUMBER_FORMAT",
      field: "tax_number",
      actual: fields.tax_number,
      message:
        "The tax number must contain digits only after normalisation."
    });
  }

  /*
   * Enterprise addresses
   */

  issues.push(
    ...validateAddress(
      fields.postal_address,
      {
        field: "postal_address",
        required: false,
        rejectCipcFooter: true
      }
    )
  );

  issues.push(
    ...validateAddress(
      fields.registered_office_address,
      {
        field:
          "registered_office_address",
        required: false,
        rejectCipcFooter: true
      }
    )
  );

  /*
   * Directors and members
   */

  if (!Array.isArray(fields.directors)) {
    issues.push({
      code:
        "INVALID_DIRECTORS_STRUCTURE",
      field: "directors",
      message:
        "Directors must be returned as an array."
    });
  } else {
    fields.directors.forEach(
      (director, index) => {
        issues.push(
          ...validateDirector(
            director,
            index
          )
        );
      }
    );
  }

  /*
   * Source page count
   */

  if (
    fields.source_page_count != null &&
    (
      !Number.isInteger(
        fields.source_page_count
      ) ||
      fields.source_page_count < 1
    )
  ) {
    issues.push({
      code:
        "INVALID_SOURCE_PAGE_COUNT",
      field: "source_page_count",
      actual:
        fields.source_page_count,
      message:
        "The source page count must be a positive integer."
    });
  }

  const hasEnterpriseIdentity =
    Boolean(
      fields.registration_number &&
      fields.enterprise_name
    );

  const hasEnterpriseDates =
    Boolean(
      fields.registration_date
    );

  const hasEnterpriseAddress =
    hasAnyAddressValue(
      fields.postal_address
    ) ||
    hasAnyAddressValue(
      fields.registered_office_address
    );

  const directorCount =
    Array.isArray(fields.directors)
      ? fields.directors.length
      : 0;

  const directorsWithIdentity =
    Array.isArray(fields.directors)
      ? fields.directors.filter(
          (director) =>
            director &&
            (
              director.identification_number ||
              director.date_of_birth
            )
        ).length
      : 0;

  return {
    valid: issues.length === 0,

    issues,

    derivedData: {
      hasEnterpriseIdentity,

      hasEnterpriseDates,

      hasEnterpriseAddress,

      hasPostalAddress:
        hasAnyAddressValue(
          fields.postal_address
        ),

      hasRegisteredOfficeAddress:
        hasAnyAddressValue(
          fields.registered_office_address
        ),

      directorCount,

      directorsWithIdentity,

      hasDirectors:
        directorCount > 0,

      registrationNumber:
        fields.registration_number ??
        null,

      enterpriseName:
        fields.enterprise_name ??
        null,

      documentSubtype:
        fields.document_subtype ??
        null
    }
  };
}
