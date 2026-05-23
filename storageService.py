import os
import re
import uuid
import json
from datetime import datetime, timezone

from google.cloud import storage


BUCKET_NAME = os.environ.get(
    "PERMANENT_BUCKET",
    "scaffold_documents_preprod"
)


def safe_name(value: str) -> str:
    value = value.strip()
    value = re.sub(r"[^A-Za-z0-9_\-\.]", "_", value)
    return value


def save_document_to_gcs(
    file_bytes: bytes,
    filename: str,
    content_type: str,
    employee_number: str,
    document_type: str,
    metadata: dict | None = None
):
    storage_client = storage.Client()
    bucket = storage_client.bucket(BUCKET_NAME)

    safe_employee_number = safe_name(employee_number)
    safe_document_type = safe_name(document_type)
    safe_filename = safe_name(filename)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    unique_id = uuid.uuid4().hex

    base_path = f"employees/{safe_employee_number}/{safe_document_type}"
    file_object_name = f"{base_path}/{timestamp}_{unique_id}_{safe_filename}"
    metadata_object_name = f"{base_path}/{timestamp}_{unique_id}_{safe_filename}.metadata.json"

    file_blob = bucket.blob(file_object_name)
    file_blob.upload_from_string(
        file_bytes,
        content_type=content_type
    )

    metadata_result = None

    if metadata is not None:
        metadata_payload = {
            "employee_number": employee_number,
            "document_type": document_type,
            "original_filename": filename,
            "content_type": content_type,
            "uploaded_at": timestamp,
            "file_gcs_uri": f"gs://{BUCKET_NAME}/{file_object_name}",
            "metadata": metadata
        }

        metadata_blob = bucket.blob(metadata_object_name)
        metadata_blob.upload_from_string(
            json.dumps(metadata_payload, indent=2),
            content_type="application/json"
        )

        metadata_result = {
            "object_name": metadata_object_name,
            "gcs_uri": f"gs://{BUCKET_NAME}/{metadata_object_name}"
        }

    return {
        "stored": True,
        "bucket": BUCKET_NAME,
        "object_name": file_object_name,
        "gcs_uri": f"gs://{BUCKET_NAME}/{file_object_name}",
        "document_url": f"https://storage.googleapis.com/{BUCKET_NAME}/{file_object_name}",
        "metadata": metadata_result
    }
