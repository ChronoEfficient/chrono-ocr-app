import fs from "fs/promises";
import path from "path";

const DEFAULT_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf"
];

const DEFAULT_ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".pdf"
];

const DEFAULT_MAX_FILE_SIZE_MB = 10;

export async function validateUploadedFile({
  filePath,
  mimeType,
  originalName,
  fileSize,
  filePolicy = {}
}) {
  const issues = [];

  if (!filePath) {
    throw new Error("Uploaded file path is required.");
  }

  let fileStats;

  try {
    fileStats = await fs.stat(filePath);
  } catch {
    const error = new Error("Uploaded file could not be found.");

    error.code = "FILE_NOT_FOUND";
    error.statusCode = 400;

    throw error;
  }

  const actualFileSize = Number(fileSize ?? fileStats.size);

  const allowedMimeTypes = resolveAllowedMimeTypes(filePolicy);
  const allowedExtensions = resolveAllowedExtensions(filePolicy);
  const maximumFileSizeMb = resolveMaximumFileSizeMb(filePolicy);
  const maximumFileSizeBytes =
    maximumFileSizeMb * 1024 * 1024;

  const extension = originalName
    ? path.extname(originalName).toLowerCase()
    : null;

  if (!fileStats.isFile()) {
    issues.push("Uploaded item is not a valid file.");
  }

  if (!Number.isFinite(actualFileSize) || actualFileSize <= 0) {
    issues.push("Uploaded file is empty.");
  }

  const normalizedMimeType = mimeType
    ? String(mimeType).trim().toLowerCase()
    : null;

  if (
    !normalizedMimeType ||
    !allowedMimeTypes.includes(normalizedMimeType)
  ) {
    issues.push(
      `Unsupported file type '${normalizedMimeType || "unknown"}'. ` +
        `Allowed types: ${allowedMimeTypes.join(", ")}.`
    );
  }

  if (
    extension &&
    !allowedExtensions.includes(extension)
  ) {
    issues.push(
      `Unsupported file extension '${extension}'. ` +
        `Allowed extensions: ${allowedExtensions.join(", ")}.`
    );
  }

  if (actualFileSize > maximumFileSizeBytes) {
    issues.push(
      `Uploaded file exceeds the maximum size of ${maximumFileSizeMb} MB.`
    );
  }

  return {
    valid: issues.length === 0,
    issues,
    metadata: {
      originalName: originalName || null,
      mimeType: normalizedMimeType,
      extension,
      sizeBytes: actualFileSize,
      maximumSizeBytes: maximumFileSizeBytes,
      maximumSizeMb: maximumFileSizeMb
    }
  };
}

function resolveAllowedMimeTypes(filePolicy) {
  if (
    Array.isArray(filePolicy.allowedMimeTypes) &&
    filePolicy.allowedMimeTypes.length > 0
  ) {
    return filePolicy.allowedMimeTypes
      .map((value) =>
        String(value).trim().toLowerCase()
      )
      .filter(Boolean);
  }

  const configuredTypes =
    process.env.ALLOWED_DOCUMENT_MIME_TYPES;

  if (configuredTypes) {
    const environmentTypes = configuredTypes
      .split(",")
      .map((value) =>
        value.trim().toLowerCase()
      )
      .filter(Boolean);

    if (environmentTypes.length > 0) {
      return environmentTypes;
    }
  }

  return DEFAULT_ALLOWED_MIME_TYPES;
}

function resolveAllowedExtensions(filePolicy) {
  if (
    Array.isArray(filePolicy.allowedExtensions) &&
    filePolicy.allowedExtensions.length > 0
  ) {
    return filePolicy.allowedExtensions
      .map((value) => {
        const normalized = String(value)
          .trim()
          .toLowerCase();

        if (!normalized) {
          return null;
        }

        return normalized.startsWith(".")
          ? normalized
          : `.${normalized}`;
      })
      .filter(Boolean);
  }

  return DEFAULT_ALLOWED_EXTENSIONS;
}

function resolveMaximumFileSizeMb(filePolicy) {
  const policyValue = Number(
    filePolicy.maximumFileSizeMb
  );

  if (
    Number.isFinite(policyValue) &&
    policyValue > 0
  ) {
    return policyValue;
  }

  const environmentValue = Number(
    process.env.MAX_FILE_SIZE_MB
  );

  if (
    Number.isFinite(environmentValue) &&
    environmentValue > 0
  ) {
    return environmentValue;
  }

  return DEFAULT_MAX_FILE_SIZE_MB;
}
