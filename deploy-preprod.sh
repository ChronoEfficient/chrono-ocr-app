#!/usr/bin/env bash

set -euo pipefail

# ------------------------------------------------------------
# Chrono IDP API – Pre-production deployment
# ------------------------------------------------------------

PROJECT_ID="scaffold-489910"
REGION="africa-south1"
SERVICE_NAME="chrono-idp-api-preprod"
SERVICE_ACCOUNT="chrono-ocr-api@scaffold-489910.iam.gserviceaccount.com"

# Vertex AI location used by Gemini.
# Keep this aligned with the location that worked during local testing.
GOOGLE_CLOUD_LOCATION="global"

# Cloud Run configuration.
MEMORY="1Gi"
CPU="1"
TIMEOUT="300"
CONCURRENCY="10"
MIN_INSTANCES="0"
MAX_INSTANCES="5"

# Application configuration.
GEMINI_OCR_MODEL="gemini-2.5-flash"
GEMINI_TEMPERATURE="0.1"
MAX_FILE_SIZE_MB="10"

# Resolve paths relative to this script, regardless of the
# directory from which the script is executed.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="${SCRIPT_DIR}/idp-service"

# Give each deployment a recognisable Cloud Run revision.
REVISION_SUFFIX="$(date -u +%Y%m%d-%H%M%S)"

echo "=============================================="
echo " Deploying Chrono IDP API"
echo "=============================================="
echo "Project          : ${PROJECT_ID}"
echo "Region           : ${REGION}"
echo "Service          : ${SERVICE_NAME}"
echo "Source           : ${SOURCE_DIR}"
echo "Service account  : ${SERVICE_ACCOUNT}"
echo "Revision suffix  : ${REVISION_SUFFIX}"
echo "Memory           : ${MEMORY}"
echo "CPU              : ${CPU}"
echo "Timeout          : ${TIMEOUT} seconds"
echo "Concurrency      : ${CONCURRENCY}"
echo "Gemini location  : ${GOOGLE_CLOUD_LOCATION}"
echo "Gemini model     : ${GEMINI_OCR_MODEL}"
echo "=============================================="

# ------------------------------------------------------------
# Pre-deployment validation
# ------------------------------------------------------------

if ! command -v gcloud >/dev/null 2>&1; then
  echo "Error: gcloud CLI is not installed or is not in PATH." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "Error: curl is not installed or is not in PATH." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 is not installed or is not in PATH." >&2
  exit 1
fi

if [[ ! -d "${SOURCE_DIR}" ]]; then
  echo "Error: IDP source directory not found: ${SOURCE_DIR}" >&2
  exit 1
fi

if [[ ! -f "${SOURCE_DIR}/package.json" ]]; then
  echo "Error: package.json not found in: ${SOURCE_DIR}" >&2
  exit 1
fi

if [[ ! -f "${SOURCE_DIR}/package-lock.json" ]]; then
  echo "Error: package-lock.json not found in: ${SOURCE_DIR}" >&2
  exit 1
fi

if [[ ! -f "${SOURCE_DIR}/Dockerfile" ]]; then
  echo "Error: Dockerfile not found in: ${SOURCE_DIR}" >&2
  exit 1
fi

if [[ ! -f "${SOURCE_DIR}/src/server.js" ]]; then
  echo "Error: src/server.js not found in: ${SOURCE_DIR}" >&2
  exit 1
fi

echo
echo "Validating Google Cloud configuration..."

gcloud projects describe "${PROJECT_ID}" \
  --format="value(projectId)" \
  >/dev/null

if ! gcloud iam service-accounts describe "${SERVICE_ACCOUNT}" \
  --project="${PROJECT_ID}" \
  --format="value(email)" \
  >/dev/null 2>&1; then
  echo "Error: Service account does not exist or is not accessible:" >&2
  echo "       ${SERVICE_ACCOUNT}" >&2
  exit 1
fi

# ------------------------------------------------------------
# Deploy
# ------------------------------------------------------------

echo
echo "Deploying Cloud Run service..."

gcloud run deploy "${SERVICE_NAME}" \
  --source="${SOURCE_DIR}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --platform=managed \
  --execution-environment=gen2 \
  --no-allow-unauthenticated \
  --service-account="${SERVICE_ACCOUNT}" \
  --port=8080 \
  --memory="${MEMORY}" \
  --cpu="${CPU}" \
  --timeout="${TIMEOUT}" \
  --concurrency="${CONCURRENCY}" \
  --min-instances="${MIN_INSTANCES}" \
  --max-instances="${MAX_INSTANCES}" \
  --revision-suffix="${REVISION_SUFFIX}" \
  --set-env-vars="NODE_ENV=preprod,GOOGLE_CLOUD_PROJECT=${PROJECT_ID},PROJECT_ID=${PROJECT_ID},GOOGLE_CLOUD_LOCATION=${GOOGLE_CLOUD_LOCATION},GEMINI_OCR_MODEL=${GEMINI_OCR_MODEL},GEMINI_TEMPERATURE=${GEMINI_TEMPERATURE},MAX_FILE_SIZE_MB=${MAX_FILE_SIZE_MB}"

# ------------------------------------------------------------
# Resolve deployment information
# ------------------------------------------------------------

SERVICE_URL="$(
  gcloud run services describe "${SERVICE_NAME}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --format="value(status.url)"
)"

REVISION="$(
  gcloud run services describe "${SERVICE_NAME}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --format="value(status.latestReadyRevisionName)"
)"

if [[ -z "${SERVICE_URL}" ]]; then
  echo "Error: Cloud Run service URL could not be resolved." >&2
  exit 1
fi

if [[ -z "${REVISION}" ]]; then
  echo "Error: Latest ready revision could not be resolved." >&2
  exit 1
fi

echo
echo "=============================================="
echo " Deployment complete"
echo "=============================================="
echo "Service          : ${SERVICE_NAME}"
echo "Revision         : ${REVISION}"
echo "URL              : ${SERVICE_URL}"
echo "Health endpoint  : ${SERVICE_URL}/health"
echo "Extract endpoint : ${SERVICE_URL}/documents/extract"
echo "=============================================="
