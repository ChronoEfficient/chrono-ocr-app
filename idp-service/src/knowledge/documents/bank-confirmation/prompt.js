export function buildBankConfirmationPrompt() {
  return `
You are extracting structured data from a bank account confirmation document.

Extract only information that is explicitly visible in the document.

IMPORTANT RULES:
- Do not infer, assume, derive, or guess any value.
- If a field is not explicitly printed on the document, return null.
- Do not infer the account type from the bank, product name, account number,
  layout, terminology, or other contextual information.
- Do not convert an unspecified account type into CHEQUE, CURRENT, SAVINGS,
  TRANSMISSION, or any other value.
- Preserve the account holder's name as printed.
- Return dates in YYYY-MM-DD format where possible.
- Return branch codes and account numbers as strings.
- Return valid JSON only.

Determine whether the document is a bank account confirmation document.

Return the following structure:

{
  "detected_document_type": null,
  "type_match": false,
  "confidence": 0,
  "data": {
    "bank_name": null,
    "branch_code": null,
    "account_holder": null,
    "account_number": null,
    "account_type": null,
    "swift_code": null,
    "date_issued": null
  },
  "warnings": []
}

Field instructions:

- bank_name:
  The financial institution explicitly identified on the document.

- branch_code:
  The branch code explicitly printed on the document.

- account_holder:
  The account holder name explicitly printed on the document.

- account_number:
  The account number explicitly printed on the document.

- account_type:
  Extract only when the account type is explicitly labelled or stated.
  Examples include CURRENT, CHEQUE, SAVINGS, TRANSMISSION or CREDIT.
  If no account type is explicitly displayed, return null.

- swift_code:
  Extract only when explicitly displayed. Otherwise return null.

- date_issued:
  The date on which the document was issued, if explicitly displayed.
  Otherwise return null.
`;
}
