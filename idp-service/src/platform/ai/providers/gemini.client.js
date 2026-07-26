// src/engine/gemini.client.js

import fs from "node:fs/promises";
import { GoogleGenAI } from "@google/genai";

let client = null;

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_TEMPERATURE = 0;
const DEFAULT_RESPONSE_MIME_TYPE = "application/json";

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

function resolveAiConfiguration(ai = {}) {
  const provider =
    ai.provider?.trim().toLowerCase() ||
    "gemini";

  if (provider !== "gemini") {
    throw new TypeError(
      `Unsupported AI provider: ${provider}`
    );
  }

  const model =
    ai.model?.trim() ||
    process.env.GEMINI_MODEL?.trim() ||
    DEFAULT_GEMINI_MODEL;

  const temperature =
    ai.temperature ??
    DEFAULT_TEMPERATURE;

  const maxOutputTokens =
    ai.maxOutputTokens ??
    null;

  const responseMimeType =
    ai.responseMimeType?.trim() ||
    DEFAULT_RESPONSE_MIME_TYPE;

  if (
    typeof temperature !== "number" ||
    Number.isNaN(temperature) ||
    !Number.isFinite(temperature)
  ) {
    throw new TypeError(
      "Gemini temperature must be a finite number."
    );
  }

  if (
    maxOutputTokens !== null &&
    (
      !Number.isInteger(maxOutputTokens) ||
      maxOutputTokens <= 0
    )
  ) {
    throw new TypeError(
      "Gemini maxOutputTokens must be a positive integer or null."
    );
  }

  return {
    provider,
    model,
    temperature,
    maxOutputTokens,
    responseMimeType
  };
}

function validateExtractionArguments({
  ai,
  prompt,
  schema,
  filePath,
  mimeType
}) {
  if (
    ai !== undefined &&
    ai !== null &&
    (
      typeof ai !== "object" ||
      Array.isArray(ai)
    )
  ) {
    throw new TypeError(
      "Gemini AI configuration must be an object."
    );
  }

  if (!prompt || typeof prompt !== "string") {
    throw new TypeError(
      "A valid Gemini prompt is required."
    );
  }

  if (
    !schema ||
    typeof schema !== "object" ||
    Array.isArray(schema)
  ) {
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
}

function buildGenerationConfig({
  schema,
  temperature,
  maxOutputTokens,
  responseMimeType
}) {
  const config = {
    responseMimeType,
    responseSchema: schema,
    temperature,

    /*
     * Priority PayGo must be requested through HTTP
     * headers on the individual Vertex AI request.
     */
    httpOptions: {
      headers: PRIORITY_PAYGO_HEADERS
    }
  };

  /*
   * Do not pass null to the Gemini SDK. When omitted,
   * the model or service default is used.
   */
  if (maxOutputTokens !== null) {
    config.maxOutputTokens = maxOutputTokens;
  }

  return config;
}

export async function extractDocumentWithGemini({
  ai = {},
  prompt,
  schema,
  filePath,
  mimeType
}) {
  validateExtractionArguments({
    ai,
    prompt,
    schema,
    filePath,
    mimeType
  });

  const {
    provider,
    model,
    temperature,
    maxOutputTokens,
    responseMimeType
  } = resolveAiConfiguration(ai);

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

      config: buildGenerationConfig({
        schema,
        temperature,
        maxOutputTokens,
        responseMimeType
      })
    });

const rawResponseText =

  response?.text ??

  response?.candidates?.[0]?.content?.parts?.[0]?.text ??

  null;

  const json =
    parseJsonResponse(response);

  const PROVIDERS = {
    GEMINI: "GOOGLE_VERTEX_AI"
  };

  return {
    extraction: json,

    metadata: {
      provider: PROVIDERS.GEMINI,
      aiProvider: provider,
      model,

      /*
       * Vertex AI reports the traffic tier used for the
       * request through usageMetadata.trafficType.
       */
      trafficType:
        parseTrafficType(
          response.usageMetadata
        ),

      finishReason:
        parseFinishReason(response),

      tokenUsage:
        parseTokenUsage(
          response.usageMetadata
        ),

      temperature,
      maxOutputTokens,
      responseMimeType
    }
  };
}
