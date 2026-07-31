import {
  normalizeText,
  normalizeUppercase,
  normalizeDigits,
  normalizeDate
} from "../../../platform/normalization/base.normalizer.js";

const DOCUMENT_TYPE_MAP = {
  "BANK STATEMENT": "BANK_STATEMENT",
  BANK_STATEMENT: "BANK_STATEMENT",

  "MUNICIPAL ACCOUNT": "MUNICIPAL_ACCOUNT",
  "MUNICIPAL STATEMENT": "MUNICIPAL_ACCOUNT",
  MUNICIPAL_ACCOUNT: "MUNICIPAL_ACCOUNT",

  "UTILITY BILL": "UTILITY_BILL",
  "ELECTRICITY BILL": "UTILITY_BILL",
  "WATER BILL": "UTILITY_BILL",
  UTILITY_BILL: "UTILITY_BILL",

  "CELLPHONE STATEMENT": "CELLPHONE_STATEMENT",
  "MOBILE STATEMENT": "CELLPHONE_STATEMENT",
  "TELEPHONE ACCOUNT": "CELLPHONE_STATEMENT",
  CELLPHONE_STATEMENT: "CELLPHONE_STATEMENT",

  "LEASE AGREEMENT": "LEASE_AGREEMENT",
  "RENTAL AGREEMENT": "LEASE_AGREEMENT",
  LEASE_AGREEMENT: "LEASE_AGREEMENT",

  "INSURANCE DOCUMENT": "INSURANCE_DOCUMENT",
  "INSURANCE POLICY": "INSURANCE_DOCUMENT",
  "INSURANCE STATEMENT": "INSURANCE_DOCUMENT",
  INSURANCE_DOCUMENT: "INSURANCE_DOCUMENT",

  "GOVERNMENT CORRESPONDENCE":
    "GOVERNMENT_CORRESPONDENCE",
  "GOVERNMENT LETTER":
    "GOVERNMENT_CORRESPONDENCE",
  GOVERNMENT_CORRESPONDENCE:
    "GOVERNMENT_CORRESPONDENCE",

  "MEDICAL AID STATEMENT":
    "MEDICAL_AID_STATEMENT",
  "MEDICAL AID DOCUMENT":
    "MEDICAL_AID_STATEMENT",
  MEDICAL_AID_STATEMENT:
    "MEDICAL_AID_STATEMENT",

  "SCHOOL CORRESPONDENCE":
    "SCHOOL_CORRESPONDENCE",
  "SCHOOL LETTER":
    "SCHOOL_CORRESPONDENCE",
  SCHOOL_CORRESPONDENCE:
    "SCHOOL_CORRESPONDENCE",

  "UNIVERSITY CORRESPONDENCE":
    "UNIVERSITY_CORRESPONDENCE",
  "UNIVERSITY LETTER":
    "UNIVERSITY_CORRESPONDENCE",
  UNIVERSITY_CORRESPONDENCE:
    "UNIVERSITY_CORRESPONDENCE",

  "EMPLOYER CORRESPONDENCE":
    "EMPLOYER_CORRESPONDENCE",
  "EMPLOYER LETTER":
    "EMPLOYER_CORRESPONDENCE",
  EMPLOYER_CORRESPONDENCE:
    "EMPLOYER_CORRESPONDENCE",

  INVOICE: "INVOICE",

  "ACCOUNT STATEMENT": "ACCOUNT_STATEMENT",
  ACCOUNT_STATEMENT: "ACCOUNT_STATEMENT",

  OTHER: "OTHER",
  UNKNOWN: "UNKNOWN"
};

const ADDRESS_TYPE_MAP = {
  RESIDENTIAL: "RESIDENTIAL",
  "RESIDENTIAL ADDRESS": "RESIDENTIAL",

  PHYSICAL: "PHYSICAL",
  "PHYSICAL ADDRESS": "PHYSICAL",

  POSTAL: "POSTAL",
  "POSTAL ADDRESS": "POSTAL",

  BUSINESS: "BUSINESS",
  "BUSINESS ADDRESS": "BUSINESS",

  REGISTERED: "REGISTERED",
  "REGISTERED ADDRESS": "REGISTERED",

  OTHER: "OTHER",
  UNKNOWN: "UNKNOWN"
};

const PROVINCE_MAP = {
  GAUTENG: "GAUTENG",
  LIMPOPO: "LIMPOPO",
  MPUMALANGA: "MPUMALANGA",

  "NORTH WEST": "NORTH_WEST",
  NORTH_WEST: "NORTH_WEST",

  "FREE STATE": "FREE_STATE",
  FREE_STATE: "FREE_STATE",

  "KWAZULU-NATAL": "KWAZULU_NATAL",
  "KWAZULU NATAL": "KWAZULU_NATAL",
  KZN: "KWAZULU_NATAL",
  KWAZULU_NATAL: "KWAZULU_NATAL",

  "EASTERN CAPE": "EASTERN_CAPE",
  EASTERN_CAPE: "EASTERN_CAPE",

  "WESTERN CAPE": "WESTERN_CAPE",
  WESTERN_CAPE: "WESTERN_CAPE",

  "NORTHERN CAPE": "NORTHERN_CAPE",
  NORTHERN_CAPE: "NORTHERN_CAPE"
};

function normalizeEnum(value, mapping) {
  const normalized = normalizeUppercase(value);

  if (!normalized) {
    return null;
  }

  return (
    mapping[normalized] ??
    normalized.replace(/[\s-]+/g, "_")
  );
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value
      .trim()
      .toLowerCase();

    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return false;
}

function normalizeCountry(value) {
  const normalized = normalizeUppercase(value);

  if (!normalized) {
    return null;
  }

  const countries = {
    RSA: "SOUTH_AFRICA",
    ZA: "SOUTH_AFRICA",
    "SOUTH AFRICA": "SOUTH_AFRICA",
    SOUTH_AFRICA: "SOUTH_AFRICA"
  };

  return countries[normalized] ?? normalized;
}

function normalizePostalCode(value) {
  const digits = normalizeDigits(value);

  return digits || null;
}

export function normalizeProofOfAddress(
  result = {}
) {
  const fields =
    result &&
    typeof result === "object" &&
    !Array.isArray(result)
      ? result
      : {};

  return {
    document_type:
      normalizeEnum(
        fields.document_type,
        DOCUMENT_TYPE_MAP
      ),

    document_type_description:
      normalizeText(
        fields.document_type_description
      ),

    contains_address:
      normalizeBoolean(
        fields.contains_address
      ),

    issuer_name:
      normalizeText(fields.issuer_name),

    recipient_name:
      normalizeText(fields.recipient_name),

    address_type:
      normalizeEnum(
        fields.address_type,
        ADDRESS_TYPE_MAP
      ),

    address_line_1:
      normalizeText(fields.address_line_1),

    address_line_2:
      normalizeText(fields.address_line_2),

    suburb:
      normalizeText(fields.suburb),

    city:
      normalizeText(fields.city),

    province:
      normalizeEnum(
        fields.province,
        PROVINCE_MAP
      ),

    postal_code:
      normalizePostalCode(
        fields.postal_code
      ),

    country:
      normalizeCountry(fields.country),

    date_issued:
      normalizeDate(fields.date_issued),

    reference_number:
      normalizeText(
        fields.reference_number
      )
  };
}
