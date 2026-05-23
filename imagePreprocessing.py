import io
import cv2
import numpy as np
from PIL import Image


def preprocess_image(file_bytes: bytes, content_type: str):
    """
    Basic preprocessing:
    - grayscale
    - denoise
    - contrast enhancement
    - resize if too small
    """

    if content_type == "application/pdf":
        return file_bytes

    image = Image.open(io.BytesIO(file_bytes)).convert("RGB")

    image_array = np.array(image)

    gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)

    # Denoise
    denoised = cv2.fastNlMeansDenoising(gray)

    # Contrast enhancement
    enhanced = cv2.equalizeHist(denoised)

    height, width = enhanced.shape

    # Upscale very small images
    if width < 1200:
        scale_factor = 1200 / width

        enhanced = cv2.resize(
            enhanced,
            None,
            fx=scale_factor,
            fy=scale_factor,
            interpolation=cv2.INTER_CUBIC
        )

    success, encoded_image = cv2.imencode(".png", enhanced)

    if not success:
        return file_bytes

    return encoded_image.tobytes()
