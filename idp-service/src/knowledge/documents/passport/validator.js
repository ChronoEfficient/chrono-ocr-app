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

function compareIsoDates(left, right) {
  return left.localeCompare(right);
}

function mrzCharacterValue(character) {
  if (character === "<") {
    return 0;
  }

  if (/^\d$/.test(character)) {
    return Number(character);
  }

  if (/^[A-Z]$/.test(character)) {
    return character.charCodeAt(0) - 55;
  }

  return null;
}

function calculateMrzCheckDigit(value) {
  const weights = [7, 3, 1];
  let total = 0;

  for (let index = 0; index < value.length; index += 1) {
    const characterValue = mrzCharacterValue(value[index]);

    if (characterValue === null) {
      return null;
    }

    total += characterValue * weights[index % weights.length];
  }

  return String(total % 10);
}

function parseMrzDate(value, kind) {
  if (!/^\d{6}$/.test(value)) {
    return null;
  }

  const yearPart = Number(value.slice(0, 2));
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));
  const currentYear = new Date().getUTCFullYear();

  let year;

  if (kind === "birth") {
    const currentCentury = Math.floor(currentYear / 100) * 100;
    year = currentCentury + yearPart;

    if (year > currentYear) {
      year -= 100;
    }
  } else {
    const currentCentury = Math.floor(currentYear / 100) * 100;
    year = currentCentury + yearPart;

    if (year < currentYear - 20) {
      year += 100;
    }
  }

  const isoDate = [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0")
  ].join("-");

  return isValidIsoDate(isoDate)
    ? isoDate
    : null;
}

function validateMrz(fields, issues, derivedData) {
  const line1 = fields.mrz_line_1;
  const line2 = fields.mrz_line_2;

  if (!line1 && !line2) {
    return;
  }

  if (!line1 || !line2) {
    issues.push({
      code: "INCOMPLETE_MRZ",
      field: !line1 ? "mrz_line_1" : "mrz_line_2"
    });
    return;
  }

  if (line1.length !== 44) {
    issues.push({
      code: "INVALID_MRZ_LINE_1_LENGTH",
      field: "mrz_line_1",
      expected: 44,
      actual: line1.length
    });
  }

  if (line2.length !== 44) {
    issues.push({
      code: "INVALID_MRZ_LINE_2_LENGTH",
      field: "mrz_line_2",
      expected: 44,
      actual: line2.length
    });
    return;
  }

  const mrzPassportNumber = line2.slice(0, 9).replace(/<+$/g, "");
  const passportCheckDigit = line2[9];
  const nationality = line2.slice(10, 13);
  const birthDateRaw = line2.slice(13, 19);
  const birthDateCheckDigit = line2[19];
  const gender = line2[20];
  const expiryDateRaw = line2.slice(21, 27);
  const expiryDateCheckDigit = line2[27];

  derivedData.mrz = {
    passport_number: mrzPassportNumber || null,
    nationality: nationality || null,
    date_of_birth: parseMrzDate(birthDateRaw, "birth"),
    gender:
      gender === "M"
        ? "MALE"
        : gender === "F"
          ? "FEMALE"
          : gender === "<"
            ? "UNSPECIFIED"
            : null,
    date_of_expiry: parseMrzDate(expiryDateRaw, "expiry")
  };

  const expectedPassportCheckDigit =
    calculateMrzCheckDigit(line2.slice(0, 9));

  if (
    expectedPassportCheckDigit !== null &&
    passportCheckDigit !== expectedPassportCheckDigit
  ) {
    issues.push({
      code: "INVALID_PASSPORT_NUMBER_CHECK_DIGIT",
      field: "mrz_line_2",
      expected: expectedPassportCheckDigit,
      actual: passportCheckDigit
    });
  }

  const expectedBirthDateCheckDigit =
    calculateMrzCheckDigit(birthDateRaw);

  if (
    expectedBirthDateCheckDigit !== null &&
    birthDateCheckDigit !== expectedBirthDateCheckDigit
  ) {
    issues.push({
      code: "INVALID_DATE_OF_BIRTH_CHECK_DIGIT",
      field: "mrz_line_2",
      expected: expectedBirthDateCheckDigit,
      actual: birthDateCheckDigit
    });
  }

  const expectedExpiryDateCheckDigit =
    calculateMrzCheckDigit(expiryDateRaw);

  if (
    expectedExpiryDateCheckDigit !== null &&
    expiryDateCheckDigit !== expectedExpiryDateCheckDigit
  ) {
    issues.push({
      code: "INVALID_DATE_OF_EXPIRY_CHECK_DIGIT",
      field: "mrz_line_2",
      expected: expectedExpiryDateCheckDigit,
      actual: expiryDateCheckDigit
    });
  }

  if (
    fields.passport_number &&
    mrzPassportNumber &&
    fields.passport_number !== mrzPassportNumber
  ) {
    issues.push({
      code: "PASSPORT_NUMBER_MRZ_MISMATCH",
      field: "passport_number",
      expected: mrzPassportNumber,
      actual: fields.passport_number
    });
  }

  if (
    fields.date_of_birth &&
    derivedData.mrz.date_of_birth &&
    fields.date_of_birth !== derivedData.mrz.date_of_birth
  ) {
    issues.push({
      code: "DATE_OF_BIRTH_MRZ_MISMATCH",
      field: "date_of_birth",
      expected: derivedData.mrz.date_of_birth,
      actual: fields.date_of_birth
    });
  }

  if (
    fields.date_of_expiry &&
    derivedData.mrz.date_of_expiry &&
    fields.date_of_expiry !== derivedData.mrz.date_of_expiry
  ) {
    issues.push({
      code: "DATE_OF_EXPIRY_MRZ_MISMATCH",
      field: "date_of_expiry",
      expected: derivedData.mrz.date_of_expiry,
      actual: fields.date_of_expiry
    });
  }

  if (
    fields.gender &&
    derivedData.mrz.gender &&
    fields.gender !== derivedData.mrz.gender
  ) {
    issues.push({
      code: "GENDER_MRZ_MISMATCH",
      field: "gender",
      expected: derivedData.mrz.gender,
      actual: fields.gender
    });
  }
}

export function validatePassportDocument(result = {}) {
  const issues = [];

  const fields =
    result &&
    typeof result === "object" &&
    !Array.isArray(result)
      ? result
      : {};

  const derivedData = {};

  if (!fields.passport_number) {
    issues.push({
      code: "MISSING_PASSPORT_NUMBER",
      field: "passport_number"
    });
  } else if (!/^[A-Z0-9]{6,12}$/.test(fields.passport_number)) {
    issues.push({
      code: "INVALID_PASSPORT_NUMBER_FORMAT",
      field: "passport_number",
      actual: fields.passport_number
    });
  }

  if (!fields.surname) {
    issues.push({
      code: "MISSING_SURNAME",
      field: "surname"
    });
  }

  if (!fields.given_names) {
    issues.push({
      code: "MISSING_GIVEN_NAMES",
      field: "given_names"
    });
  }

  if (!fields.nationality) {
    issues.push({
      code: "MISSING_NATIONALITY",
      field: "nationality"
    });
  }

  if (!fields.gender) {
    issues.push({
      code: "MISSING_GENDER",
      field: "gender"
    });
  } else if (
    !["MALE", "FEMALE", "UNSPECIFIED"].includes(fields.gender)
  ) {
    issues.push({
      code: "UNKNOWN_GENDER",
      field: "gender",
      actual: fields.gender
    });
  }

  if (!fields.date_of_birth) {
    issues.push({
      code: "MISSING_DATE_OF_BIRTH",
      field: "date_of_birth"
    });
  } else if (!isValidIsoDate(fields.date_of_birth)) {
    issues.push({
      code: "INVALID_DATE_OF_BIRTH",
      field: "date_of_birth",
      actual: fields.date_of_birth
    });
  }

  if (
    fields.date_of_issue &&
    !isValidIsoDate(fields.date_of_issue)
  ) {
    issues.push({
      code: "INVALID_DATE_OF_ISSUE",
      field: "date_of_issue",
      actual: fields.date_of_issue
    });
  }

  if (!fields.date_of_expiry) {
    issues.push({
      code: "MISSING_DATE_OF_EXPIRY",
      field: "date_of_expiry"
    });
  } else if (!isValidIsoDate(fields.date_of_expiry)) {
    issues.push({
      code: "INVALID_DATE_OF_EXPIRY",
      field: "date_of_expiry",
      actual: fields.date_of_expiry
    });
  }

  if (
    fields.date_of_issue &&
    fields.date_of_expiry &&
    isValidIsoDate(fields.date_of_issue) &&
    isValidIsoDate(fields.date_of_expiry) &&
    compareIsoDates(
      fields.date_of_expiry,
      fields.date_of_issue
    ) <= 0
  ) {
    issues.push({
      code: "EXPIRY_NOT_AFTER_ISSUE",
      field: "date_of_expiry",
      expected:
        "A date later than date_of_issue",
      actual: fields.date_of_expiry
    });
  }

  if (
    fields.date_of_birth &&
    fields.date_of_issue &&
    isValidIsoDate(fields.date_of_birth) &&
    isValidIsoDate(fields.date_of_issue) &&
    compareIsoDates(
      fields.date_of_issue,
      fields.date_of_birth
    ) <= 0
  ) {
    issues.push({
      code: "ISSUE_NOT_AFTER_BIRTH",
      field: "date_of_issue",
      expected:
        "A date later than date_of_birth",
      actual: fields.date_of_issue
    });
  }

  if (
    fields.document_code &&
    !/^P[A-Z0-9<]?$/.test(fields.document_code)
  ) {
    issues.push({
      code: "INVALID_DOCUMENT_CODE",
      field: "document_code",
      actual: fields.document_code
    });
  }

  validateMrz(
    fields,
    issues,
    derivedData
  );

  return {
    valid: issues.length === 0,
    issues,
    derivedData
  };
}
