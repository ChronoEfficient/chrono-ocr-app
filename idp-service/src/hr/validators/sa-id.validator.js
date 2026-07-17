function passesLuhnCheck(value) {
  let sum = 0;
  let alternate = false;

  for (let index = value.length - 1; index >= 0; index -= 1) {
    let digit = Number(value[index]);

    if (alternate) {
      digit *= 2;

      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

function isValidDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function deriveDateOfBirth(idNumber) {
  const yearPart = Number(idNumber.slice(0, 2));
  const month = Number(idNumber.slice(2, 4));
  const day = Number(idNumber.slice(4, 6));

  const currentYear = new Date().getUTCFullYear();
  const currentCentury = Math.floor(currentYear / 100) * 100;

  let year = currentCentury + yearPart;

  if (year > currentYear) {
    year -= 100;
  }

  if (!isValidDate(year, month, day)) {
    return null;
  }

  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0")
  ].join("-");
}

function deriveGender(idNumber) {
  const genderSequence = Number(idNumber.slice(6, 10));

  return genderSequence >= 5000
    ? "MALE"
    : "FEMALE";
}

function deriveCitizenshipStatus(idNumber) {
  const citizenshipDigit = idNumber[10];

  if (citizenshipDigit === "0") {
    return "CITIZEN";
  }

  if (citizenshipDigit === "1") {
    return "PERMANENT_RESIDENT";
  }

  return null;
}

export function validateIdDocument(result = {}) {
  const issues = [];

  const fields =
    result &&
    typeof result === "object" &&
    !Array.isArray(result)
      ? result
      : {};

  const idNumber = fields.id_number;

  if (!idNumber) {
    return {
      valid: false,
      issues: ["ID number was not extracted."],
      derivedData: {}
    };
  }

  if (!/^\d{13}$/.test(idNumber)) {
    return {
      valid: false,
      issues: [
        "South African ID number must contain exactly 13 digits."
      ],
      derivedData: {}
    };
  }

  const derivedDateOfBirth = deriveDateOfBirth(idNumber);
  const derivedGender = deriveGender(idNumber);
  const derivedCitizenshipStatus =
    deriveCitizenshipStatus(idNumber);

  if (!derivedDateOfBirth) {
    issues.push(
      "The date encoded in the South African ID number is invalid."
    );
  }

  if (
    derivedDateOfBirth &&
    fields.date_of_birth &&
    fields.date_of_birth !== derivedDateOfBirth
  ) {
    issues.push(
      `Extracted date of birth '${fields.date_of_birth}' does not match ` +
      `the ID-number date '${derivedDateOfBirth}'.`
    );
  }

  if (
    fields.gender &&
    fields.gender !== derivedGender
  ) {
    issues.push(
      `Extracted gender '${fields.gender}' does not match ` +
      `the ID-number gender '${derivedGender}'.`
    );
  }

  if (!derivedCitizenshipStatus) {
    issues.push(
      "The citizenship digit in the South African ID number is invalid."
    );
  } else if (
    fields.citizenship_status &&
    fields.citizenship_status !== derivedCitizenshipStatus
  ) {
    issues.push(
      `Extracted citizenship status '${fields.citizenship_status}' ` +
      `does not match the ID-number status '${derivedCitizenshipStatus}'.`
    );
  }

  if (!passesLuhnCheck(idNumber)) {
    issues.push(
      "South African ID number failed checksum validation."
    );
  }

  return {
    valid: issues.length === 0,
    issues,
    derivedData: {
      date_of_birth: derivedDateOfBirth,
      gender: derivedGender,
      citizenship_status: derivedCitizenshipStatus
    }
  };
}
