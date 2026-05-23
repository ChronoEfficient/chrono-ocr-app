import os
from fastapi import HTTPException
from google.cloud import documentai

PROJECT_ID = os.environ["PROJECT_ID"]
LOCATION = os.environ["LOCATION"]
PROCESSOR_ID = os.environ["PROCESSOR_ID"]


def get_text_from_anchor(text_anchor, full_text: str):
    if not text_anchor or not text_anchor.text_segments:
        return ""

    parts = []

    for segment in text_anchor.text_segments:
        start = int(segment.start_index or 0)
        end = int(segment.end_index)
        parts.append(full_text[start:end])

    return "".join(parts).strip()


def extract_layout(document):
    full_text = document.text or ""
    pages = []

    for page_index, page in enumerate(document.pages, start=1):
        page_data = {
            "page_number": page_index,
            "lines": [],
            "paragraphs": [],
            "tables": []
        }

        for line in page.lines:
            page_data["lines"].append({
                "text": get_text_from_anchor(line.layout.text_anchor, full_text),
                "confidence": float(line.layout.confidence)
            })

        for paragraph in page.paragraphs:
            page_data["paragraphs"].append({
                "text": get_text_from_anchor(paragraph.layout.text_anchor, full_text),
                "confidence": float(paragraph.layout.confidence)
            })

        for table in page.tables:
            table_data = {
                "header_rows": [],
                "body_rows": []
            }

            for row in table.header_rows:
                table_data["header_rows"].append([
                    get_text_from_anchor(cell.layout.text_anchor, full_text)
                    for cell in row.cells
                ])

            for row in table.body_rows:
                table_data["body_rows"].append([
                    get_text_from_anchor(cell.layout.text_anchor, full_text)
                    for cell in row.cells
                ])

            page_data["tables"].append(table_data)

        pages.append(page_data)

    return pages


def extract_ocr_from_bytes(file_bytes: bytes, filename: str, content_type: str):
    allowed_types = {
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg"
    }

    if content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Supported formats: PDF, PNG, JPG, JPEG"
        )

    client = documentai.DocumentProcessorServiceClient(
        client_options={
            "api_endpoint": f"{LOCATION}-documentai.googleapis.com"
        }
    )

    name = client.processor_path(PROJECT_ID, LOCATION, PROCESSOR_ID)

    raw_document = documentai.RawDocument(
        content=file_bytes,
        mime_type=content_type
    )

    request = documentai.ProcessRequest(
        name=name,
        raw_document=raw_document
    )

    result = client.process_document(request=request)
    document = result.document

    return {
        "success": True,
        "filename": filename,
        "mime_type": content_type,
        "text": document.text,
        "layout": extract_layout(document)
    }
