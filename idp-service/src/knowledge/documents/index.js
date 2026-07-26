import { idDocumentDefinition } from "./id-document/definition.js";
import { bankConfirmationDefinition } from "./bank-confirmation/definition.js";
import { proofOfAddressDefinition } from "./proof-of-address/definition.js";
import { registrationCertificateDefinition } from "./registration-certificate/definition.js";
import { passportDocumentDefinition } from "./passport/definition.js";
import { procurementDocumentDefinition } from "./procurement-document/definition.js";

export const documentDefinitions = [
  idDocumentDefinition,
  bankConfirmationDefinition,
  proofOfAddressDefinition,
  registrationCertificateDefinition,
  passportDocumentDefinition,
  procurementDocumentDefinition 
];

function buildDocumentDefinitionRegistry(definitions) {
  const registry = {};
  const definitionIds = new Set();

  for (const definition of definitions) {
    if (!definition?.id) {
      throw new Error(
        "Every document definition must provide an id."
      );
    }

    if (!definition?.documentType) {
      throw new Error(
        `Document definition ${definition.id} must provide a documentType.`
      );
    }

    if (definitionIds.has(definition.id)) {
      throw new Error(
        `Duplicate document definition id: ${definition.id}.`
      );
    }

    if (registry[definition.documentType]) {
      throw new Error(
        `Duplicate documentType registered: ${definition.documentType}.`
      );
    }

    definitionIds.add(definition.id);
    registry[definition.documentType] = definition;
  }

  return Object.freeze(registry);
}

export const documentDefinitionRegistry =
  buildDocumentDefinitionRegistry(documentDefinitions);
