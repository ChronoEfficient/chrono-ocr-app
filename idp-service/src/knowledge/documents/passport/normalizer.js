import {
  normalizeText,
  normalizeUppercase,
  normalizePersonName,
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
    WOMAN: "FEMALE",

    X: "UNSPECIFIED",
    U: "UNSPECIFIED",
    UNSPECIFIED: "UNSPECIFIED",
    UNKNOWN: "UNSPECIFIED"
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

function normalizeDocumentCode(value) {
  const normalized = normalizeUppercase(value);

  if (!normalized) {
    return null;
  }

  return normalized
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9<]/g, "");
}

function normalizePassportNumber(value) {
  const normalized = normalizeUppercase(value);

  if (!normalized) {
    return null;
  }

  return normalized.replace(/[^A-Z0-9]/g, "");
}

function normalizeMrzLine(value) {
  const normalized = normalizeUppercase(value);

  if (!normalized) {
    return null;
  }

  return normalized
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9<]/g, "");
}

export function normalizePassportDocument(fields = {}) {
  const source =
    fields &&
    typeof fields === "object" &&
    !Array.isArray(fields)
      ? fields
      : {};

  return {
    document_code: normalizeDocumentCode(
      source.document_code
    ),

    issuing_country: normalizeCountry(
      source.issuing_country
    ),

    surname: normalizePersonName(
      source.surname
    ),

    given_names: normalizePersonName(
      source.given_names
    ),

    nationality: normalizeCountry(
      source.nationality
    ),

    passport_number: normalizePassportNumber(
      source.passport_number
    ),

    date_of_birth: normalizeDate(
      source.date_of_birth
    ),

    gender: normalizeGender(
      source.gender
    ),

    place_of_birth: normalizeText(
      source.place_of_birth
    ),

    date_of_issue: normalizeDate(
      source.date_of_issue
    ),

    date_of_expiry: normalizeDate(
      source.date_of_expiry
    ),

    issuing_authority: normalizeText(
      source.issuing_authority
    ),

    personal_number: normalizePassportNumber(
      source.personal_number
    ),

    mrz_line_1: normalizeMrzLine(
      source.mrz_line_1
    ),

    mrz_line_2: normalizeMrzLine(
      source.mrz_line_2
    )
  };
}
