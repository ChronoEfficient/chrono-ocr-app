
import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from google.cloud import documentai

app = FastAPI(title="Chrono OCR API")

PROJECT_ID = os.environ["PROJECT_ID"]
LOCATION = os.environ["LOCATION"]
PROCESSOR_ID = os.environ["PROCESSOR_ID"]


def get_text(anchor, full_text: str) -> str:
    if not anchor.text_segments:
        return ""

    parts = []
    for segment in anchor.text_segments:
        start = int(segment.start_index or 0)
        end = int(segment.end_index)
        parts.append(full_text[start:end])

    return "".join(parts).strip()


def extract_layout(document):
    full_text = document.text or ""
    pages_output = []

    for page_index, page in enumerate(document.pages, start=1):
        page_data = {
            "page_number": page_index,
            "paragraphs": [],
            "lines": [],
            "tables": []
        }

        for paragraph in page.paragraphs:
            page_data["paragraphs"].append({
                "text": get_text(paragraph.layout.text_anchor, full_text),
                "confidence": paragraph.layout.confidence
            })

        for line in page.lines:
            page_data["lines"].append({
                "text": get_text(line.layout.text_anchor, full_text),
                "confidence": line.layout.confidence
            })

        for table in page.tables:
            table_data = {
                "header_rows": [],
                "body_rows": []
            }

            for row in table.header_rows:
                table_data["header_rows"].append([
                    get_text(cell.layout.text_anchor, full_text)
                    for cell in row.cells
                ])

            for row in table.body_rows:
                table_data["body_rows"].append([
                    get_text(cell.layout.text_anchor, full_text)
                    for cell in row.cells
                ])

            page_data["tables"].append(table_data)

        pages_output.append(page_data)

    return pages_output


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "chrono-ocr-api",
        "supported_formats": ["pdf", "png", "jpg", "jpeg"]
    }


@app.post("/ocr/document")
async def ocr_document(file: UploadFile = File(...)):
    allowed_types = {
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg"
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Supported formats: PDF, PNG, JPG, JPEG"
        )

    content = await file.read()

    client = documentai.DocumentProcessorServiceClient(
        client_options={
            "api_endpoint": f"{LOCATION}-documentai.googleapis.com"
        }
    )

    name = client.processor_path(PROJECT_ID, LOCATION, PROCESSOR_ID)

    raw_document = documentai.RawDocument(
        content=content,
        mime_type=file.content_type
    )

    request = documentai.ProcessRequest(
        name=name,
        raw_document=raw_document
    )

    result = client.process_document(request=request)
    document = result.document

    return {
        "success": True,
        "filename": file.filename,
        "mime_type": file.content_type,
        "text": document.text,
        "pages": extract_layout(document)
    }

