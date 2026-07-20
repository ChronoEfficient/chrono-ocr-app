/**
 * Convert Gemini and Vertex AI errors into stable IDP error codes.
 */
export function mapGeminiError(error) {
  const status =
    error?.status ??
    error?.statusCode ??
    error?.code ??
    error?.response?.status;

  const message =
    error?.message ??
    error?.response?.data?.error
      ?.message ??
    "Gemini document extraction failed.";

  if (
    status === 429 ||
    String(status) === "429" ||
    message.includes("RESOURCE_EXHAUSTED")
  ) {
    return createProcessingError({
      code: "GEMINI_CAPACITY_UNAVAILABLE",
      message:
        "Gemini processing capacity is temporarily unavailable.",
      retryable: true,
      details: [
        {
          providerStatus:
            status ?? 429,
          providerMessage: message
        }
      ],
      cause: error
    });
  }

  if (
    status === 401 ||
    status === 403 ||
    String(status) === "401" ||
    String(status) === "403"
  ) {
    return createProcessingError({
      code: "GEMINI_AUTHENTICATION_FAILED",
      message:
        "The IDP service could not authenticate with Vertex AI.",
      retryable: false,
      details: [
        {
          providerStatus: status,
          providerMessage: message
        }
      ],
      cause: error
    });
  }

  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    ["500", "502", "503", "504"].includes(
      String(status)
    )
  ) {
    return createProcessingError({
      code: "GEMINI_SERVICE_UNAVAILABLE",
      message:
        "Gemini is temporarily unavailable. " +
        "The request may be retried.",
      retryable: true,
      details: [
        {
          providerStatus: status,
          providerMessage: message
        }
      ],
      cause: error
    });
  }

  if (error instanceof SyntaxError) {
    return createProcessingError({
      code: "GEMINI_RESPONSE_PARSE_FAILED",
      message:
        "Gemini returned a response that could not be parsed.",
      retryable: true,
      details: [
        {
          providerMessage: message
        }
      ],
      cause: error
    });
  }

  return createProcessingError({
    code: "GEMINI_EXTRACTION_FAILED",
    message:
      "Gemini document extraction failed.",
    retryable: false,
    details: [
      {
        providerStatus:
          status ?? null,
        providerMessage: message
      }
    ],
    cause: error
  });
}

/**
 * Create a consistent processing error.
 */
export function createProcessingError({
  code,
  message,
  retryable = false,
  details = [],
  cause
}) {
  const error = new Error(
    message,
    cause ? { cause } : undefined
  );

  error.name =
    "DocumentProcessingError";
  error.code = code;
  error.retryable = retryable;
  error.details =
    Array.isArray(details)
      ? details
      : [details];

  return error;
}
