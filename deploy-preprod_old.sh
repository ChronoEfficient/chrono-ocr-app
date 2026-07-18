#!/usr/bin/env bash
set -euo pipefail

echo "=== Deploying chrono-idp-api to PREPROD ==="
gcloud config set project scaffold-489910

gcloud run deploy chrono-idp-api-preprod --source=. --project=scaffold-489910 --region=africa-south1 --platform=managed --allow-unauthenticated \
  --set-env-vars=PROJECT_ID=scaffold-489910,LOCATION=us,PROCESSOR_ID=399c99b0e212d96d,PERMANENT_BUCKET=scaffold_documents_preprod \
  --service-account=chrono-ocr-api@scaffold-489910.iam.gserviceaccount.com --port=8080 --memory=512Mi --min-instances=0 --max-instances=5

echo "=== PREPROD deploy complete ==="
