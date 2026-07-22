import {
  normalizeText,
  normalizeUppercase,
  normalizePersonName,
  normalizeDigits,
  normalizeDate
} from "../../../platform/normalization/base.normalizer.js";

const BANK_NAME_MAP = {
  FNB: "FNB",
  "FNB BANK": "FNB",
  "FIRST NATIONAL BANK": "FNB",
  "FIRST NATIONAL BANK SOUTH AFRICA": "FNB",

  "STANDARD BANK": "STANDARD_BANK",
  "STANDARD BANK SOUTH AFRICA":
    "STANDARD_BANK",
  "THE STANDARD BANK OF SOUTH AFRICA":
    "STANDARD_BANK",
  "THE STANDARD BANK OF SOUTH AFRICA LIMITED":
    "STANDARD_BANK",

  ABSA: "ABSA",
  "ABSA BANK": "ABSA",
  "ABSA BANK LIMITED": "ABSA",

  NEDBANK: "NEDBANK",
  "NEDBANK LIMITED": "NEDBANK",

  CAPITEC: "CAPITEC",
  "CAPITEC BANK": "CAPITEC",
  "CAPITEC BANK LIMITED": "CAPITEC",

  TYMEBANK: "TYMEBANK",
  "TYME BANK": "TYMEBANK",
  "TYMEBANK LIMITED": "TYMEBANK",

  "DISCOVERY BANK": "DISCOVERY_BANK",
  "DISCOVERY BANK LIMITED": "DISCOVERY_BANK",

  "BIDVEST BANK": "BIDVEST_BANK",
  "BIDVEST BANK LIMITED": "BIDVEST_BANK"
};

const ACCOUNT_TYPE_MAP = {
  CURRENT: "CURRENT",
  "CURRENT ACCOUNT": "CURRENT",

  CHEQUE: "CURRENT",
  "CHEQUE ACCOUNT": "CURRENT",

  SAVINGS: "SAVINGS",
  "SAVINGS ACCOUNT": "SAVINGS",

  TRANSMISSION: "TRANSMISSION",
  "TRANSMISSION ACCOUNT": "TRANSMISSION",

  BUSINESS: "BUSINESS",
  "BUSINESS ACCOUNT": "BUSINESS"
};

function normalizeBankName(value) {
  const normalized = normalizeUppercase(value);

  if (!normalized) {
    return null;
  }

  return BANK_NAME_MAP[normalized] ?? normalized;
}

function normalizeAccountType(value) {
  const normalized = normalizeUppercase(value);

  /*
   * Account type is optional.
   * Do not infer a value when it is missing.
   */
  if (!normalized) {
    return null;
  }

  return (
    ACCOUNT_TYPE_MAP[normalized] ??
    normalized
  );
}

function normalizeSwiftCode(value) {
  const normalized = normalizeUppercase(value);

  if (!normalized) {
    return null;
  }

  return normalized.replace(/\s+/g, "");
}

export function normalizeBankConfirmation(
  result = {}
) {
  const fields =
    result &&
    typeof result === "object" &&
    !Array.isArray(result)
      ? result
      : {};

  return {
    bank_name:
      normalizeBankName(fields.bank_name),

    branch_code:
      normalizeDigits(fields.branch_code),

    account_holder:
      normalizePersonName(
        fields.account_holder
      ),

    account_number:
      normalizeDigits(fields.account_number),

    account_type:
      normalizeAccountType(
        fields.account_type
      ),

    swift_code:
      normalizeSwiftCode(fields.swift_code),

    date_issued:
      normalizeDate(fields.date_issued)
  };
}
