const PROCESSING_ID_PATTERN = /^DOC-(\d{8})-(\d{6})$/;

function isValidCalendarDate(datePart) {
  const year = Number(datePart.slice(0, 4));
  const month = Number(datePart.slice(4, 6));
  const day = Number(datePart.slice(6, 8));

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validateProcessingId(processingId) {
  if (!processingId) {
    return {
      valid: false,
      issues: ["processingId is required."]
    };
  }

  const normalizedProcessingId = String(processingId)
    .trim()
    .toUpperCase();

  const match = normalizedProcessingId.match(
    PROCESSING_ID_PATTERN
  );

  if (!match) {
    return {
      valid: false,
      issues: [
        "processingId must use the format DOC-YYYYMMDD-000001."
      ]
    };
  }

  const [, datePart, sequencePart] = match;
  const sequenceNumber = Number(sequencePart);

  const issues = [];

  if (!isValidCalendarDate(datePart)) {
    issues.push(
      "processingId contains an invalid calendar date."
    );
  }

  if (sequenceNumber < 1) {
    issues.push(
      "processingId sequence must be greater than zero."
    );
  }

  return {
    valid: issues.length === 0,
    issues,
    normalizedProcessingId,
    metadata: {
      date: datePart,
      sequence: sequenceNumber
    }
  };
}
