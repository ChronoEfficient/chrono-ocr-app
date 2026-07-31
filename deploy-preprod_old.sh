#!/usr/bin/env bash

set -euo pipefail

PROJECT_ID="scaffold-489910"
REGION="africa-south1"
SERVICE_NAME="chrono-idp-api-preprod"
SERVICE_ACCOUNT="chrono-ocr-api@scaffold-489910.iam.gserviceaccount.com"

# Vertex AI location used by Gemini.
# Keep this aligned with the location that worked during local testing.
GOOGLE_CLOUD_LOCATION="global"

# Resolve paths relative to this script, regardless of the current terminal folder.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="${SCRIPT_DIR}/idp-service"

echo "Deploying Chrono IDP API"
echo "Project       : ${PROJECT_ID}"
echo "Region        : ${REGION}"
echo "Service       : ${SERVICE_NAME}"
echo "Source        : ${SOURCE_DIR}"
echo "Service account: ${SERVICE_ACCOUNT}"

if [[ ! -d "${SOURCE_DIR}" ]]; then
  echo "Error: IDP source directory not found: ${SOURCE_DIR}" >&2
  exit 1
fi

if [[ ! -f "${SOURCE_DIR}/package.json" ]]; then
  echo "Error: package.json not found in: ${SOURCE_DIR}" >&2
  exit 1
fi

if [[ ! -f "${SOURCE_DIR}/Dockerfile" ]]; then
  echo "Error: Dockerfile not found in: ${SOURCE_DIR}" >&2
  exit 1
fi

gcloud run deploy "${SERVICE_NAME}" \
  --source="${SOURCE_DIR}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --platform=managed \
  --no-allow-unauthenticated \
  --service-account="${SERVICE_ACCOUNT}" \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=5 \
  --set-env-vars="NODE_ENV=preprod,GOOGLE_CLOUD_PROJECT=${PROJECT_ID},PROJECT_ID=${PROJECT_ID},GOOGLE_CLOUD_LOCATION=${GOOGLE_CLOUD_LOCATION},GEMINI_OCR_MODEL=gemini-2.5-flash,GEMINI_TEMPERATURE=0.1,MAX_FILE_SIZE_MB=10"

SERVICE_URL="$(
  gcloud run services describe "${SERVICE_NAME}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --format='value(status.url)'
)"

REVISION="$(
  gcloud run services describe "${SERVICE_NAME}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --format='value(status.latestReadyRevisionName)'
)"

echo
echo "Deployment complete"
echo "Service : ${SERVICE_NAME}"
echo "Revision: ${REVISION}"
echo "URL     : ${SERVICE_URL}"
echo

echo "Testing health endpoint..."

curl --fail --silent --show-error \
  "${SERVICE_URL}/health" \
  | python3 -m json.tool

echo
echo "Pre-production health check successful."
