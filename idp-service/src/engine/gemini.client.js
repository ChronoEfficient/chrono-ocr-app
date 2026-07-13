import { GoogleGenAI } from "@google/genai";

let client = null;

function getRequiredEnvironmentVariable(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getGeminiClient() {
  if (client) {
    return client;
  }

  client = new GoogleGenAI({
    vertexai: true,
    project: getRequiredEnvironmentVariable("GOOGLE_CLOUD_PROJECT"),
    location: process.env.GOOGLE_CLOUD_LOCATION || "global"
  });

  return client;
}
