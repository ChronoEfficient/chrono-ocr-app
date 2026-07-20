import sharp from "sharp";

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png"
]);

const DEFAULT_POLICY = {
  minimumWidth: 600,
  minimumHeight: 400,
  minimumPixelCount: 300000,
  minimumSharpnessScore: 12,
  rejectBelowWidth: 250,
  rejectBelowHeight: 150
};

function resolvePolicy(qualityPolicy = {}) {
  return {
    minimumWidth:
      Number(qualityPolicy.minimumWidth) ||
      DEFAULT_POLICY.minimumWidth,

    minimumHeight:
      Number(qualityPolicy.minimumHeight) ||
      DEFAULT_POLICY.minimumHeight,

    minimumPixelCount:
      Number(qualityPolicy.minimumPixelCount) ||
      DEFAULT_POLICY.minimumPixelCount,

    minimumSharpnessScore:
      Number(qualityPolicy.minimumSharpnessScore) ||
      DEFAULT_POLICY.minimumSharpnessScore,

    rejectBelowWidth:
      Number(qualityPolicy.rejectBelowWidth) ||
      DEFAULT_POLICY.rejectBelowWidth,

    rejectBelowHeight:
      Number(qualityPolicy.rejectBelowHeight) ||
      DEFAULT_POLICY.rejectBelowHeight
  };
}

function calculateSharpnessScore(pixelData, width, height) {
  if (!pixelData || width < 3 || height < 3) {
    return 0;
  }

  let totalDifference = 0;
  let comparisons = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const current = pixelData[index];

      const horizontalDifference = Math.abs(
        current - pixelData[index - 1]
      );

      const verticalDifference = Math.abs(
        current - pixelData[index - width]
      );

      totalDifference +=
        horizontalDifference + verticalDifference;

      comparisons += 2;
    }
  }

  if (comparisons === 0) {
    return 0;
  }

  return Number(
    (totalDifference / comparisons).toFixed(2)
  );
}

export async function assessDocumentQuality({
  filePath,
  mimeType,
  qualityPolicy = {}
}) {
  const normalizedMimeType = String(
    mimeType || ""
  ).toLowerCase();

  if (!IMAGE_MIME_TYPES.has(normalizedMimeType)) {
    return {
      status: "NOT_ASSESSED",
      acceptable: true,
      reviewRequired: false,
      issues: [],
      warnings: [
        "Automated image-quality assessment is currently available only for JPEG and PNG files."
      ],
      metrics: {
        mimeType: normalizedMimeType || null
      }
    };
  }

  const policy = resolvePolicy(qualityPolicy);

  let metadata;
  let grayscaleImage;

  try {
    const image = sharp(filePath, {
      failOn: "error"
    });

    metadata = await image.metadata();

    grayscaleImage = await image
      .clone()
      .rotate()
      .resize({
        width: 800,
        height: 800,
        fit: "inside",
        withoutEnlargement: true
      })
      .grayscale()
      .raw()
      .toBuffer({
        resolveWithObject: true
      });
  } catch (cause) {
    const error = new Error(
      "The uploaded image could not be analysed."
    );

    error.code = "IMAGE_QUALITY_ASSESSMENT_FAILED";
    error.statusCode = 400;
    error.details = [
      cause.message || "The image may be damaged or unreadable."
    ];

    throw error;
  }

  const width = Number(metadata.width || 0);
  const height = Number(metadata.height || 0);
  const pixelCount = width * height;

  const sharpnessScore = calculateSharpnessScore(
    grayscaleImage.data,
    grayscaleImage.info.width,
    grayscaleImage.info.height
  );

  const issues = [];
  const warnings = [];

  if (
    width < policy.rejectBelowWidth ||
    height < policy.rejectBelowHeight
  ) {
    issues.push(
      `Image dimensions ${width}×${height} are too small for reliable document processing.`
    );
  } else {
    if (
      width < policy.minimumWidth ||
      height < policy.minimumHeight
    ) {
      warnings.push(
        `Image resolution ${width}×${height} is below the recommended minimum of ` +
          `${policy.minimumWidth}×${policy.minimumHeight}.`
      );
    }

    if (pixelCount < policy.minimumPixelCount) {
      warnings.push(
        "The image contains fewer pixels than recommended for reliable extraction."
      );
    }
  }

  if (sharpnessScore < policy.minimumSharpnessScore) {
    warnings.push(
      `The image may be blurred. Sharpness score ${sharpnessScore} is below ` +
        `the configured threshold ${policy.minimumSharpnessScore}.`
    );
  }

  const acceptable = issues.length === 0;
  const reviewRequired =
    issues.length > 0 || warnings.length > 0;

  return {
    status: acceptable ? "ASSESSED" : "REJECTED",
    acceptable,
    reviewRequired,
    issues,
    warnings,
    metrics: {
      mimeType: normalizedMimeType,
      format: metadata.format || null,
      width,
      height,
      pixelCount,
      orientation: metadata.orientation || null,
      density: metadata.density || null,
      sharpnessScore
    },
    policy
  };
}
