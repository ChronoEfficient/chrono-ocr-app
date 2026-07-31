import { idDocumentDefinition } from "./documents/id-document.definition.js";
import { bankConfirmationDefinition } from "./documents/bank-confirmation.definition.js";

export const hrDocumentRegistry = {
  [idDocumentDefinition.documentType]: idDocumentDefinition,
  [bankConfirmationDefinition.documentType]:
    bankConfirmationDefinition
};
