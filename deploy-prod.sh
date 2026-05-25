#!/usr/bin/env bash
set -euo pipefail

echo "=== Deploying chrono-ocr-api to PROD ==="
gcloud config set project scaffold-489910

gcloud run deploy chrono-ocr-api --source=. --project=scaffold-489910 --region=africa-south1 --platform=managed --allow-unauthenticated \
  --set-env-vars=PROJECT_ID=scaffold-489910,LOCATION=us,PROCESSOR_ID=399c99b0e212d96d,PERMANENT_BUCKET=scaffold_documents \
  --service-account=chrono-ocr-api@scaffold-489910.iam.gserviceaccount.com --port=8080 --memory=512Mi --min-instances=0 --max-instances=5

echo "=== PROD deploy complete ==="
