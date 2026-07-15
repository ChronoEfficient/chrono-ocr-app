function normalizeText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized || null;
}

function normalizeUppercase(value) {
  const normalized = normalizeText(value);

  return normalized ? normalized.toUpperCase() : null;
}

function normalizeIdNumber(value) {
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
    "NON CITIZEN": "NON_CITIZEN"
  };

  return citizenshipMap[normalized] || normalized;
}

function normalizeDate(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (isoDatePattern.test(normalized)) {
    return normalized;
  }

  const slashOrDashPattern =
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;

  const match = normalized.match(slashOrDashPattern);

  if (match) {
    const [, day, month, year] = match;

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return normalized;
}

export function normalizeIdDocument(extractedResult) {
  const fields = extractedResult?.fields || {};

  return {
    ...extractedResult,

    document_type_detected:
      normalizeUppercase(extractedResult?.document_type_detected),

    extraction_status:
      normalizeUppercase(extractedResult?.extraction_status) || "FAILED",

    fields: {
      surname: normalizeUppercase(fields.surname),

      given_names: normalizeUppercase(fields.given_names),

      gender: normalizeGender(fields.gender),

      nationality: normalizeCountry(fields.nationality),

      id_number: normalizeIdNumber(fields.id_number),

      date_of_birth: normalizeDate(fields.date_of_birth),

      country_of_birth: normalizeCountry(fields.country_of_birth),

      citizenship_status: normalizeCitizenshipStatus(
        fields.citizenship_status
      ),

      document_number: normalizeText(fields.document_number),

      date_of_issue: normalizeDate(fields.date_of_issue),

      date_of_expiry: normalizeDate(fields.date_of_expiry)
    },

    warnings: Array.isArray(extractedResult?.warnings)
      ? extractedResult.warnings
      : [],

    validation_issues: Array.isArray(
      extractedResult?.validation_issues
    )
      ? extractedResult.validation_issues
      : [],

    confidence: Number(extractedResult?.confidence || 0)
  };
}
