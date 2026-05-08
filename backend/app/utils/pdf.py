import io

import PyPDF2

from app.logger import get_logger

logger = get_logger(__name__)


def extract_pdf_content(file_bytes: bytes) -> str:
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in pdf_reader.pages:
            extracted_text = page.extract_text()
            if extracted_text:
                text += extracted_text + "\n"
        return text.strip()
    except Exception as e:
        logger.error("Error extracting PDF content: %s", str(e), exc_info=True)
        raise ValueError(f"Failed to process PDF file: {str(e)}") from e
