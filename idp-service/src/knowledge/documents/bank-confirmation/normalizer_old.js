import {
  normalizeOptionalString,
  normalizeDigits,
  normalizeDate
} from "../../../platform/normalization/base.normalizer.js";

const ACCOUNT_TYPE_MAP = {
  CHEQUE: "CURRENT",
  "CHEQUE ACCOUNT": "CURRENT",
  CURRENT: "CURRENT",
  "CURRENT ACCOUNT": "CURRENT",

  SAVINGS: "SAVINGS",
  "SAVINGS ACCOUNT": "SAVINGS",

  TRANSMISSION: "TRANSMISSION",
  "TRANSMISSION ACCOUNT": "TRANSMISSION",

  CREDIT: "CREDIT",
  "CREDIT ACCOUNT": "CREDIT"
};

function normalizeAccountType(value) {
  const normalizedValue = normalizeOptionalString(value)?.toUpperCase();

  if (!normalizedValue) {
    return null;
  }

  return ACCOUNT_TYPE_MAP[normalizedValue] ?? normalizedValue;
}

export function normalizeBankConfirmation(data = {}) {
  return {
    bank_name:
      normalizeOptionalString(data.bank_name)?.toUpperCase() ?? null,

    branch_code:
      normalizeDigits(data.branch_code) ?? null,

    account_holder:
      normalizeOptionalString(data.account_holder) ?? null,

    account_number:
      normalizeDigits(data.account_number) ?? null,

    account_type:
      normalizeAccountType(data.account_type),

    swift_code:
      normalizeOptionalString(data.swift_code)?.toUpperCase() ?? null,

    date_issued:
      normalizeDate(data.date_issued) ?? null
  };
}
