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

export function validateIdDocument(result) {
  const issues = [];
  const idNumber = result?.fields?.id_number;

  if (!idNumber) {
    issues.push("ID number was not extracted.");
  } else if (!/^\d{13}$/.test(idNumber)) {
    issues.push("South African ID number must contain exactly 13 digits.");
  } else if (!passesLuhnCheck(idNumber)) {
    issues.push("South African ID number failed checksum validation.");
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
