// src/engine/file.validator.js

import fs from "node:fs/promises";
import path from "node:path";

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

/**
 * Validate an uploaded document.
 *
 * This function supports both the current and previous parameter names:
 *
 * Current:
 * {
 *   filePath,
 *   mimeType,
 *   originalName,
 *   fileSize,
 *   filePolicy
 * }
 *
 * Previous:
 * {
 *   filePath,
 *   mimeType,
 *   extension,
 *   fileSize,
 *   policy
 * }
 *
 * @param {object} params
 * @param {string} [params.filePath]
 * @param {string} [params.mimeType]
 * @param {string} [params.originalName]
 * @param {string} [params.extension]
 * @param {number} [params.fileSize]
 * @param {object} [params.filePolicy]
 * @param {object} [params.policy]
 *
 * @returns {Promise<object>}
 */
export async function validateFile({
  filePath,
  mimeType,
  originalName,
  extension,
  fileSize,
  filePolicy,
  policy
}) {
  const issues = [];

  const resolvedPolicy = filePolicy ?? policy ?? {};

  let fileStats = null;

  /*
   * Verify the physical file when a file path is supplied.
   *
   * This supports disk-based Multer storage while still allowing metadata-only
   * validation in unit tests or other controlled use cases.
   */
  if (filePath) {
    try {
      fileStats = await fs.stat(filePath);
    } catch {
      const error = new Error("Uploaded file could not be found.");

      error.name = "FileValidationError";
      error.code = "FILE_NOT_FOUND";
      error.statusCode = 400;
      error.retryable = false;
      error.details = [
        {
          field: "filePath",
          value: filePath,
          message: "The uploaded file does not exist."
        }
      ];

      throw error;
    }

    if (!fileStats.isFile()) {
      issues.push({
        code: "INVALID_FILE",
        field: "filePath",
        value: filePath,
        message: "Uploaded item is not a valid file."
      });
    }
  }

  const actualFileSize = resolveActualFileSize({
    fileSize,
    fileStats
  });

  const allowedMimeTypes =
    resolveAllowedMimeTypes(resolvedPolicy);

  const allowedExtensions =
    resolveAllowedExtensions(resolvedPolicy);

  const maximumFileSizeMb =
    resolveMaximumFileSizeMb(resolvedPolicy);

  const maximumFileSizeBytes =
    maximumFileSizeMb * 1024 * 1024;

  const resolvedExtension = resolveExtension({
    originalName,
    extension
  });

  const normalizedMimeType = normalizeMimeType(mimeType);

  /*
   * Validate file size.
   */
  if (
    actualFileSize === null ||
    !Number.isFinite(actualFileSize)
  ) {
    issues.push({
      code: "INVALID_FILE_SIZE",
      field: "fileSize",
      value: fileSize ?? null,
      message:
        "Uploaded file size could not be determined."
    });
  } else if (actualFileSize <= 0) {
    issues.push({
      code: "EMPTY_FILE",
      field: "fileSize",
      value: actualFileSize,
      message: "Uploaded file is empty."
    });
  } else if (actualFileSize > maximumFileSizeBytes) {
    issues.push({
      code: "FILE_TOO_LARGE",
      field: "fileSize",
      value: actualFileSize,
      message:
        `Uploaded file exceeds the maximum size of ` +
        `${maximumFileSizeMb} MB.`
    });
  }

  /*
   * Validate MIME type.
   */
  if (
    !normalizedMimeType ||
    !allowedMimeTypes.includes(normalizedMimeType)
  ) {
    issues.push({
      code: "UNSUPPORTED_MIME_TYPE",
      field: "mimeType",
      value: normalizedMimeType,
      message:
        `Unsupported file type ` +
        `'${normalizedMimeType || "unknown"}'. ` +
        `Allowed types: ${allowedMimeTypes.join(", ")}.`
    });
  }

  /*
   * Validate extension.
   */
  if (!resolvedExtension) {
    issues.push({
      code: "FILE_EXTENSION_MISSING",
      field: "extension",
      value: null,
      message:
        "The uploaded file extension could not be determined."
    });
  } else if (
    !allowedExtensions.includes(resolvedExtension)
  ) {
    issues.push({
      code: "UNSUPPORTED_FILE_EXTENSION",
      field: "extension",
      value: resolvedExtension,
      message:
        `Unsupported file extension '${resolvedExtension}'. ` +
        `Allowed extensions: ${allowedExtensions.join(", ")}.`
    });
  }

  return {
    valid: issues.length === 0,
    issues,

    metadata: {
      originalName: originalName ?? null,
      filePath: filePath ?? null,
      mimeType: normalizedMimeType,
      extension: resolvedExtension,
      sizeBytes: actualFileSize,
      allowedMimeTypes,
      allowedExtensions,
      maximumSizeBytes: maximumFileSizeBytes,
      maximumSizeMb: maximumFileSizeMb
    }
  };
}

/**
 * Current descriptive export name.
 *
 * Both export names point to the same implementation so older processor code
 * importing validateFile and newer code importing validateUploadedFile work.
 */
export const validateUploadedFile = validateFile;

/**
 * Resolve the actual file size.
 */
function resolveActualFileSize({
  fileSize,
  fileStats
}) {
  if (
    fileSize !== undefined &&
    fileSize !== null &&
    fileSize !== ""
  ) {
    const numericFileSize = Number(fileSize);

    return Number.isFinite(numericFileSize)
      ? numericFileSize
      : null;
  }

  if (fileStats) {
    return Number(fileStats.size);
  }

  return null;
}

/**
 * Resolve the file extension from either the original file name or an
 * explicitly supplied extension.
 */
function resolveExtension({
  originalName,
  extension
}) {
  if (originalName) {
    const derivedExtension = path
      .extname(String(originalName))
      .trim()
      .toLowerCase();

    if (derivedExtension) {
      return derivedExtension;
    }
  }

  if (!extension) {
    return null;
  }

  const normalizedExtension = String(extension)
    .trim()
    .toLowerCase();

  if (!normalizedExtension) {
    return null;
  }

  return normalizedExtension.startsWith(".")
    ? normalizedExtension
    : `.${normalizedExtension}`;
}

/**
 * Normalize a MIME type.
 */
function normalizeMimeType(mimeType) {
  if (!mimeType) {
    return null;
  }

  const normalizedMimeType = String(mimeType)
    .trim()
    .toLowerCase();

  return normalizedMimeType || null;
}

/**
 * Resolve allowed MIME types.
 */
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

  return [...DEFAULT_ALLOWED_MIME_TYPES];
}

/**
 * Resolve allowed file extensions.
 */
function resolveAllowedExtensions(filePolicy) {
  if (
    Array.isArray(filePolicy.allowedExtensions) &&
    filePolicy.allowedExtensions.length > 0
  ) {
    return filePolicy.allowedExtensions
      .map(normalizeExtension)
      .filter(Boolean);
  }

  const configuredExtensions =
    process.env.ALLOWED_DOCUMENT_EXTENSIONS;

  if (configuredExtensions) {
    const environmentExtensions =
      configuredExtensions
        .split(",")
        .map(normalizeExtension)
        .filter(Boolean);

    if (environmentExtensions.length > 0) {
      return environmentExtensions;
    }
  }

  return [...DEFAULT_ALLOWED_EXTENSIONS];
}

/**
 * Normalize one allowed extension.
 */
function normalizeExtension(value) {
  const normalizedValue = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue.startsWith(".")
    ? normalizedValue
    : `.${normalizedValue}`;
}

/**
 * Resolve the maximum permitted file size in megabytes.
 */
function resolveMaximumFileSizeMb(filePolicy) {
  const policyMegabytes = Number(
    filePolicy.maximumFileSizeMb
  );

  if (
    Number.isFinite(policyMegabytes) &&
    policyMegabytes > 0
  ) {
    return policyMegabytes;
  }

  const policyBytes = Number(
    filePolicy.maximumSizeBytes
  );

  if (
    Number.isFinite(policyBytes) &&
    policyBytes > 0
  ) {
    return policyBytes / 1024 / 1024;
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
