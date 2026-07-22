const KNOWN_BANKS = new Set([
  "FNB",
  "STANDARD_BANK",
  "ABSA",
  "NEDBANK",
  "CAPITEC",
  "TYMEBANK",
  "DISCOVERY_BANK",
  "BIDVEST_BANK"
]);

const KNOWN_ACCOUNT_TYPES = new Set([
  "CURRENT",
  "SAVINGS",
  "TRANSMISSION",
  "BUSINESS"
]);

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

export function validateBankConfirmation(
  result = {}
) {
  const issues = [];

  const fields =
    result &&
    typeof result === "object" &&
    !Array.isArray(result)
      ? result
      : {};

  if (!fields.bank_name) {
    issues.push({
      code: "MISSING_BANK_NAME",
      field: "bank_name"
    });
  } else if (!KNOWN_BANKS.has(fields.bank_name)) {
    issues.push({
      code: "UNKNOWN_BANK",
      field: "bank_name",
      actual: fields.bank_name
    });
  }

  if (!fields.account_holder) {
    issues.push({
      code: "MISSING_ACCOUNT_HOLDER",
      field: "account_holder"
    });
  }

  if (!fields.account_number) {
    issues.push({
      code: "MISSING_ACCOUNT_NUMBER",
      field: "account_number"
    });
  } else if (!/^\d+$/.test(fields.account_number)) {
    issues.push({
      code: "INVALID_ACCOUNT_NUMBER_FORMAT",
      field: "account_number",
      actual: fields.account_number
    });
  }

  if (!fields.branch_code) {
    issues.push({
      code: "MISSING_BRANCH_CODE",
      field: "branch_code"
    });
  } else if (!/^\d+$/.test(fields.branch_code)) {
    issues.push({
      code: "INVALID_BRANCH_CODE",
      field: "branch_code",
      actual: fields.branch_code
    });
  }

  if (
    fields.account_type &&
    !KNOWN_ACCOUNT_TYPES.has(fields.account_type)
  ) {
    issues.push({
      code: "UNKNOWN_ACCOUNT_TYPE",
      field: "account_type",
      actual: fields.account_type
    });
  }

  if (
    fields.swift_code &&
    !/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(
      fields.swift_code
    )
  ) {
    issues.push({
      code: "INVALID_SWIFT_CODE",
      field: "swift_code",
      actual: fields.swift_code
    });
  }

  if (
    fields.date_issued &&
    !isValidIsoDate(fields.date_issued)
  ) {
    issues.push({
      code: "INVALID_DATE_ISSUED",
      field: "date_issued",
      actual: fields.date_issued
    });
  }

  return {
    valid: issues.length === 0,
    issues,
    derivedData: {}
  };
}
