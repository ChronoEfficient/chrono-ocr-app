# Chrono OCR API

## Overview

`chrono-ocr-app` is a small **FastAPI** service that turns uploaded identity and banking documents into verified, structured JSON. It is packaged as a container (`python:3.11-slim`) and deployed to **Google Cloud Run** as `chrono-ocr-api` in `us-central1`.

The service supports two South-African document types:

- **`id_document`** — SA Smart ID Card, Green ID Book, Temporary ID Certificate.
- **`proof_of_banking`** — bank statements / proof-of-banking letters from the major SA banks (FNB, ABSA, Standard Bank, Nedbank, Capitec, Investec, TymeBank, African Bank, Bidvest).

Accepted upload formats are PDF, PNG, JPG, and JPEG. OCR is delegated to **Google Document AI**; verified originals can be archived to **Google Cloud Storage** under a per-employee path along with a JSON metadata sidecar.

Live URL (preprod): `https://chrono-ocr-api-40690941869.us-central1.run.app`.

## High-level flow

For every request the service walks a fixed pipeline:

1. **Upload** — multipart `file` (and, for `/store/*`, an `employee_number` + `document_type`).
2. **Quality check** (`imageQuality.assess_image_quality`) — resolution, blur, brightness. PDFs are skipped here.
3. **OCR** (`ocrExtraction.extract_ocr_from_bytes`) — Document AI returns full text plus per-page lines / paragraphs / tables (the "layout").
4. **Verification** — `idVerification.verify_sa_id_document` or `bankingVerification.verify_banking_document`.
5. **Confidence scoring** — weighted 0–1 score with `low` / `medium` / `high` bands, penalised by quality flags.
6. **Consistency checks** — for IDs, OCR fields vs values derived from the ID number; for banking, presence + numeric/length sanity on extracted fields.
7. **Optional storage** (`/store/*` only) — when `document_verified` is `True`, the original bytes plus the full response envelope are written to GCS.
8. **JSON response** with the merged result.

For ID documents the pipeline runs **twice** on failure: once on the original bytes, then again on a preprocessed copy (`imagePreprocessing.preprocess_image`) if the first pass did not verify. Banking documents use a single pass.

## HTTP API

All endpoints are defined in `main.py`. All accept `multipart/form-data`.

| Method | Path | Form fields | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | — | Liveness + supported formats / extractions. |
| `POST` | `/ocr/document` | `file` | Raw Document AI OCR + image-quality assessment. No verification. |
| `POST` | `/verify/id` | `file` | SA-ID verification with preprocessed-fallback retry. |
| `POST` | `/verify/banking` | `file` | Proof-of-banking verification (single pass). |
| `POST` | `/store/id` | `file`, `employee_number`, `document_type` (default `Id_document`) | Verify SA ID; if verified, persist to GCS. |
| `POST` | `/store/banking` | `file`, `employee_number`, `document_type` (default `Proof_of_banking`) | Verify proof of banking; if verified, persist to GCS. |
| `POST` | `/extract/document` | `file`, `expected_type` (`id_document` or `proof_of_banking`) | Routes to `/verify/id` or `/verify/banking`. |

### Response envelope (ID example)

```json
{
  "success": true,
  "expected_type": "id_document",
  "filename": "Id.png",
  "mime_type": "image/png",
  "quality": { "quality_checked": true, "blur_score": 312.4, "ocr_ready": true, "warnings": [] },
  "ocr_attempt": "original",
  "confidence": { "overall_score": 0.95, "confidence_band": "high", "factors": ["..."] },
  "consistency": { "passed": true, "checks": { "dob": {...}, "gender": {...}, "nationality": {...} }, "warnings": [] },
  "storage": null,
  "document_type": "id_document",
  "document_variant": "sa_smart_id_card",
  "capture_type": "unknown",
  "document_verified": true,
  "verification_status": "verified",
  "requires_review": false,
  "verification": { "matched_indicators": [...], "warnings": [], "reason": null },
  "fields": {
    "surname": "...", "names": "...", "date_of_birth_ocr": "...", "sex_ocr": "...", "nationality": "...",
    "id_number": "...", "id_number_valid": true, "checksum_status": "passed",
    "date_of_birth_derived": "1990-01-28", "gender_derived": "Male"
  }
}
```

When the ID pipeline falls back to the preprocessed bytes, `ocr_attempt` becomes `"preprocessed_fallback"` and an `original_attempt` block records the failed first pass.

### Response envelope (banking example)

```json
{
  "success": true,
  "expected_type": "proof_of_banking",
  "ocr_attempt": "original",
  "document_type": "proof_of_banking",
  "document_verified": true,
  "verification_status": "verified",
  "fields": {
    "bank_name": "CAPITEC",
    "account_holder": "Jane Doe",
    "account_number": "1234567890",
    "branch_code": "470010",
    "account_type": "Savings Account"
  }
}
```

## Pipeline stages

### `imageQuality.py`
OpenCV + PIL. Computes:

- `resolution_ok` — `width >= 800 and height >= 500`.
- `blur_score` — variance of Laplacian; `< 80` flags `blur_detected`.
- `brightness` — mean grayscale; `< 70` is `low_light`, `> 220` is `over_exposed`.
- `ocr_ready` — all four checks pass.

PDFs short-circuit with `quality_checked: false` and a reason.

### `imagePreprocessing.py`
Only used as the ID-pipeline fallback. Steps: grayscale → `cv2.fastNlMeansDenoising` → `cv2.equalizeHist` → upscale to a width of `1200` via `INTER_CUBIC` when smaller → re-encode as PNG bytes. PDFs are passed through unchanged.

### `ocrExtraction.py`
Single boundary against Google Document AI. Allowed MIME types: `application/pdf`, `image/png`, `image/jpeg`, `image/jpg`. Returns:

```json
{
  "success": true,
  "filename": "...",
  "mime_type": "...",
  "text": "<full document text>",
  "layout": [ { "page_number": 1, "lines": [...], "paragraphs": [...], "tables": [...] } ]
}
```

Each line/paragraph carries `{ text, confidence }`. Tables expose `header_rows` and `body_rows` as 2-D string arrays.

### `idVerification.py`
- **Variant detection** (`detect_id_variant`) keyed on phrases: `NATIONAL IDENTITY CARD` → `sa_smart_id_card`; `IDENTITY DOCUMENT` / `GREEN BARCODED` → `sa_green_id_book`; `TEMPORARY IDENTITY CERTIFICATE` → `sa_temporary_id`; otherwise `unknown_sa_id` if Republic-of-SA + identity-number labels are present, else `unknown`.
- **ID number extraction** — matches `\b\d{13}\b` and also recovers `13-digit groups split by spaces/dashes`.
- **Checksum** (`validate_sa_id`) — Luhn-style: odd-position sum + the doubled-and-digit-summed even-position concatenation must complete to a multiple of 10. Also requires the first 6 digits to parse as `YYMMDD`.
- **Derived fields** — `derive_birth_date` chooses century by comparing `YY` to the current year; `derive_gender` is `Male` when `digits[6:10] >= 5000`, else `Female`.
- **Label/value parsing** (`extract_label_value`) — line-based, label-then-colon or label-on-its-own-line followed by the value on the next line. Labels are normalised via `ocrNormalization.normalize_label`.
- **Decision** — `appears_to_be_sa_id` requires Republic-of-SA + identity-number label + a detected ID number. Verified state is `verified` when the checksum passes and `accepted_with_warnings` when it does not (`requires_review: true`).

### `ocrNormalization.py`
Cleans up OCR'd label text. Has a static fix-table for the common mistakes (`SUMAME` → `SURNAME`, `DATE 0F BIRTH` → `DATE OF BIRTH`, etc.) and falls back to `difflib.SequenceMatcher` similarity against a canonical list, accepting matches at `>= 0.82`.

### `bankingVerification.py`
- **Bank name** — substring match against `SA_BANKS`.
- **Keywords** — counts hits among `ACCOUNT NUMBER`, `BRANCH CODE`, `BANK STATEMENT`, etc.
- **Account number** — label lookup, then digit-strip; accepts `6–16` digits. Falls back to the first `\b\d{6,16}\b` in the text.
- **Branch code** — label lookup, scanning the next 3 lines for a `3–6`-digit value. Falls back to the first `\b\d{6}\b` only if no label was found.
- **Account holder** — labelled value first, then the first line that "looks like a person name" (`looks_like_person_name`: ≥ 2 words, ≥ 4 alpha chars, no digits, not on the bank/keyword/boilerplate-phrase blacklists).
- **Account type** — labelled value first, else substring scan against `ACCOUNT_TYPE_WORDS`.
- **Layout-first extraction** (`extract_from_layout`) is tried before the plain-text variants for account number, branch code, holder, and type — useful when Document AI gives clean per-line text but the raw `text` blob is noisy.
- **Decision** — verified when `bank_name`, `account_number`, **and** at least one keyword match are present. Missing fields produce warnings; any warnings downgrade to `accepted_with_warnings`.

### `confidenceScoring.py` (IDs)
Sums weighted contributions and caps at 1.0. Major weights:

| Signal | Weight |
| --- | --- |
| `republic_of_south_africa` indicator | +0.15 |
| `identity_number_label` indicator | +0.15 |
| Variant detected | +0.10 |
| ID number extracted | +0.20 |
| Surname extracted | +0.10 |
| Names extracted | +0.10 |
| DOB extracted from OCR | +0.05 |
| Nationality extracted | +0.05 |
| SA-ID checksum passed | +0.15 |
| Resolution low | −0.05 |
| Blur detected | −0.10 |
| Low light | −0.05 |
| Over exposed | −0.05 |

Bands: `>= 0.90` high, `>= 0.70` medium, otherwise low.

### `bankingConfidenceScoring.py`
Same shape with different weights: `bank_name_detected` +0.20, `banking_keywords_detected` +0.15, `account_number` +0.25, `branch_code` +0.15, `account_holder` +0.15, `account_type` +0.10. Quality penalties are identical to the ID scorer.

### `consistencyChecks.py` (IDs)
Compares OCR-extracted values to values derived from the ID number:

- `dob` — `normalize_ocr_dob` parses either `DD MON YYYY` or `YYYY-MM-DD`, then compares with `date_of_birth_derived`.
- `gender` — `normalize_gender` (`M`/`MALE` / `F`/`FEMALE`) vs `gender_derived`.
- `nationality` — expects `RSA` or `SOUTH AFRICAN`.

Each check returns `match: true | false | null` (null when one side is missing). Any false produces a warning and `passed: false`.

### `bankingConsistencyChecks.py`
Presence checks for all five banking fields, plus numeric/length sanity on `account_number` (6–16 digits) and `branch_code` (3–6 digits).

### `storageService.py`
Uses `google-cloud-storage`. Bucket comes from `PERMANENT_BUCKET` (defaults to `scaffold_documents_preprod`). Object path:

```
gs://{PERMANENT_BUCKET}/employees/{employee_number}/{document_type}/{YYYYMMDDTHHMMSSZ}_{uuid4hex}_{filename}
```

A second blob with the suffix `.metadata.json` is written alongside it, containing the full response envelope plus upload provenance (`uploaded_at`, `file_gcs_uri`, etc.). Both `employee_number`, `document_type`, and `filename` are sanitised by `safe_name` (only `A–Z`, `0–9`, `_`, `-`, `.` are preserved).

The return value gives callers `bucket`, `object_name`, `gcs_uri`, `document_url` (HTTPS), and a nested `metadata` pointer.

## Configuration

Required environment variables (read at module import in `ocrExtraction.py` and at upload time in `storageService.py`):

| Variable | Used by | Notes |
| --- | --- | --- |
| `PROJECT_ID` | `ocrExtraction.py` | GCP project for Document AI. |
| `LOCATION` | `ocrExtraction.py` | Document AI region, e.g. `us`. Drives the API endpoint `{LOCATION}-documentai.googleapis.com`. |
| `PROCESSOR_ID` | `ocrExtraction.py` | Document AI processor. |
| `PERMANENT_BUCKET` | `storageService.py` | GCS bucket; defaults to `scaffold_documents_preprod`. |

The Cloud Run service runs as `chrono-ocr-api@scaffold-489910.iam.gserviceaccount.com` and is deployed with `--allow-unauthenticated`.

## Running it

### Locally

```bash
pip install -r requirements.txt
export PROJECT_ID=...
export LOCATION=us
export PROCESSOR_ID=...
export PERMANENT_BUCKET=scaffold_documents_preprod
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

Local runs still need GCP credentials (`gcloud auth application-default login` or a service-account key via `GOOGLE_APPLICATION_CREDENTIALS`) because every request hits Document AI.

### Container

The `Dockerfile` is the standard FastAPI/uvicorn shape:

```
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

### Deploy to Cloud Run

From `README.md`:

```bash
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
```

### Smoke tests

```bash
# Generic dispatcher
curl -s -X POST $URL/extract/document \
  -F "expected_type=id_document" -F "file=@Id.png" | python3 -m json.tool

# ID verify only
curl -s -X POST $URL/verify/id -F "file=@Id.png" | python3 -m json.tool

# ID verify + store
curl -s -X POST $URL/store/id \
  -F "employee_number=RIT0001" \
  -F "document_type=Id_document" \
  -F "file=@Id.png" | python3 -m json.tool

# Banking verify
curl -s -X POST $URL/verify/banking -F "file=@banking.pdf" | python3 -m json.tool

# Banking verify + store
curl -s -X POST $URL/store/banking \
  -F "employee_number=RIT0001" \
  -F "document_type=Proof_of_banking" \
  -F "file=@banking.pdf" | python3 -m json.tool
```

## Repository layout

```
.
├── Dockerfile
├── README.md                       # Deploy + curl cheat sheet
├── requirements.txt
├── main.py                         # FastAPI app + endpoint orchestration
├── main_old.py                     # Earlier minimal version (not wired in)
├── ocrExtraction.py                # Document AI boundary
├── imageQuality.py                 # Resolution / blur / brightness checks
├── imagePreprocessing.py           # Grayscale + denoise + equalize + upscale
├── idVerification.py               # SA ID detection, checksum, field parse
├── ocrNormalization.py             # Fuzzy / fix-table label cleanup
├── bankingVerification.py          # Bank + keyword + field detection
├── confidenceScoring.py            # ID 0–1 score
├── bankingConfidenceScoring.py     # Banking 0–1 score
├── consistencyChecks.py            # OCR-vs-derived cross-check for IDs
├── bankingConsistencyChecks.py     # Presence/numeric/length checks for banking
├── storageService.py               # GCS upload + metadata sidecar
├── Id.png, sa_id.png               # ID fixtures
├── absa.png, capitec.jpg,
│   sbsa.pdf, sbsa_(1).pdf,
│   stocktest.{jpg,pdf}             # Banking fixtures
```

## Known gaps

- `imageQuality` is image-only; PDF uploads bypass quality scoring entirely.
- The banking pipeline has no preprocessed-fallback retry — only `/verify/id` and `/store/id` do.
- There are no automated tests in the repo.
- `main_old.py` is dead code kept beside the live `main.py`.
- Document AI credentials are read at import time (`os.environ["PROJECT_ID"]` etc.), so missing env vars crash the process at startup rather than producing a friendly health-check failure.
