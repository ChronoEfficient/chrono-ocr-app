import io
import numpy as np
import cv2
from PIL import Image


def assess_image_quality(file_bytes: bytes, content_type: str):
    if content_type == "application/pdf":
        return {
            "quality_checked": False,
            "reason": "Image quality assessment currently applies to image uploads only."
        }

    try:
        image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        width, height = image.size

        image_array = np.array(image)
        gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)

        blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        brightness = float(np.mean(gray))

        resolution_ok = bool(width >= 800 and height >= 500)
        blur_detected = bool(blur_score < 80)
        low_light = bool(brightness < 70)
        over_exposed = bool(brightness > 220)

        ocr_ready = bool(
            resolution_ok
            and not blur_detected
            and not low_light
            and not over_exposed
        )

        warnings = []

        if not resolution_ok:
            warnings.append("Image resolution may be too low for reliable OCR.")

        if blur_detected:
            warnings.append("Image appears blurry.")

        if low_light:
            warnings.append("Image appears too dark.")

        if over_exposed:
            warnings.append("Image appears over-exposed or affected by glare.")

        return {
            "quality_checked": True,
            "width": int(width),
            "height": int(height),
            "resolution_ok": resolution_ok,
            "blur_score": round(blur_score, 2),
            "blur_detected": blur_detected,
            "brightness": round(brightness, 2),
            "low_light": low_light,
            "over_exposed": over_exposed,
            "ocr_ready": ocr_ready,
            "warnings": warnings
        }

    except Exception as e:
        return {
            "quality_checked": False,
            "reason": f"Image quality assessment failed: {str(e)}"
        }
