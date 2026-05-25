PROJECT_ID="scaffold-489910"
LOCATION="us"
PROCESSOR_ID="399c99b0e212d96d"
SERVICE_ACCOUNT="chrono-ocr-api@scaffold-489910.iam.gserviceaccount.com"
PERMANENT_BUCKET="scaffold_documents_preprod"
 
 
gcloud run deploy chrono-ocr-api \
  --source . \
  --region us-central1 \
  --service-account $SERVICE_ACCOUNT \
  --set-env-vars PROJECT_ID=$PROJECT_ID,LOCATION=$LOCATION,PROCESSOR_ID=$PROCESSOR_ID,PERMANENT_BUCKET=$PERMANENT_BUCKET \
  --allow-unauthenticated
 
 
Service URL: https://chrono-ocr-api-preprod-shw7pw57rq-bq.a.run.app
 
curl -i -X POST https://chrono-ocr-api-preprod-shw7pw57rq-bq.a.run.app/extract/document -F "expected_type=id_document" -F "file=@Id.png"  | python3 -m json.tool
curl X POST https://chrono-ocr-api-preprod-shw7pw57rq-bq.a.run.app/extract/document -F "file=@Id.png"  | python3 -m json.tool
 
 
ID verification only:
curl -s -X POST https://chrono-ocr-api-preprod-shw7pw57rq-bq.a.run.app/verify/id -F "file=@Id.png" | python3 -m json.tool
 
ID verification and storage:
curl -s -X POST https://chrono-ocr-api-preprod-shw7pw57rq-bq.a.run.app/store/id \
  -F "employee_number=RIT0001" \
  -F "document_type=Id_document" \
  -F "file=@Id.png" | python3 -m json.tool
 
 
 
Proof of banking verification only:
curl -s -X POST https://chrono-ocr-api-preprod-shw7pw57rq-bq.a.run.app/verify/banking \
  -F "file=@banking.pdf" | python3 -m json.tool
 
Proof of banking verification and store:
curl -s -X POST https://chrono-ocr-api-preprod-shw7pw57rq-bq.a.run.app/store/banking \
  -F "employee_number=RIT0001" \
  -F "document_type=Proof_of_banking" \
  -F "file=@banking.pdf" | python3 -m json.tool


Proof of address verification only:
curl -s -X POST https://chrono-ocr-api-preprod-shw7pw57rq-bq.a.run.app/verify/address \
  -F "file=@utility_bill.pdf" | python3 -m json.tool

Proof of address verification and store:
curl -s -X POST https://chrono-ocr-api-preprod-shw7pw57rq-bq.a.run.app/store/address \
  -F "employee_number=RIT0001" \
  -F "document_type=Proof_of_address" \
  -F "file=@utility_bill.pdf" | python3 -m json.tool
