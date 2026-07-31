import {
  normalizeText,
  normalizeUppercase,
  normalizeDate
} from "../../../platform/normalization/base.normalizer.js";

const CLASSIFIED_DOCUMENT_TYPE_MAP = {
  QUOTATION: "QUOTATION",
  QUOTE: "QUOTATION",
  PURCHASE_ORDER: "PURCHASE_ORDER",
  "PURCHASE ORDER": "PURCHASE_ORDER",
  PO: "PURCHASE_ORDER",
  INVOICE: "INVOICE",
  TAX_INVOICE: "TAX_INVOICE",
  "TAX INVOICE": "TAX_INVOICE",
  PRO_FORMA_INVOICE: "PRO_FORMA_INVOICE",
  "PRO FORMA INVOICE": "PRO_FORMA_INVOICE",
  PROFORMA_INVOICE: "PRO_FORMA_INVOICE",
  "PROFORMA INVOICE": "PRO_FORMA_INVOICE",
  CREDIT_NOTE: "CREDIT_NOTE",
  "CREDIT NOTE": "CREDIT_NOTE",
  DEBIT_NOTE: "DEBIT_NOTE",
  "DEBIT NOTE": "DEBIT_NOTE",
  DELIVERY_NOTE: "DELIVERY_NOTE",
  "DELIVERY NOTE": "DELIVERY_NOTE",
  GOODS_RECEIVED_NOTE: "GOODS_RECEIVED_NOTE",
  "GOODS RECEIVED NOTE": "GOODS_RECEIVED_NOTE",
  GRN: "GOODS_RECEIVED_NOTE",
  SERVICE_NOTE: "SERVICE_NOTE",
  "SERVICE NOTE": "SERVICE_NOTE",
  SERVICE_ENTRY_SHEET: "SERVICE_ENTRY_SHEET",
  "SERVICE ENTRY SHEET": "SERVICE_ENTRY_SHEET",
  PACKING_SLIP: "PACKING_SLIP",
  "PACKING SLIP": "PACKING_SLIP",
  SUPPLIER_STATEMENT: "SUPPLIER_STATEMENT",
  "SUPPLIER STATEMENT": "SUPPLIER_STATEMENT",
  OTHER: "OTHER",
  UNKNOWN: "UNKNOWN"
};

const SOURCE_TYPE_MAP = {
  PRINTED: "PRINTED",
  HANDWRITTEN: "HANDWRITTEN",
  STAMPED: "STAMPED",
  MIXED: "MIXED",
  UNKNOWN: "UNKNOWN"
};

function normalizeEnum(value, mapping) {
  const normalized = normalizeUppercase(value);
  if (!normalized) return null;
  return mapping[normalized] ?? normalized.replace(/[\s-]+/g, "_");
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const cleaned = value
    .trim()
    .replace(/\s+/g, "")
    .replace(/,/g, "")
    .replace(/[^\d.+-]/g, "");

  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  if (value === 1) return true;
  if (value === 0) return false;
  return null;
}

function normalizeIdentifier(value) {
  const normalized = normalizeUppercase(value);
  return normalized ? normalized.replace(/\s+/g, "") : null;
}

function normalizeCurrency(value) {
  const normalized = normalizeUppercase(value);
  if (!normalized) return null;

  const currencyMap = {
    R: "ZAR",
    RAND: "ZAR",
    ZAR: "ZAR",
    SAR: "SAR",
    USD: "USD",
    EUR: "EUR",
    GBP: "GBP"
  };

  return currencyMap[normalized] ?? normalized;
}

function normalizeConfidence(value) {
  const normalized = normalizeNumber(value);
  if (normalized === null) return 0;
  return Math.min(100, Math.max(0, normalized));
}

function normalizeStringArray(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(normalizeIdentifier).filter(Boolean))];
}

function normalizeLineItem(item = {}) {
  const source = item && typeof item === "object" && !Array.isArray(item)
    ? item
    : {};

  return {
    line_number: normalizeText(source.line_number),
    item_code: normalizeIdentifier(source.item_code),
    description: normalizeText(source.description),
    quantity: normalizeNumber(source.quantity),
    unit_of_measure: normalizeUppercase(source.unit_of_measure),
    unit_price: normalizeNumber(source.unit_price),
    discount_percentage: normalizeNumber(source.discount_percentage),
    discount_amount: normalizeNumber(source.discount_amount),
    tax_rate: normalizeNumber(source.tax_rate),
    tax_amount: normalizeNumber(source.tax_amount),
    line_subtotal: normalizeNumber(source.line_subtotal),
    line_total: normalizeNumber(source.line_total),
    purchase_order_number: normalizeIdentifier(source.purchase_order_number),
    purchase_order_line_number: normalizeText(source.purchase_order_line_number),
    delivery_quantity: normalizeNumber(source.delivery_quantity),
    service_period_start: normalizeDate(source.service_period_start),
    service_period_end: normalizeDate(source.service_period_end),
    confidence: normalizeConfidence(source.confidence)
  };
}

export function normalizeProcurementDocument(fields = {}) {
  const source = fields && typeof fields === "object" && !Array.isArray(fields)
    ? fields
    : {};

  return {
    classified_document_type: normalizeEnum(
      source.classified_document_type,
      CLASSIFIED_DOCUMENT_TYPE_MAP
    ),
    document_number: normalizeIdentifier(source.document_number),
    document_number_source: normalizeEnum(source.document_number_source, SOURCE_TYPE_MAP),
    document_date: normalizeDate(source.document_date),
    document_date_source: normalizeEnum(source.document_date_source, SOURCE_TYPE_MAP),
    purchase_order_number: normalizeIdentifier(source.purchase_order_number),
    purchase_order_number_source: normalizeEnum(source.purchase_order_number_source, SOURCE_TYPE_MAP),
    purchase_order_numbers: normalizeStringArray(source.purchase_order_numbers),
    supplier_name: normalizeText(source.supplier_name),
    supplier_registration_number: normalizeIdentifier(source.supplier_registration_number),
    supplier_vat_number: normalizeIdentifier(source.supplier_vat_number),
    supplier_vat_number_source: normalizeEnum(source.supplier_vat_number_source, SOURCE_TYPE_MAP),
    supplier_is_vat_vendor: normalizeBoolean(source.supplier_is_vat_vendor),
    supplier_country: normalizeUppercase(source.supplier_country),
    customer_name: normalizeText(source.customer_name),
    customer_registration_number: normalizeIdentifier(source.customer_registration_number),
    customer_vat_number: normalizeIdentifier(source.customer_vat_number),
    customer_vat_number_source: normalizeEnum(source.customer_vat_number_source, SOURCE_TYPE_MAP),
    customer_country: normalizeUppercase(source.customer_country),
    currency: normalizeCurrency(source.currency),
    subtotal: normalizeNumber(source.subtotal),
    discount_total: normalizeNumber(source.discount_total),
    tax_total: normalizeNumber(source.tax_total),
    shipping_total: normalizeNumber(source.shipping_total),
    other_charges_total: normalizeNumber(source.other_charges_total),
    total_amount: normalizeNumber(source.total_amount),
    received_by: normalizeText(source.received_by),
    received_date: normalizeDate(source.received_date),
    signature_present: normalizeBoolean(source.signature_present),
    stamp_present: normalizeBoolean(source.stamp_present),
    line_items: Array.isArray(source.line_items)
      ? source.line_items.map(normalizeLineItem)
      : []
  };
}
