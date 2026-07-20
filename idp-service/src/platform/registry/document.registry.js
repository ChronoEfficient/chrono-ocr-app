import { hrDocumentRegistry } from "../../hr/index.js";
import { procurementDocumentRegistry } from "../../procurement/index.js";

const domainRegistries = {
  hr: hrDocumentRegistry,
  procurement: procurementDocumentRegistry
};

export function getDocumentConfiguration(domain, documentType) {
  const normalizedDomain = String(domain).toLowerCase();
  const normalizedDocumentType = String(documentType).toUpperCase();

  const registry = domainRegistries[normalizedDomain];

  if (!registry) {
    throw new Error(`Unsupported domain: ${domain}`);
  }

  const configuration = registry[normalizedDocumentType];

  if (!configuration) {
    throw new Error(
      `Unsupported document type '${documentType}' for domain '${domain}'`
    );
  }

  return configuration;
}
