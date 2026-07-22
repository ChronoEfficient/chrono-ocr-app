import { documentDefinitionRegistry } from "../../knowledge/documents/index.js";

export function getDocumentConfiguration(documentType) {
  const normalizedDocumentType = String(documentType ?? "")
    .trim()
    .toUpperCase();

  if (!normalizedDocumentType) {
    throw new Error("Document type is required.");
  }

  const definition =
    documentDefinitionRegistry[normalizedDocumentType];

  if (!definition) {
    throw new Error(
      `Unsupported document type: ${normalizedDocumentType}`
    );
  }

  return definition;
}

export function getAllDocumentDefinitions() {
  return Object.values(documentDefinitionRegistry);
}
