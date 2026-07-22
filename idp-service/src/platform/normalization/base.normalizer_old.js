// src/engine/normalizers/base.normalizer.js

function normalizeText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized || null;
}

function normalizeUppercase(value) {
  const normalized = normalizeText(value);

  return normalized
    ? normalized.toUpperCase()
    : null;
}

function normalizePersonName(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  return normalized
    .toLowerCase()
    .split(/\s+/)
    .map((word) =>
      word
        .split("-")
        .map((part) =>
          part
            .split("'")
            .map((piece) =>
              piece
                ? piece.charAt(0).toUpperCase() +
                  piece.slice(1)
                : piece
            )
            .join("'")
        )
        .join("-")
    )
    .join(" ");
}

function normalizeDigits(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const digits = String(value).replace(/\D/g, "");

  return digits || null;
}

function isValidDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function normalizeDate(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

  let match = normalized.match(isoDatePattern);

  if (match) {
    const [, year, month, day] = match;

    if (
      !isValidDate(
        Number(year),
        Number(month),
        Number(day)
      )
    ) {
      return null;
    }

    return normalized;
  }

  const slashOrDashPattern =
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;

  match = normalized.match(slashOrDashPattern);

  if (match) {
    const [, day, month, year] = match;

    if (
      !isValidDate(
        Number(year),
        Number(month),
        Number(day)
      )
    ) {
      return null;
    }

    return (
      `${year}-` +
      `${month.padStart(2, "0")}-` +
      `${day.padStart(2, "0")}`
    );
  }

  return null;
}

export {
  normalizeText,
  normalizeUppercase,
  normalizePersonName,
  normalizeDigits,
  normalizeDate
};
