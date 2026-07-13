import { buildIdDocumentPrompt } from "./prompts/id-document.prompt.js";
import { idDocumentSchema } from "./schemas/id-document.schema.js";
import { validateIdDocument } from "./validators/sa-id.validator.js";

export const hrDocumentRegistry = {
  ID_DOCUMENT: {
    buildPrompt: buildIdDocumentPrompt,
    schema: idDocumentSchema,
    validate: validateIdDocument
  }
};
