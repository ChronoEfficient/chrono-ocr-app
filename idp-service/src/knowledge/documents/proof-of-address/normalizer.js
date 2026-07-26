import {
  normalizeText,
  normalizeUppercase,
  normalizeDigits,
  normalizeDate
} from "../../../platform/normalization/base.normalizer.js";

const ADDRESS_TYPE_MAP = {
  RESIDENTIAL: "RESIDENTIAL",
  "RESIDENTIAL ADDRESS": "RESIDENTIAL",
  "HOME ADDRESS": "RESIDENTIAL",

  PHYSICAL: "PHYSICAL",
  "PHYSICAL ADDRESS": "PHYSICAL",
  "SERVICE ADDRESS": "PHYSICAL",
  "SUPPLY ADDRESS": "PHYSICAL",
  "INSTALLATION ADDRESS": "PHYSICAL",
  "PREMISES ADDRESS": "PHYSICAL",
  "PREMISE ADDRESS": "PHYSICAL",
  "PROPERTY ADDRESS": "PHYSICAL",
  "SITE ADDRESS": "PHYSICAL",
  "STAND ADDRESS": "PHYSICAL",
  "ERF ADDRESS": "PHYSICAL",
  "PLOT ADDRESS": "PHYSICAL",
  "FARM ADDRESS": "PHYSICAL",
  "METER LOCATION": "PHYSICAL",

  POSTAL: "POSTAL",
  "POSTAL ADDRESS": "POSTAL",
  "MAILING ADDRESS": "POSTAL",
  "CORRESPONDENCE ADDRESS": "POSTAL",

  BUSINESS: "BUSINESS",
  "BUSINESS ADDRESS": "BUSINESS",
  "OFFICE ADDRESS": "BUSINESS",

  REGISTERED: "REGISTERED",
  "REGISTERED ADDRESS": "REGISTERED",
  "REGISTERED OFFICE": "REGISTERED",

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

const COUNTRY_MAP = {
  RSA: "SOUTH_AFRICA",
  ZA: "SOUTH_AFRICA",
  ZAF: "SOUTH_AFRICA",
  "SOUTH AFRICA": "SOUTH_AFRICA",
  "REPUBLIC OF SOUTH AFRICA":
    "SOUTH_AFRICA",
  SOUTH_AFRICA: "SOUTH_AFRICA"
};

function normalizeEnum(value, mapping) {
  const normalized =
    normalizeUppercase(value);

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

  if (value === 1) {
    return true;
  }

  if (value === 0) {
    return false;
  }

  return false;
}

function normalizeCountry(value) {
  return normalizeEnum(
    value,
    COUNTRY_MAP
  );
}

function normalizePostalCode(value) {
  const digits =
    normalizeDigits(value);

  return digits || null;
}

export function normalizeProofOfAddress(
  fields = {}
) {
  const source =
    fields &&
    typeof fields === "object" &&
    !Array.isArray(fields)
      ? fields
      : {};

  return {
    document_type_description:
      normalizeText(
        source.document_type_description
      ),

    contains_address:
      normalizeBoolean(
        source.contains_address
      ),

    issuer_name:
      normalizeText(
        source.issuer_name
      ),

    /*
     * The recipient may be either a person or an organisation.
     * normalizeText is therefore used instead of a person-name
     * normalizer.
     */
    recipient_name:
      normalizeText(
        source.recipient_name
      ),

    address_type:
      normalizeEnum(
        source.address_type,
        ADDRESS_TYPE_MAP
      ),

    /*
     * Address lines remain contextual text so that stand, erf,
     * plot, unit, farm, building, complex and street information
     * is preserved together.
     */
    address_line_1:
      normalizeText(
        source.address_line_1
      ),

    address_line_2:
      normalizeText(
        source.address_line_2
      ),

    suburb:
      normalizeText(
        source.suburb
      ),

    city:
      normalizeText(
        source.city
      ),

    province:
      normalizeEnum(
        source.province,
        PROVINCE_MAP
      ),

    postal_code:
      normalizePostalCode(
        source.postal_code
      ),

    country:
      normalizeCountry(
        source.country
      ),

    date_issued:
      normalizeDate(
        source.date_issued
      ),

    reference_number:
      normalizeText(
        source.reference_number
      )
  };
}
