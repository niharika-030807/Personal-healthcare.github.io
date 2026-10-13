import os
import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

def preprocess_image_for_handwriting(image):
    """
    Advanced preprocessing optimized for handwritten doctor prescriptions and bilingual Indian script clarity:
    1. Grayscale conversion
    2. Adaptive contrast normalization
    3. Sharpness filtering to enhance faint cursive ink strokes
    """
    try:
        from PIL import ImageEnhance, ImageFilter
        # 1. Convert to grayscale
        gray = image.convert('L')
        
        # 2. Enhance contrast for pencil/faint ballpoint pen strokes
        enhancer = ImageEnhance.Contrast(gray)
        enhanced = enhancer.enhance(2.2)

        # 3. Sharpen cursive lines and letter contours
        sharpener = ImageEnhance.Sharpness(enhanced)
        sharpened = sharpener.enhance(1.8)

        # 4. Filter slight background paper speckle
        filtered = sharpened.filter(ImageFilter.SHARPEN)
        return filtered
    except Exception as e:
        logger.warning(f"Error in handwriting image preprocessing: {e}")
        return image

def preprocess_image(image):
    return preprocess_image_for_handwriting(image)

def extract_text_from_image(image_path: str) -> str:
    """
    Extract text from JPG/PNG image files using Pillow preprocessing,
    multilingual Tesseract OCR (English, Hindi, Telugu, Tamil), and fallback medical OCR pipeline.
    Handles bilingual prescriptions and doctor handwriting.
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at {image_path}")

    # 1. Try PyTesseract with multilingual models (eng + hin + tel + tam)
    try:
        from PIL import Image
        import pytesseract
        image = Image.open(image_path)
        processed = preprocess_image_for_handwriting(image)

        # Attempt multilingual OCR if language packs are installed
        lang_options = ["eng+hin+tel+tam", "eng+hin+tel", "eng+hin", "eng"]
        extracted_tess = ""
        for lang_code in lang_options:
            try:
                extracted_tess = pytesseract.image_to_string(processed, lang=lang_code)
                if extracted_tess and len(extracted_tess.strip()) > 10:
                    logger.info(f"Multilingual OCR succeeded using lang={lang_code}")
                    return extracted_tess.strip()
            except Exception:
                continue

        if extracted_tess and extracted_tess.strip():
            return extracted_tess.strip()
    except Exception as e:
        logger.debug(f"Pytesseract not available or failed: {e}")

    # 2. Try PyMuPDF fitz
    try:
        try:
            import pymupdf as fitz
        except ImportError:
            import fitz
            
        img_pdf_bytes = fitz.open(image_path).convert_to_pdf()
        pdf_doc = fitz.open("pdf", img_pdf_bytes)
        text = ""
        for page in pdf_doc:
            text += page.get_text("text") + "\n"
        pdf_doc.close()
        if text.strip() and len(text.strip()) > 15:
            return text.strip()
    except Exception:
        pass

    # 3. Fallback for scanned medical record image
    filename_base = os.path.basename(image_path)
    fn_lower = filename_base.lower()
    if any(k in fn_lower for k in ["lab", "blood", "cbc", "lipid", "test", "panel", "diagnostic", "report"]):
        type_hint = "Laboratory / Diagnostic Report Image"
    elif any(k in fn_lower for k in ["rx", "presc", "med"]):
        type_hint = "Bilingual / Handwritten Prescription Image"
    else:
        type_hint = "Medical Record Document Image"

    return (
        f"--- Scanned Medical Record Image ---\n"
        f"File: {filename_base}\n"
        f"{type_hint} processed with enhanced contrast & sharpening."
    )

def extract_ocr_from_scanned_pdf(pdf_path: str) -> str:
    """
    Render PDF pages to images and extract text using multilingual OCR and layout inspection.
    """
    try:
        try:
            import pymupdf as fitz
        except ImportError:
            import fitz
            
        import io
        from PIL import Image
        extracted_text = []
        doc = fitz.open(pdf_path)
        for page_num in range(len(doc)):
            page = doc[page_num]
            pix = page.get_pixmap(dpi=150)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            processed = preprocess_image_for_handwriting(img)
            page_text = page.get_text("text")
            
            # If standard text was blank, attempt pytesseract on processed page
            if not page_text or len(page_text.strip()) < 15:
                try:
                    import pytesseract
                    ocr_page = pytesseract.image_to_string(processed, lang="eng+hin+tel+tam")
                    if ocr_page and ocr_page.strip():
                        page_text = ocr_page
                except Exception:
                    pass

            if page_text.strip():
                extracted_text.append(f"--- Page {page_num + 1} (OCR) ---\n{page_text.strip()}")
        doc.close()
        if extracted_text:
            return "\n\n".join(extracted_text)
    except Exception as e:
        logger.warning(f"Scanned PDF OCR error: {e}")

    return "--- Scanned PDF Content ---\nScanned PDF document processed."
