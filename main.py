from fastapi import FastAPI, UploadFile, File, Form

from ocrExtraction import extract_ocr_from_bytes
from idVerification import verify_sa_id_document
from bankingVerification import verify_banking_document
from addressVerification import verify_proof_of_address

from imageQuality import assess_image_quality
from imagePreprocessing import preprocess_image

from confidenceScoring import calculate_id_confidence
from bankingConfidenceScoring import calculate_banking_confidence
from addressConfidenceScoring import calculate_address_confidence

from consistencyChecks import run_id_consistency_checks
from bankingConsistencyChecks import run_banking_consistency_checks
from addressConsistencyChecks import run_address_consistency_checks

from storageService import save_document_to_gcs

app = FastAPI(title="Chrono OCR API")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "chrono-ocr-api",
        "supported_formats": ["pdf", "png", "jpg", "jpeg"],
        "supported_extractions": [
            "id_document",
            "proof_of_banking",
            "proof_of_address"
        ],
        "ocr_strategy": "original_first_preprocessing_fallback",
        "storage_bucket": "scaffold_documents_preprod"
    }


def build_id_response(
    expected_type,
    filename,
    mime_type,
    quality_result,
    ocr_attempt,
    verification_result,
    storage_result=None,
    original_attempt=None
):
    confidence_result = calculate_id_confidence(
        verification_result,
        quality_result
    )

    consistency_result = run_id_consistency_checks(
        verification_result.get("fields", {})
    )

    response = {
        "success": verification_result["document_verified"],
        "expected_type": expected_type,
        "filename": filename,
        "mime_type": mime_type,
        "quality": quality_result,
        "ocr_attempt": ocr_attempt,
        "confidence": confidence_result,
        "consistency": consistency_result,
        "storage": storage_result,
        **verification_result
    }

    if original_attempt:
        response["original_attempt"] = original_attempt

    return response


def build_banking_response(
    filename,
    mime_type,
    quality_result,
    ocr_attempt,
    verification_result,
    storage_result=None
):
    confidence_result = calculate_banking_confidence(
        verification_result,
        quality_result
    )

    consistency_result = run_banking_consistency_checks(
        verification_result.get("fields", {})
    )

    return {
        "success": verification_result["document_verified"],
        "expected_type": "proof_of_banking",
        "filename": filename,
        "mime_type": mime_type,
        "quality": quality_result,
        "ocr_attempt": ocr_attempt,
        "confidence": confidence_result,
        "consistency": consistency_result,
        "storage": storage_result,
        **verification_result
    }


def build_address_response(
    filename,
    mime_type,
    quality_result,
    ocr_attempt,
    verification_result,
    storage_result=None
):
    confidence_result = calculate_address_confidence(
        verification_result,
        quality_result
    )

    consistency_result = run_address_consistency_checks(
        verification_result.get("fields", {})
    )

    return {
        "success": verification_result["document_verified"],
        "expected_type": "proof_of_address",
        "filename": filename,
        "mime_type": mime_type,
        "quality": quality_result,
        "ocr_attempt": ocr_attempt,
        "confidence": confidence_result,
        "consistency": consistency_result,
        "storage": storage_result,
        **verification_result
    }


def should_store_id_document(verification_result: dict) -> bool:
    return verification_result.get("document_verified") is True


def should_store_banking_document(verification_result: dict) -> bool:
    return verification_result.get("document_verified") is True


def should_store_address_document(verification_result: dict) -> bool:
    return verification_result.get("document_verified") is True


@app.post("/verify/id")
async def verify_id(file: UploadFile = File(...)):
    original_file_bytes = await file.read()

    quality_result = assess_image_quality(
        original_file_bytes,
        file.content_type
    )

    original_ocr_result = extract_ocr_from_bytes(
        file_bytes=original_file_bytes,
        filename=file.filename,
        content_type=file.content_type
    )

    original_verification = verify_sa_id_document(
        original_ocr_result["text"]
    )

    if original_verification["document_verified"]:
        return build_id_response(
            expected_type="id_document",
            filename=original_ocr_result["filename"],
            mime_type=original_ocr_result["mime_type"],
            quality_result=quality_result,
            ocr_attempt="original",
            verification_result=original_verification
        )

    processed_file_bytes = preprocess_image(
        original_file_bytes,
        file.content_type
    )

    fallback_ocr_result = extract_ocr_from_bytes(
        file_bytes=processed_file_bytes,
        filename=file.filename,
        content_type=file.content_type
    )

    fallback_verification = verify_sa_id_document(
        fallback_ocr_result["text"]
    )

    return build_id_response(
        expected_type="id_document",
        filename=fallback_ocr_result["filename"],
        mime_type=fallback_ocr_result["mime_type"],
        quality_result=quality_result,
        ocr_attempt="preprocessed_fallback",
        verification_result=fallback_verification,
        original_attempt={
            "document_verified": original_verification["document_verified"],
            "verification_status": original_verification["verification_status"]
        }
    )


@app.post("/verify/banking")
async def verify_banking(file: UploadFile = File(...)):
    original_file_bytes = await file.read()

    quality_result = assess_image_quality(
        original_file_bytes,
        file.content_type
    )

    original_ocr_result = extract_ocr_from_bytes(
        file_bytes=original_file_bytes,
        filename=file.filename,
        content_type=file.content_type
    )

    banking_verification = verify_banking_document(
        original_ocr_result["text"],
        original_ocr_result.get("layout")
    )

    return build_banking_response(
        filename=original_ocr_result["filename"],
        mime_type=original_ocr_result["mime_type"],
        quality_result=quality_result,
        ocr_attempt="original",
        verification_result=banking_verification,
        storage_result=None
    )


@app.post("/store/id")
async def store_id(
    file: UploadFile = File(...),
    employee_number: str = Form(...),
    document_type: str = Form("Id_document")
):
    original_file_bytes = await file.read()

    quality_result = assess_image_quality(
        original_file_bytes,
        file.content_type
    )

    original_ocr_result = extract_ocr_from_bytes(
        file_bytes=original_file_bytes,
        filename=file.filename,
        content_type=file.content_type
    )

    original_verification = verify_sa_id_document(
        original_ocr_result["text"]
    )

    selected_ocr_result = original_ocr_result
    selected_verification = original_verification
    selected_attempt = "original"
    original_attempt = None

    if not original_verification["document_verified"]:
        processed_file_bytes = preprocess_image(
            original_file_bytes,
            file.content_type
        )

        fallback_ocr_result = extract_ocr_from_bytes(
            file_bytes=processed_file_bytes,
            filename=file.filename,
            content_type=file.content_type
        )

        fallback_verification = verify_sa_id_document(
            fallback_ocr_result["text"]
        )

        selected_ocr_result = fallback_ocr_result
        selected_verification = fallback_verification
        selected_attempt = "preprocessed_fallback"

        original_attempt = {
            "document_verified": original_verification["document_verified"],
            "verification_status": original_verification["verification_status"]
        }

    response_without_storage = build_id_response(
        expected_type="id_document",
        filename=selected_ocr_result["filename"],
        mime_type=selected_ocr_result["mime_type"],
        quality_result=quality_result,
        ocr_attempt=selected_attempt,
        verification_result=selected_verification,
        storage_result=None,
        original_attempt=original_attempt
    )

    storage_result = None

    if should_store_id_document(selected_verification):
        storage_result = save_document_to_gcs(
            file_bytes=original_file_bytes,
            filename=file.filename,
            content_type=file.content_type,
            employee_number=employee_number,
            document_type=document_type,
            metadata=response_without_storage
        )

    response_without_storage["storage"] = storage_result

    return response_without_storage


@app.post("/store/banking")
async def store_banking(
    file: UploadFile = File(...),
    employee_number: str = Form(...),
    document_type: str = Form("Proof_of_banking")
):
    original_file_bytes = await file.read()

    quality_result = assess_image_quality(
        original_file_bytes,
        file.content_type
    )

    original_ocr_result = extract_ocr_from_bytes(
        file_bytes=original_file_bytes,
        filename=file.filename,
        content_type=file.content_type
    )

    banking_verification = verify_banking_document(
        original_ocr_result["text"],
        original_ocr_result.get("layout")
    )

    response_without_storage = build_banking_response(
        filename=original_ocr_result["filename"],
        mime_type=original_ocr_result["mime_type"],
        quality_result=quality_result,
        ocr_attempt="original",
        verification_result=banking_verification,
        storage_result=None
    )

    storage_result = None

    if should_store_banking_document(banking_verification):
        storage_result = save_document_to_gcs(
            file_bytes=original_file_bytes,
            filename=file.filename,
            content_type=file.content_type,
            employee_number=employee_number,
            document_type=document_type,
            metadata=response_without_storage
        )

    response_without_storage["storage"] = storage_result

    return response_without_storage


@app.post("/verify/address")
async def verify_address(file: UploadFile = File(...)):
    original_file_bytes = await file.read()

    quality_result = assess_image_quality(
        original_file_bytes,
        file.content_type
    )

    original_ocr_result = extract_ocr_from_bytes(
        file_bytes=original_file_bytes,
        filename=file.filename,
        content_type=file.content_type
    )

    address_verification = verify_proof_of_address(
        original_ocr_result["text"]
    )

    return build_address_response(
        filename=original_ocr_result["filename"],
        mime_type=original_ocr_result["mime_type"],
        quality_result=quality_result,
        ocr_attempt="original",
        verification_result=address_verification,
        storage_result=None
    )


@app.post("/store/address")
async def store_address(
    file: UploadFile = File(...),
    employee_number: str = Form(...),
    document_type: str = Form("Proof_of_address")
):
    original_file_bytes = await file.read()

    quality_result = assess_image_quality(
        original_file_bytes,
        file.content_type
    )

    original_ocr_result = extract_ocr_from_bytes(
        file_bytes=original_file_bytes,
        filename=file.filename,
        content_type=file.content_type
    )

    address_verification = verify_proof_of_address(
        original_ocr_result["text"]
    )

    response_without_storage = build_address_response(
        filename=original_ocr_result["filename"],
        mime_type=original_ocr_result["mime_type"],
        quality_result=quality_result,
        ocr_attempt="original",
        verification_result=address_verification,
        storage_result=None
    )

    storage_result = None

    if should_store_address_document(address_verification):
        storage_result = save_document_to_gcs(
            file_bytes=original_file_bytes,
            filename=file.filename,
            content_type=file.content_type,
            employee_number=employee_number,
            document_type=document_type,
            metadata=response_without_storage
        )

    response_without_storage["storage"] = storage_result

    return response_without_storage


@app.post("/ocr/document")
async def ocr_document(file: UploadFile = File(...)):
    file_bytes = await file.read()

    quality_result = assess_image_quality(
        file_bytes,
        file.content_type
    )

    ocr_result = extract_ocr_from_bytes(
        file_bytes=file_bytes,
        filename=file.filename,
        content_type=file.content_type
    )

    return {
        **ocr_result,
        "quality": quality_result,
        "ocr_attempt": "original"
    }


@app.post("/extract/document")
async def extract_document(
    file: UploadFile = File(...),
    expected_type: str = Form(...)
):
    if expected_type == "id_document":
        return await verify_id(file)

    if expected_type == "proof_of_banking":
        return await verify_banking(file)

    if expected_type == "proof_of_address":
        return await verify_address(file)

    return {
        "success": False,
        "expected_type": expected_type,
        "detail": f"Unsupported expected_type: {expected_type}"
    }
