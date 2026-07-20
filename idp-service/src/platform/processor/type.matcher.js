
export function evaluateTypeMatch({
  detectedType,
  expectedTypes,
  configuredDocumentType
}) {
  if (!detectedType) {
    return false;
  }

  const normalisedDetectedType =
    String(detectedType)
      .trim()
      .toUpperCase();

  const acceptedTypes =
    Array.isArray(expectedTypes) &&
    expectedTypes.length > 0
      ? expectedTypes
      : [configuredDocumentType];

  return acceptedTypes
    .filter(Boolean)
    .map((value) =>
      String(value)
        .trim()
        .toUpperCase()
    )
    .includes(normalisedDetectedType);
}

