import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { buildHrDocumentPrompt } from "../prompts/hrDocument.prompt.js";

let aiClient = null;

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getGeminiClient() {
  if (aiClient) {
    return aiClient;
  }

  const project = getRequiredEnv("GOOGLE_CLOUD_PROJECT");
  const location = process.env.GOOGLE_CLOUD_LOCATION || "africa-south1";

  aiClient = new GoogleGenAI({
    vertexai: true,
    project,
    location
  });

  return aiClient;
}

export async function extractWithGemini({ filePath, mimeType, documentType }) {
  if (!filePath) {
    throw new Error("filePath is required");
  }

  if (!mimeType) {
    throw new Error("mimeType is required");
  }

  if (!documentType) {
    throw new Error("documentType is required");
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const ai = getGeminiClient();
  const model = process.env.GEMINI_OCR_MODEL || "gemini-2.5-flash";

  const fileBuffer = fs.readFileSync(filePath);
  const base64File = fileBuffer.toString("base64");

  const prompt = buildHrDocumentPrompt(documentType);

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: base64File
            }
          }
        ]
      }
    ],
    config: {
      temperature: 0,
      responseMimeType: "application/json"
    }
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty response");
  }

  try {
    return JSON.parse(response.text);
  } catch (error) {
    throw new Error(`Failed to parse Gemini JSON response: ${error.message}`);
  }
}
