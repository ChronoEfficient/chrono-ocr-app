import {
  normalizeText,
  normalizeUppercase,
  normalizePersonName,
  normalizeDigits,
  normalizeDate
} from "../../../platform/normalization/base.normalizer.js";

function normalizeGender(value) {
  const normalized = normalizeUppercase(value);

  if (!normalized) {
    return null;
  }

  const genderMap = {
    M: "MALE",
    MALE: "MALE",
    MAN: "MALE",

    F: "FEMALE",
    FEMALE: "FEMALE",
    WOMAN: "FEMALE"
  };

  return genderMap[normalized] || normalized;
}

function normalizeCountry(value) {
  const normalized = normalizeUppercase(value);

  if (!normalized) {
    return null;
  }

  const countryMap = {
    RSA: "ZA",
    ZA: "ZA",
    ZAF: "ZA",
    "SOUTH AFRICA": "ZA",
    "REPUBLIC OF SOUTH AFRICA": "ZA"
  };

  return countryMap[normalized] || normalized;
}

function normalizeCitizenshipStatus(value) {
  const normalized = normalizeUppercase(value);

  if (!normalized) {
    return null;
  }

  const citizenshipMap = {
    CITIZEN: "CITIZEN",
    "SA CITIZEN": "CITIZEN",
    "SOUTH AFRICAN CITIZEN": "CITIZEN",

    PERMANENT_RESIDENT: "PERMANENT_RESIDENT",
    "PERMANENT RESIDENT": "PERMANENT_RESIDENT",

    NON_CITIZEN: "NON_CITIZEN",
    "NON CITIZEN": "NON_CITIZEN",
    NONCITIZEN: "NON_CITIZEN"
  };

  return citizenshipMap[normalized] || normalized;
}

export function normalizeIdDocument(fields = {}) {
  const source =
    fields &&
    typeof fields === "object" &&
    !Array.isArray(fields)
      ? fields
      : {};

  return {
    surname: normalizePersonName(source.surname),

    given_names: normalizePersonName(
      source.given_names
    ),

    gender: normalizeGender(source.gender),

    nationality: normalizeCountry(
      source.nationality
    ),

    id_number: normalizeDigits(
      source.id_number
    ),

    date_of_birth: normalizeDate(
      source.date_of_birth
    ),

    country_of_birth: normalizeCountry(
      source.country_of_birth
    ),

    citizenship_status:
      normalizeCitizenshipStatus(
        source.citizenship_status
      ),

    document_number: normalizeText(
      source.document_number
    ),

    date_of_issue: normalizeDate(
      source.date_of_issue
    ),

    date_of_expiry: normalizeDate(
      source.date_of_expiry
    )
  };
}
