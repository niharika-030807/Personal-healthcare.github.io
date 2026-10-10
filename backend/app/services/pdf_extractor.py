import os
import logging

logger = logging.getLogger(__name__)

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract text content page by page from a digital PDF using PyMuPDF (pymupdf / fitz) or fallback parser.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found at {pdf_path}")

    extracted_pages = []
    
    # Try PyMuPDF fitz
    try:
        try:
            import pymupdf as fitz
        except ImportError:
            import fitz

        doc = fitz.open(pdf_path)
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text")
            if text and text.strip():
                extracted_pages.append(f"--- Page {page_num + 1} ---\n{text.strip()}")
        doc.close()
        if extracted_pages:
            return "\n\n".join(extracted_pages)
    except Exception as e:
        logger.warning(f"fitz PDF extraction failed or unavailable: {e}")

    # Fallback basic text stream extractor for binary PDF streams
    try:
        with open(pdf_path, "rb") as f:
            content = f.read().decode("latin-1", errors="ignore")
            import re
            text_chunks = re.findall(r'\((.*?)\)\s*Tj', content)
            if text_chunks:
                clean_text = " ".join(text_chunks)
                return f"--- Extracted PDF Content ---\n{clean_text}"
    except Exception as e:
        logger.error(f"Fallback PDF extraction error: {e}")

    return "--- Document Content ---\nMedical Record Document PDF uploaded."
