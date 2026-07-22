/**
 * ============================================================================
 * Processor Utilities
 * ----------------------------------------------------------------------------
 * Shared helper functions used during document processing.
 *
 * These functions are intentionally pure:
 * - No I/O
 * - No AI calls
 * - No registry access
 * - No review logic
 * - No side effects
 * ============================================================================
 */

/**
 * Normalises extraction status returned by AI providers.
 */
export function normaliseExtractionStatus(value) {
    if (!value) {
        return "FAILED";
    }

    const status = String(value).trim().toUpperCase();

    switch (status) {
        case "SUCCESS":
        case "COMPLETED":
        case "COMPLETE":
            return "SUCCESS";

        case "PARTIAL":
            return "PARTIAL";

        case "FAILED":
        case "ERROR":
            return "FAILED";

        default:
            return "FAILED";
    }
}

/**
 * Ensures confidence is always a valid decimal between 0 and 1.
 */
export function normaliseConfidence(value) {
    const confidence = Number(value);

    if (Number.isNaN(confidence)) {
        return 0;
    }

    if (confidence < 0) {
        return 0;
    }

    if (confidence > 1) {
        return 1;
    }

    return confidence;
}

/**
 * Guarantees an array.
 */
export function normaliseArray(value) {
    if (!value) {
        return [];
    }

    return Array.isArray(value)
        ? value
        : [value];
}

/**
 * Removes duplicates while preserving order.
 */
export function uniqueMessages(values) {
    return [...new Set(normaliseArray(values).filter(Boolean))];
}

/**
 * Converts internal traffic type to a human-readable description.
 */
export function describeTrafficType(trafficType) {
  switch (trafficType) {
    case "ON_DEMAND":
      return "Standard on-demand processing";

    case "ON_DEMAND_PRIORITY":
      return "Priority on-demand processing";

    case "PROVISIONED_THROUGHPUT":
      return "Provisioned throughput processing";

    default:
      return "Unknown";
  }
}
