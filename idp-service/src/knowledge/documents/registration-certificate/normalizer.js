import {
  normalizeText,
  normalizeUppercase,
  normalizeDigits,
  normalizeDate
} from "../../../platform/normalization/base.normalizer.js";

const DOCUMENT_TYPE_MAP = {
  "REGISTRATION CERTIFICATE":
    "REGISTRATION_CERTIFICATE",

  "CERTIFICATE OF REGISTRATION":
    "REGISTRATION_CERTIFICATE",

  "CERTIFICATE OF INCORPORATION":
    "REGISTRATION_CERTIFICATE",

  REGISTRATION_CERTIFICATE:
    "REGISTRATION_CERTIFICATE",

  OTHER: "OTHER",

  UNKNOWN: "UNKNOWN"
};

const DOCUMENT_SUBTYPE_MAP = {
  "COR14.3": "CIPC_COR14_3",
  "COR 14.3": "CIPC_COR14_3",
  "COR14 3": "CIPC_COR14_3",
  "COR14.3 REGISTRATION CERTIFICATE":
    "CIPC_COR14_3",
  "COR14.3: REGISTRATION CERTIFICATE":
    "CIPC_COR14_3",
  CIPC_COR14_3: "CIPC_COR14_3",

  "COR14.1": "CIPC_COR14_1",
  "COR 14.1": "CIPC_COR14_1",
  "COR14 1": "CIPC_COR14_1",
  CIPC_COR14_1: "CIPC_COR14_1",

  "CERTIFICATE OF INCORPORATION":
    "CERTIFICATE_OF_INCORPORATION",

  CERTIFICATE_OF_INCORPORATION:
    "CERTIFICATE_OF_INCORPORATION",

  "COOPERATIVE REGISTRATION CERTIFICATE":
    "COOPERATIVE_REGISTRATION_CERTIFICATE",

  COOPERATIVE_REGISTRATION_CERTIFICATE:
    "COOPERATIVE_REGISTRATION_CERTIFICATE",

  "TRUST REGISTRATION CERTIFICATE":
    "TRUST_REGISTRATION_CERTIFICATE",

  TRUST_REGISTRATION_CERTIFICATE:
    "TRUST_REGISTRATION_CERTIFICATE",

  OTHER: "OTHER",

  UNKNOWN: "UNKNOWN"
};

const ENTERPRISE_TYPE_MAP = {
  "PRIVATE COMPANY":
    "PRIVATE_COMPANY",

  "PRIVATE COMPANY (PTY) LTD":
    "PRIVATE_COMPANY",

  "PTY LTD":
    "PRIVATE_COMPANY",

  PRIVATE_COMPANY:
    "PRIVATE_COMPANY",

  "PUBLIC COMPANY":
    "PUBLIC_COMPANY",

  PUBLIC_COMPANY:
    "PUBLIC_COMPANY",

  "NON PROFIT COMPANY":
    "NON_PROFIT_COMPANY",

  "NON-PROFIT COMPANY":
    "NON_PROFIT_COMPANY",

  "NONPROFIT COMPANY":
    "NON_PROFIT_COMPANY",

  NPC:
    "NON_PROFIT_COMPANY",

  NON_PROFIT_COMPANY:
    "NON_PROFIT_COMPANY",

  "CLOSE CORPORATION":
    "CLOSE_CORPORATION",

  CC:
    "CLOSE_CORPORATION",

  CLOSE_CORPORATION:
    "CLOSE_CORPORATION",

  "SOLE PROPRIETORSHIP":
    "SOLE_PROPRIETORSHIP",

  SOLE_PROPRIETORSHIP:
    "SOLE_PROPRIETORSHIP",

  PARTNERSHIP:
    "PARTNERSHIP",

  COOPERATIVE:
    "COOPERATIVE",

  "CO-OPERATIVE":
    "COOPERATIVE",

  "EXTERNAL COMPANY":
    "EXTERNAL_COMPANY",

  EXTERNAL_COMPANY:
    "EXTERNAL_COMPANY",

  "STATE OWNED COMPANY":
    "STATE_OWNED_COMPANY",

  "STATE-OWNED COMPANY":
    "STATE_OWNED_COMPANY",

  SOC:
    "STATE_OWNED_COMPANY",

  STATE_OWNED_COMPANY:
    "STATE_OWNED_COMPANY",

  "PERSONAL LIABILITY COMPANY":
    "PERSONAL_LIABILITY_COMPANY",

  PERSONAL_LIABILITY_COMPANY:
    "PERSONAL_LIABILITY_COMPANY",

  TRUST:
    "TRUST",

  OTHER:
    "OTHER",

  UNKNOWN:
    "UNKNOWN"
};

const ENTERPRISE_STATUS_MAP = {
  "IN BUSINESS":
    "IN_BUSINESS",

  "IN-BUSINESS":
    "IN_BUSINESS",

  IN_BUSINESS:
    "IN_BUSINESS",

  ACTIVE:
    "ACTIVE",

  DEREGISTERED:
    "DEREGISTERED",

  "DEREGISTRATION PROCESS":
    "DEREGISTRATION_PROCESS",

  "DEREGISTRATION IN PROCESS":
    "DEREGISTRATION_PROCESS",

  DEREGISTRATION_PROCESS:
    "DEREGISTRATION_PROCESS",

  LIQUIDATION:
    "LIQUIDATION",

  "IN LIQUIDATION":
    "LIQUIDATION",

  "BUSINESS RESCUE":
    "BUSINESS_RESCUE",

  "IN BUSINESS RESCUE":
    "BUSINESS_RESCUE",

  BUSINESS_RESCUE:
    "BUSINESS_RESCUE",

  "FINAL DEREGISTRATION":
    "FINAL_DEREGISTRATION",

  FINAL_DEREGISTRATION:
    "FINAL_DEREGISTRATION",

  OTHER:
    "OTHER",

  UNKNOWN:
    "UNKNOWN"
};

const IDENTIFICATION_TYPE_MAP = {
  "SOUTH AFRICAN ID":
    "SOUTH_AFRICAN_ID",

  "SOUTH AFRICAN ID NUMBER":
    "SOUTH_AFRICAN_ID",

  "SA ID":
    "SOUTH_AFRICAN_ID",

  "SA ID NUMBER":
    "SOUTH_AFRICAN_ID",

  SOUTH_AFRICAN_ID:
    "SOUTH_AFRICAN_ID",

  PASSPORT:
    "PASSPORT",

  "PASSPORT NUMBER":
    "PASSPORT",

  FOREIGN_ID:
    "FOREIGN_ID",

  "FOREIGN ID":
    "FOREIGN_ID",

  "FOREIGN ID NUMBER":
    "FOREIGN_ID",

  OTHER:
    "OTHER",

  UNKNOWN:
    "UNKNOWN"
};

const PROVINCE_MAP = {
  GAUTENG:
    "GAUTENG",

  LIMPOPO:
    "LIMPOPO",

  MPUMALANGA:
    "MPUMALANGA",

  "NORTH WEST":
    "NORTH_WEST",

  NORTH_WEST:
    "NORTH_WEST",

  "FREE STATE":
    "FREE_STATE",

  FREE_STATE:
    "FREE_STATE",

  "KWAZULU-NATAL":
    "KWAZULU_NATAL",

  "KWAZULU NATAL":
    "KWAZULU_NATAL",

  KZN:
    "KWAZULU_NATAL",

  KWAZULU_NATAL:
    "KWAZULU_NATAL",

  "EASTERN CAPE":
    "EASTERN_CAPE",

  EASTERN_CAPE:
    "EASTERN_CAPE",

  "WESTERN CAPE":
    "WESTERN_CAPE",

  WESTERN_CAPE:
    "WESTERN_CAPE",

  "NORTHERN CAPE":
    "NORTHERN_CAPE",

  NORTHERN_CAPE:
    "NORTHERN_CAPE"
};

const COUNTRY_MAP = {
  RSA:
    "SOUTH_AFRICA",

  ZA:
    "SOUTH_AFRICA",

  "SOUTH AFRICA":
    "SOUTH_AFRICA",

  SOUTH_AFRICA:
    "SOUTH_AFRICA"
};

const MONTH_MAP = {
  JANUARY: "JANUARY",
  FEBRUARY: "FEBRUARY",
  MARCH: "MARCH",
  APRIL: "APRIL",
  MAY: "MAY",
  JUNE: "JUNE",
  JULY: "JULY",
  AUGUST: "AUGUST",
  SEPTEMBER: "SEPTEMBER",
  OCTOBER: "OCTOBER",
  NOVEMBER: "NOVEMBER",
  DECEMBER: "DECEMBER"
};

function normalizeEnum(
  value,
  mapping
) {
  const normalized =
    normalizeUppercase(value);

  if (!normalized) {
    return null;
  }

  return (
    mapping[normalized] ??
    normalized.replace(
      /[\s./()-]+/g,
      "_"
    )
  );
}

function normalizeCountry(value) {
  const normalized =
    normalizeUppercase(value);

  if (!normalized) {
    return null;
  }

  return (
    COUNTRY_MAP[normalized] ??
    normalized.replace(
      /[\s-]+/g,
      "_"
    )
  );
}

function normalizeProvince(value) {
  return normalizeEnum(
    value,
    PROVINCE_MAP
  );
}

function normalizeRegistrationNumber(
  value
) {
  const normalized =
    normalizeText(value);

  if (!normalized) {
    return null;
  }

  const compact = normalized
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ")
    .trim();

  return compact || null;
}

function normalizeTaxNumber(value) {
  const digits =
    normalizeDigits(value);

  return digits || null;
}

function normalizePostalCode(value) {
  const digits =
    normalizeDigits(value);

  return digits || null;
}

function normalizeFinancialYearEnd(
  value
) {
  const normalized =
    normalizeUppercase(value);

  if (!normalized) {
    return null;
  }

  return (
    MONTH_MAP[normalized] ??
    normalized
  );
}

function normalizeCertificateTimestamp(
  value
) {
  if (!value) {
    return null;
  }

  const raw =
    String(value).trim();

  if (!raw) {
    return null;
  }

  /*
   * Already-normalised timestamp:
   *
   * 2019-11-28T18:36:00
   */
  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/
      .test(raw)
  ) {
    return raw;
  }

  /*
   * Timestamp with timezone suffix.
   *
   * The extraction contract stores local certificate time
   * without a timezone offset.
   */
  const isoMatch = raw.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:Z|[+-]\d{2}:\d{2})$/
  );

  if (isoMatch) {
    return `${isoMatch[1]}T${isoMatch[2]}`;
  }

  /*
   * Numeric formats:
   *
   * 28/11/2019 18:36
   * 28-11-2019 18:36:00
   */
  const numericMatch = raw.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s+(?:at\s+)?(\d{1,2}):(\d{2})(?::(\d{2}))?$/i
  );

  if (numericMatch) {
    const [
      ,
      day,
      month,
      year,
      hour,
      minute,
      second = "00"
    ] = numericMatch;

    return [
      String(year).padStart(4, "0"),
      String(month).padStart(2, "0"),
      String(day).padStart(2, "0")
    ].join("-") +
      "T" +
      [
        String(hour).padStart(2, "0"),
        String(minute).padStart(2, "0"),
        String(second).padStart(2, "0")
      ].join(":");
  }

  /*
   * Long English formats:
   *
   * Thursday, November 28, 2019 at 18:36
   * November 28, 2019 at 18:36
   */
  const longDateMatch = raw.match(
    /^(?:[A-Za-z]+,\s*)?([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\s+at\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/i
  );

  if (longDateMatch) {
    const [
      ,
      monthName,
      day,
      year,
      hour,
      minute,
      second = "00"
    ] = longDateMatch;

    const monthNames = {
      JANUARY: "01",
      FEBRUARY: "02",
      MARCH: "03",
      APRIL: "04",
      MAY: "05",
      JUNE: "06",
      JULY: "07",
      AUGUST: "08",
      SEPTEMBER: "09",
      OCTOBER: "10",
      NOVEMBER: "11",
      DECEMBER: "12"
    };

    const month =
      monthNames[
        monthName.toUpperCase()
      ];

    if (!month) {
      return null;
    }

    return [
      String(year).padStart(4, "0"),
      month,
      String(day).padStart(2, "0")
    ].join("-") +
      "T" +
      [
        String(hour).padStart(2, "0"),
        String(minute).padStart(2, "0"),
        String(second).padStart(2, "0")
      ].join(":");
  }

  return null;
}

function normalizeIdentificationNumber(
  value
) {
  const normalized =
    normalizeText(value);

  if (!normalized) {
    return null;
  }

  /*
   * South African identity numbers are digits only.
   * Passport and foreign identifiers may contain letters,
   * so preserve non-numeric identifiers as normalised text.
   */
  const digitsOnly =
    normalized.replace(/\s+/g, "");

  if (/^\d+$/.test(digitsOnly)) {
    return digitsOnly;
  }

  return normalized;
}

function normalizeRole(value) {
  const normalized =
    normalizeUppercase(value);

  if (!normalized) {
    return null;
  }

  return normalized
    .replace(/\s*,\s*/g, "_")
    .replace(/\s*\/\s*/g, "_")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function isPlainObject(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function normalizeAddress(
  value
) {
  if (!isPlainObject(value)) {
    return null;
  }

  const normalized = {
    address_line_1:
      normalizeText(
        value.address_line_1
      ),

    address_line_2:
      normalizeText(
        value.address_line_2
      ),

    suburb:
      normalizeText(
        value.suburb
      ),

    city:
      normalizeText(
        value.city
      ),

    province:
      normalizeProvince(
        value.province
      ),

    postal_code:
      normalizePostalCode(
        value.postal_code
      ),

    country:
      normalizeCountry(
        value.country
      ),

    full_address:
      normalizeText(
        value.full_address
      )
  };

  const hasAnyValue =
    Object.values(normalized)
      .some(Boolean);

  return hasAnyValue
    ? normalized
    : null;
}

function normalizeDirector(
  value
) {
  if (!isPlainObject(value)) {
    return null;
  }

  let identificationNumber =
    normalizeIdentificationNumber(
      value.identification_number
    );

  let identificationType =
    normalizeEnum(
      value.identification_type,
      IDENTIFICATION_TYPE_MAP
    );

  let dateOfBirth =
    normalizeDate(
      value.date_of_birth
    );

  /*
   * Defensive correction:
   *
   * Some CIPC documents use a shared column named:
   *
   * ID Number / Date of Birth
   *
   * If Gemini places a date in identification_number,
   * move it to date_of_birth.
   */
  if (
    identificationNumber &&
    /^\d{4}-\d{2}-\d{2}(?:\s+.*)?$/
      .test(identificationNumber)
  ) {
    dateOfBirth =
      normalizeDate(
        identificationNumber
      );

    identificationNumber = null;
    identificationType = null;
  }

  /*
   * Infer SOUTH_AFRICAN_ID only from the visible 13-digit shape.
   *
   * This is a format normalisation, not a checksum validation.
   */
  if (
    identificationNumber &&
    /^\d{13}$/.test(
      identificationNumber
    ) &&
    !identificationType
  ) {
    identificationType =
      "SOUTH_AFRICAN_ID";
  }

  const normalized = {
    full_name:
      normalizeText(
        value.full_name
      ),

    role:
      normalizeRole(
        value.role
      ),

    identification_number:
      identificationNumber,

    identification_type:
      identificationType,

    date_of_birth:
      dateOfBirth,

    appointment_date:
      normalizeDate(
        value.appointment_date
      ),

    postal_address:
      normalizeAddress(
        value.postal_address
      ),

    residential_address:
      normalizeAddress(
        value.residential_address
      )
  };

  const hasAnyValue =
    Object.values(normalized)
      .some(Boolean);

  return hasAnyValue
    ? normalized
    : null;
}

function normalizeDirectors(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeDirector)
    .filter(Boolean);
}

function normalizePageCount(value) {
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
  ) {
    return value;
  }

  const digits =
    normalizeDigits(value);

  if (!digits) {
    return null;
  }

  const parsed =
    Number.parseInt(
      digits,
      10
    );

  return Number.isInteger(parsed) &&
    parsed > 0
    ? parsed
    : null;
}

export function normalizeRegistrationCertificate(
  result = {}
) {
  const fields =
    isPlainObject(result)
      ? result
      : {};

  return {
    document_type:
      normalizeEnum(
        fields.document_type,
        DOCUMENT_TYPE_MAP
      ),

    document_subtype:
      normalizeEnum(
        fields.document_subtype,
        DOCUMENT_SUBTYPE_MAP
      ),

    document_title:
      normalizeText(
        fields.document_title
      ),

    issuing_authority:
      normalizeText(
        fields.issuing_authority
      ),

    country_of_registration:
      normalizeCountry(
        fields.country_of_registration
      ),

    certificate_issued_at:
      normalizeCertificateTimestamp(
        fields.certificate_issued_at
      ),

    registration_number:
      normalizeRegistrationNumber(
        fields.registration_number
      ),

    enterprise_name:
      normalizeText(
        fields.enterprise_name
      ),

    registration_date:
      normalizeDate(
        fields.registration_date
      ),

    business_start_date:
      normalizeDate(
        fields.business_start_date
      ),

    enterprise_type:
      normalizeEnum(
        fields.enterprise_type,
        ENTERPRISE_TYPE_MAP
      ),

    enterprise_type_description:
      normalizeText(
        fields.enterprise_type_description
      ),

    enterprise_status:
      normalizeEnum(
        fields.enterprise_status,
        ENTERPRISE_STATUS_MAP
      ),

    enterprise_status_description:
      normalizeText(
        fields.enterprise_status_description
      ),

    financial_year_end:
      normalizeFinancialYearEnd(
        fields.financial_year_end
      ),

    tax_number:
      normalizeTaxNumber(
        fields.tax_number
      ),

    postal_address:
      normalizeAddress(
        fields.postal_address
      ),

    registered_office_address:
      normalizeAddress(
        fields.registered_office_address
      ),

    directors:
      normalizeDirectors(
        fields.directors
      ),

    source_page_count:
      normalizePageCount(
        fields.source_page_count
      )
  };
}
