import fs from "fs/promises";
import path from "path";

const DEFAULT_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf"
];

const DEFAULT_MAX_FILE_SIZE_MB = 10;

export async function validateUploadedFile({
  filePath,
  mimeType,
  originalName,
  fileSize
}) {
  const issues = [];

  if (!filePath) {
    throw new Error("Uploaded file path is required.");
  }

  let fileStats;

  try {
    fileStats = await fs.stat(filePath);
  } catch {
    throw new Error("Uploaded file could not be found.");
  }

  const actualFileSize = Number(fileSize ?? fileStats.size);

  if (!fileStats.isFile()) {
    issues.push("Uploaded item is not a valid file.");
  }

  if (actualFileSize <= 0) {
    issues.push("Uploaded file is empty.");
  }

  const allowedMimeTypes = getAllowedMimeTypes();

  if (!mimeType || !allowedMimeTypes.includes(mimeType)) {
    issues.push(
      `Unsupported file type '${mimeType || "unknown"}'. ` +
        `Allowed types: ${allowedMimeTypes.join(", ")}.`
    );
  }

  const maximumFileSizeBytes = getMaximumFileSizeBytes();

  if (actualFileSize > maximumFileSizeBytes) {
    issues.push(
      `Uploaded file exceeds the maximum size of ${getMaximumFileSizeMb()} MB.`
    );
  }

  const extension = originalName
    ? path.extname(originalName).toLowerCase()
    : null;

  if (
    extension &&
    ![".jpg", ".jpeg", ".png", ".pdf"].includes(extension)
  ) {
    issues.push(`Unsupported file extension '${extension}'.`);
  }

  return {
    valid: issues.length === 0,
    issues,
    metadata: {
      originalName: originalName || null,
      mimeType: mimeType || null,
      extension,
      sizeBytes: actualFileSize,
      maximumSizeBytes: maximumFileSizeBytes
    }
  };
}

function getAllowedMimeTypes() {
  const configuredTypes = process.env.ALLOWED_DOCUMENT_MIME_TYPES;

  if (!configuredTypes) {
    return DEFAULT_ALLOWED_MIME_TYPES;
  }

  return configuredTypes
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function getMaximumFileSizeMb() {
  const configuredValue = Number(process.env.MAX_FILE_SIZE_MB);

  if (!Number.isFinite(configuredValue) || configuredValue <= 0) {
    return DEFAULT_MAX_FILE_SIZE_MB;
  }

  return configuredValue;
}

function getMaximumFileSizeBytes() {
  return getMaximumFileSizeMb() * 1024 * 1024;
}
