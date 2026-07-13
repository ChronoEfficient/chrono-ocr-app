import fs from "fs/promises";
import { getGeminiClient } from "./gemini.client.js";
import { getDocumentConfiguration } from "./document.registry.js";

export async function processDocument({
  domain,
  documentType,
  filePath,
  mimeType
}) {
  validateRequest({
    domain,
    documentType,
    filePath,
    mimeType
  });

  const configuration = getDocumentConfiguration(domain, documentType);
  const fileBuffer = await fs.readFile(filePath);
  const base64Document = fileBuffer.toString("base64");

  const client = getGeminiClient();
  const model = process.env.GEMINI_OCR_MODEL || "gemini-2.5-flash";

  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: configuration.buildPrompt()
          },
          {
            inlineData: {
              mimeType,
              data: base64Document
            }
          }
        ]
      }
    ],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: configuration.schema
    }
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty response");
  }

  let result;

  try {
    result = JSON.parse(response.text);
  } catch (error) {
    throw new Error(`Gemini returned invalid JSON: ${error.message}`);
  }

  if (configuration.validate) {
    result.validation = configuration.validate(result);
  }

  return {
    domain,
    documentType,
    result
  };
}

function validateRequest({ domain, documentType, filePath, mimeType }) {
  if (!domain) {
    throw new Error("domain is required");
  }

  if (!documentType) {
    throw new Error("documentType is required");
  }

  if (!filePath) {
    throw new Error("filePath is required");
  }

  if (!mimeType) {
    throw new Error("mimeType is required");
  }
}
