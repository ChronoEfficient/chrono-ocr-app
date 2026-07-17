// src/engine/gemini.client.js

import fs from "node:fs/promises";
import { GoogleGenAI } from "@google/genai";

let client = null;

const PRIORITY_PAYGO_HEADERS = Object.freeze({
  "X-Vertex-AI-LLM-Request-Type": "shared",
  "X-Vertex-AI-LLM-Shared-Request-Type": "priority"
});

function getRequiredEnvironmentVariable(name) {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(
      `Missing required environment variable: ${name}`
    );
  }

  return value.trim();
}

function getGeminiClient() {
  if (client) {
    return client;
  }

  client = new GoogleGenAI({
    vertexai: true,

    project: getRequiredEnvironmentVariable(
      "GOOGLE_CLOUD_PROJECT"
    ),

    location:
      process.env.GOOGLE_CLOUD_LOCATION?.trim() ||
      "global"
  });

  return client;
}

function parseTrafficType(usageMetadata) {
  return (
    usageMetadata?.trafficType ??
    usageMetadata?.traffic_type ??
    "UNKNOWN"
  );
}

function parseTokenUsage(usageMetadata) {
  return {
    promptTokens:
      usageMetadata?.promptTokenCount ??
      usageMetadata?.prompt_token_count ??
      null,

    candidateTokens:
      usageMetadata?.candidatesTokenCount ??
      usageMetadata?.candidates_token_count ??
      null,

    totalTokens:
      usageMetadata?.totalTokenCount ??
      usageMetadata?.total_token_count ??
      null
  };
}

function parseFinishReason(response) {
  return (
    response?.candidates?.[0]?.finishReason ??
    response?.candidates?.[0]?.finish_reason ??
    null
  );
}

function extractResponseText(response) {
  if (
    typeof response?.text === "string" &&
    response.text.trim()
  ) {
    return response.text.trim();
  }

  const parts =
    response?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    throw new Error(
      "Gemini response did not contain any response parts."
    );
  }

  const text = parts
    .map((part) =>
      typeof part?.text === "string"
        ? part.text
        : ""
    )
    .join("")
    .trim();

  if (!text) {
    throw new Error(
      "Gemini response did not contain any text."
    );
  }

  return text;
}

function parseJsonResponse(response) {
  const text = extractResponseText(response);

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(
      `Gemini returned invalid JSON: ${
        error instanceof Error
          ? error.message
          : String(error)
      }`
    );
  }
}

function validateExtractionArguments({
  model,
  prompt,
  schema,
  filePath,
  mimeType,
  temperature
}) {
  if (!model || typeof model !== "string") {
    throw new TypeError(
      "A valid Gemini model name is required."
    );
  }

  if (!prompt || typeof prompt !== "string") {
    throw new TypeError(
      "A valid Gemini prompt is required."
    );
  }

  if (!schema || typeof schema !== "object") {
    throw new TypeError(
      "A valid Gemini response schema is required."
    );
  }

  if (!filePath || typeof filePath !== "string") {
    throw new TypeError(
      "A valid document file path is required."
    );
  }

  if (!mimeType || typeof mimeType !== "string") {
    throw new TypeError(
      "A valid document MIME type is required."
    );
  }

  if (
    typeof temperature !== "number" ||
    Number.isNaN(temperature)
  ) {
    throw new TypeError(
      "Gemini temperature must be a valid number."
    );
  }
}

export async function extractDocumentWithGemini({
  model,
  prompt,
  schema,
  filePath,
  mimeType,
  temperature = 0.1
}) {
  validateExtractionArguments({
    model,
    prompt,
    schema,
    filePath,
    mimeType,
    temperature
  });

  const documentBuffer =
    await fs.readFile(filePath);

  const documentBase64 =
    documentBuffer.toString("base64");

  const geminiClient =
    getGeminiClient();

  const response =
    await geminiClient.models.generateContent({
      model,

      contents: [
        {
          role: "user",

          parts: [
            {
              text: prompt
            },

            {
              inlineData: {
                mimeType,
                data: documentBase64
              }
            }
          ]
        }
      ],

      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature,

        /*
         * Priority PayGo must be requested through HTTP
         * headers on the individual Vertex AI request.
         */
        httpOptions: {
          headers: PRIORITY_PAYGO_HEADERS
        }
      }
    });

  const json =
    parseJsonResponse(response);

  return {
    extraction: json,

    metadata: {
      model,

      /*
       * Vertex AI reports the traffic tier used for the
       * request through usageMetadata.trafficType.
       */
      trafficType:
        parseTrafficType(
          response.usageMetadata
        ),

      tokenUsage:
        parseTokenUsage(
          response.usageMetadata
        ),

      finishReason:
        parseFinishReason(response)
    }
  };
}
