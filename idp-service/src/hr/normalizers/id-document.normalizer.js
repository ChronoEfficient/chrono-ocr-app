// src/hr/normalizers/id-document.normalizer.js

function normalizeText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized || null;
}

function normalizeUppercase(value) {
  const normalized = normalizeText(value);

  return normalized
    ? normalized.toUpperCase()
    : null;
}

function normalizePersonName(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  return normalized
    .toLowerCase()
    .split(/\s+/)
    .map((word) =>
      word
        .split("-")
        .map((part) =>
          part
            .split("'")
            .map((piece) =>
              piece
                ? piece.charAt(0).toUpperCase() +
                  piece.slice(1)
                : piece
            )
            .join("'")
        )
        .join("-")
    )
    .join(" ");
}

function normalizeDigits(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const digits = String(value).replace(/\D/g, "");

  return digits || null;
}

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

function isValidDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function normalizeDate(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

  let match = normalized.match(isoDatePattern);

  if (match) {
    const [, year, month, day] = match;

    if (
      !isValidDate(
        Number(year),
        Number(month),
        Number(day)
      )
    ) {
      return null;
    }

    return normalized;
  }

  const slashOrDashPattern =
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;

  match = normalized.match(slashOrDashPattern);

  if (match) {
    const [, day, month, year] = match;

    if (
      !isValidDate(
        Number(year),
        Number(month),
        Number(day)
      )
    ) {
      return null;
    }

    return (
      `${year}-` +
      `${month.padStart(2, "0")}-` +
      `${day.padStart(2, "0")}`
    );
  }

  return null;
}

/**
 * Normalize canonical South African ID document fields.
 *
 * The processor passes only the extracted `fields` object into this function.
 * Extraction metadata such as confidence, status, warnings and detected type
 * remains the responsibility of document.processor.js.
 */
export function normalizeIdDocument(fields = {}) {
  const source =
    fields &&
    typeof fields === "object" &&
    !Array.isArray(fields)
      ? fields
      : {};

  return {
    surname: normalizePersonName(
      source.surname
    ),

    given_names: normalizePersonName(
      source.given_names
    ),

    gender: normalizeGender(
      source.gender
    ),

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
