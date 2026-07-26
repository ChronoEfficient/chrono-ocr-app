const KNOWN_DOCUMENT_TYPES = new Set([
  "QUOTATION",
  "PURCHASE_ORDER",
  "INVOICE",
  "TAX_INVOICE",
  "PRO_FORMA_INVOICE",
  "CREDIT_NOTE",
  "DEBIT_NOTE",
  "DELIVERY_NOTE",
  "GOODS_RECEIVED_NOTE",
  "SERVICE_NOTE",
  "SERVICE_ENTRY_SHEET",
  "PACKING_SLIP",
  "SUPPLIER_STATEMENT",
  "OTHER",
  "UNKNOWN"
]);

const PO_REQUIRED_DOCUMENT_TYPES = new Set([
  "INVOICE",
  "TAX_INVOICE",
  "CREDIT_NOTE",
  "DELIVERY_NOTE",
  "SERVICE_NOTE",
  "SERVICE_ENTRY_SHEET"
]);

const PRICED_DOCUMENT_TYPES = new Set([
  "QUOTATION",
  "PURCHASE_ORDER",
  "INVOICE",
  "TAX_INVOICE",
  "PRO_FORMA_INVOICE",
  "CREDIT_NOTE",
  "DEBIT_NOTE"
]);

const QUANTITY_DOCUMENT_TYPES = new Set([
  "DELIVERY_NOTE",
  "GOODS_RECEIVED_NOTE",
  "PACKING_SLIP"
]);

const SERVICE_DOCUMENT_TYPES = new Set([
  "SERVICE_NOTE",
  "SERVICE_ENTRY_SHEET"
]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidIsoDate(value) {
  if (!value) return false;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
}

function toMinorUnits(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }
  return Math.round(value * 100);
}

function isSouthAfricanContext(fields) {
  const supplierCountry = String(fields.supplier_country ?? "").trim().toUpperCase();
  const customerCountry = String(fields.customer_country ?? "").trim().toUpperCase();

  return (
    ["ZA", "ZAF", "SOUTH AFRICA"].includes(supplierCountry) ||
    ["ZA", "ZAF", "SOUTH AFRICA"].includes(customerCountry) ||
    fields.currency === "ZAR"
  );
}

function addIssue(issues, code, field, extra = {}) {
  issues.push({ code, field, ...extra });
}

function validateLineItem(line, index, classifiedDocumentType, issues, southAfricanContext) {
  const prefix = `line_items[${index}]`;

  if (!isNonEmptyString(line.description)) {
    addIssue(issues, "MISSING_LINE_DESCRIPTION", `${prefix}.description`);
  }

  if (!Number.isFinite(line.confidence) || line.confidence < 0 || line.confidence > 100) {
    addIssue(issues, "INVALID_LINE_CONFIDENCE", `${prefix}.confidence`, {
      expected: "A number from 0 to 100",
      actual: line.confidence
    });
  }

  if (PRICED_DOCUMENT_TYPES.has(classifiedDocumentType)) {
    if (!Number.isFinite(line.quantity)) {
      addIssue(issues, "MISSING_LINE_QUANTITY", `${prefix}.quantity`);
    }
    if (!Number.isFinite(line.unit_price)) {
      addIssue(issues, "MISSING_LINE_UNIT_PRICE", `${prefix}.unit_price`);
    }
    if (!Number.isFinite(line.line_total)) {
      addIssue(issues, "MISSING_LINE_TOTAL", `${prefix}.line_total`);
    }
  }

  if (
    QUANTITY_DOCUMENT_TYPES.has(classifiedDocumentType) &&
    !Number.isFinite(line.delivery_quantity ?? line.quantity)
  ) {
    addIssue(issues, "MISSING_DELIVERY_QUANTITY", `${prefix}.delivery_quantity`);
  }

  if (SERVICE_DOCUMENT_TYPES.has(classifiedDocumentType)) {
    const hasServiceMeasure =
      Number.isFinite(line.quantity) ||
      Number.isFinite(line.delivery_quantity) ||
      isNonEmptyString(line.service_period_start) ||
      isNonEmptyString(line.service_period_end);

    if (!hasServiceMeasure) {
      addIssue(issues, "MISSING_SERVICE_MEASURE", prefix);
    }
  }

  if (line.service_period_start && !isValidIsoDate(line.service_period_start)) {
    addIssue(issues, "INVALID_SERVICE_PERIOD_START", `${prefix}.service_period_start`, {
      actual: line.service_period_start
    });
  }

  if (line.service_period_end && !isValidIsoDate(line.service_period_end)) {
    addIssue(issues, "INVALID_SERVICE_PERIOD_END", `${prefix}.service_period_end`, {
      actual: line.service_period_end
    });
  }

  if (
    southAfricanContext &&
    Number.isFinite(line.tax_rate) &&
    ![0, 15].includes(line.tax_rate)
  ) {
    addIssue(issues, "INVALID_SOUTH_AFRICAN_VAT_RATE", `${prefix}.tax_rate`, {
      expected: [0, 15],
      actual: line.tax_rate
    });
  }

  if (
    Number.isFinite(line.quantity) &&
    Number.isFinite(line.unit_price) &&
    Number.isFinite(line.line_subtotal)
  ) {
    const expectedSubtotal = toMinorUnits(line.quantity * line.unit_price);
    const actualSubtotal = toMinorUnits(line.line_subtotal);

    if (expectedSubtotal !== actualSubtotal) {
      addIssue(issues, "LINE_SUBTOTAL_MISMATCH", `${prefix}.line_subtotal`, {
        expected: expectedSubtotal / 100,
        actual: actualSubtotal / 100
      });
    }
  }

  if (
    Number.isFinite(line.line_subtotal) &&
    Number.isFinite(line.discount_amount) &&
    Number.isFinite(line.tax_amount) &&
    Number.isFinite(line.line_total)
  ) {
    const expectedTotal = toMinorUnits(
      line.line_subtotal - line.discount_amount + line.tax_amount
    );
    const actualTotal = toMinorUnits(line.line_total);

    if (expectedTotal !== actualTotal) {
      addIssue(issues, "LINE_TOTAL_MISMATCH", `${prefix}.line_total`, {
        expected: expectedTotal / 100,
        actual: actualTotal / 100
      });
    }
  }
}

export function validateProcurementDocument(result = {}) {
  const fields = result && typeof result === "object" && !Array.isArray(result)
    ? result
    : {};

  const issues = [];
  const classifiedDocumentType = fields.classified_document_type;
  const southAfricanContext = isSouthAfricanContext(fields);

  if (!classifiedDocumentType) {
    addIssue(issues, "MISSING_CLASSIFIED_DOCUMENT_TYPE", "classified_document_type");
  } else if (!KNOWN_DOCUMENT_TYPES.has(classifiedDocumentType)) {
    addIssue(issues, "UNKNOWN_CLASSIFIED_DOCUMENT_TYPE", "classified_document_type", {
      actual: classifiedDocumentType
    });
  }

  if (
    !["SUPPLIER_STATEMENT", "UNKNOWN"].includes(classifiedDocumentType) &&
    !isNonEmptyString(fields.document_number)
  ) {
    addIssue(issues, "MISSING_DOCUMENT_NUMBER", "document_number");
  }

  if (
    !["SUPPLIER_STATEMENT", "UNKNOWN"].includes(classifiedDocumentType) &&
    !fields.document_date
  ) {
    addIssue(issues, "MISSING_DOCUMENT_DATE", "document_date");
  } else if (fields.document_date && !isValidIsoDate(fields.document_date)) {
    addIssue(issues, "INVALID_DOCUMENT_DATE", "document_date", {
      actual: fields.document_date
    });
  }

  const allPurchaseOrderNumbers = [
    fields.purchase_order_number,
    ...(Array.isArray(fields.purchase_order_numbers) ? fields.purchase_order_numbers : []),
    ...(Array.isArray(fields.line_items)
      ? fields.line_items.map((line) => line.purchase_order_number)
      : [])
  ].filter(isNonEmptyString);

  if (
    PO_REQUIRED_DOCUMENT_TYPES.has(classifiedDocumentType) &&
    allPurchaseOrderNumbers.length === 0
  ) {
    addIssue(issues, "MISSING_PURCHASE_ORDER_NUMBER", "purchase_order_number");
  }

  if (!isNonEmptyString(fields.supplier_name)) {
    addIssue(issues, "MISSING_SUPPLIER_NAME", "supplier_name");
  }

  if (!isNonEmptyString(fields.customer_name)) {
    addIssue(issues, "MISSING_CUSTOMER_NAME", "customer_name");
  }

  if (
    PRICED_DOCUMENT_TYPES.has(classifiedDocumentType) &&
    !isNonEmptyString(fields.currency)
  ) {
    addIssue(issues, "MISSING_CURRENCY", "currency");
  }

  if (!Array.isArray(fields.line_items) || fields.line_items.length === 0) {
    addIssue(issues, "MISSING_LINE_ITEMS", "line_items");
  } else {
    fields.line_items.forEach((line, index) =>
      validateLineItem(
        line,
        index,
        classifiedDocumentType,
        issues,
        southAfricanContext
      )
    );
  }

  if (
    southAfricanContext &&
    fields.supplier_is_vat_vendor === true &&
    !isNonEmptyString(fields.supplier_vat_number)
  ) {
    addIssue(issues, "MISSING_SUPPLIER_VAT_NUMBER", "supplier_vat_number");
  }

  if (
    southAfricanContext &&
    fields.supplier_is_vat_vendor === false &&
    Number.isFinite(fields.tax_total) &&
    fields.tax_total > 0
  ) {
    addIssue(issues, "NON_VAT_VENDOR_CHARGING_VAT", "tax_total", {
      actual: fields.tax_total
    });
  }

  if (
    southAfricanContext &&
    classifiedDocumentType === "TAX_INVOICE" &&
    fields.supplier_is_vat_vendor === true &&
    !isNonEmptyString(fields.customer_vat_number)
  ) {
    addIssue(issues, "MISSING_CUSTOMER_VAT_NUMBER_REVIEW", "customer_vat_number", {
      severity: "REVIEW"
    });
  }

  if (Array.isArray(fields.line_items) && Number.isFinite(fields.subtotal)) {
    const lineSubtotals = fields.line_items
      .map((line) => toMinorUnits(line.line_subtotal))
      .filter((value) => value !== null);

    if (lineSubtotals.length === fields.line_items.length) {
      const expectedSubtotal = lineSubtotals.reduce((sum, value) => sum + value, 0);
      const actualSubtotal = toMinorUnits(fields.subtotal);

      if (expectedSubtotal !== actualSubtotal) {
        addIssue(issues, "DOCUMENT_SUBTOTAL_MISMATCH", "subtotal", {
          expected: expectedSubtotal / 100,
          actual: actualSubtotal / 100
        });
      }
    }
  }

  if (Number.isFinite(fields.subtotal) && Number.isFinite(fields.total_amount)) {
    const expectedTotal = toMinorUnits(
      fields.subtotal -
      (fields.discount_total ?? 0) +
      (fields.tax_total ?? 0) +
      (fields.shipping_total ?? 0) +
      (fields.other_charges_total ?? 0)
    );
    const actualTotal = toMinorUnits(fields.total_amount);

    if (expectedTotal !== actualTotal) {
      addIssue(issues, "DOCUMENT_TOTAL_MISMATCH", "total_amount", {
        expected: expectedTotal / 100,
        actual: actualTotal / 100
      });
    }
  }

  const reviewIssues = issues.filter((issue) => issue.severity === "REVIEW");
  const validationIssues = issues.filter((issue) => issue.severity !== "REVIEW");

  return {
    valid: validationIssues.length === 0,
    issues,
    derivedData: {
      underlyingDocumentType: classifiedDocumentType,
      requiresPurchaseOrder: PO_REQUIRED_DOCUMENT_TYPES.has(classifiedDocumentType),
      purchaseOrderNumbers: [...new Set(allPurchaseOrderNumbers)],
      southAfricanVatRulesApplied: southAfricanContext,
      reviewRequired: reviewIssues.length > 0 || validationIssues.length > 0,
      reviewIssues
    }
  };
}
