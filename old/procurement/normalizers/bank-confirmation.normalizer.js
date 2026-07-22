import {
  normalizeUppercase,
  normalizePersonName,
  normalizeDigits,
  normalizeDate
} from "../../engine/normalizers/base.normalizer.js";

function normalizeBankName(value) {
  const normalized = normalizeUppercase(value);

  if (!normalized) {
    return null;
  }

  const bankMap = {
    "FIRST NATIONAL BANK": "FNB",
    FNB: "FNB",

    "STANDARD BANK": "STANDARD_BANK",
    "STANDARD BANK OF SOUTH AFRICA":
      "STANDARD_BANK",

    ABSA: "ABSA",
    "ABSA BANK": "ABSA",

    NEDBANK: "NEDBANK",
    "NEDBANK LIMITED": "NEDBANK",

    CAPITEC: "CAPITEC",
    "CAPITEC BANK": "CAPITEC",

    TYMEBANK: "TYMEBANK",

    "DISCOVERY BANK":
      "DISCOVERY_BANK",

    "BIDVEST BANK":
      "BIDVEST_BANK"
  };

  return bankMap[normalized] || normalized;
}

function normalizeAccountType(value) {
  const normalized = normalizeUppercase(value);

  if (!normalized) {
    return null;
  }

  const accountTypeMap = {
    CHEQUE: "CURRENT",
    CHECK: "CURRENT",
    CURRENT: "CURRENT",
    "CURRENT ACCOUNT": "CURRENT",

    SAVINGS: "SAVINGS",
    "SAVINGS ACCOUNT": "SAVINGS",

    TRANSMISSION: "TRANSMISSION",

    BUSINESS: "BUSINESS",
    "BUSINESS ACCOUNT": "BUSINESS"
  };

  return (
    accountTypeMap[normalized] ||
    normalized
  );
}

export function normalizeBankConfirmation(
  fields = {}
) {
  const source =
    fields &&
    typeof fields === "object" &&
    !Array.isArray(fields)
      ? fields
      : {};

  return {
    bank_name: normalizeBankName(
      source.bank_name
    ),

    branch_code: normalizeDigits(
      source.branch_code
    ),

    account_holder:
      normalizePersonName(
        source.account_holder
      ),

    account_number: normalizeDigits(
      source.account_number
    ),

    account_type:
      normalizeAccountType(
        source.account_type
      ),

    swift_code: normalizeUppercase(
      source.swift_code
    ),

    date_issued: normalizeDate(
      source.date_issued
    )
  };
}
