import os
import fitz  # PyMuPDF
import docx
import pandas as pd


def load_document(file_path: str) -> str:
    """
    Load document from file path and extract text.
    Supports PDF, DOCX, TXT, and CSV formats.
    """
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf":
        return _load_pdf(file_path)
    elif ext == ".docx":
        return _load_docx(file_path)
    elif ext == ".txt":
        return _load_txt(file_path)
    elif ext == ".csv":
        return _load_csv(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def _load_pdf(file_path: str) -> str:
    """Extract text from PDF using PyMuPDF."""
    text = ""
    doc = fitz.open(file_path)
    for page_num, page in enumerate(doc):
        page_text = page.get_text()
        if page_text.strip():
            text += f"\n--- Page {page_num + 1} ---\n{page_text}"
    doc.close()
    if not text.strip():
        raise ValueError("This PDF appears to be image-based (scanned). Please upload a text-based PDF.")
    return text.strip()

def _load_docx(file_path: str) -> str:
    """Extract text from DOCX file."""
    doc = docx.Document(file_path)
    text = ""
    for para in doc.paragraphs:
        if para.text.strip():
            text += para.text + "\n"
    return text.strip()


def _load_txt(file_path: str) -> str:
    """Extract text from TXT file."""
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read().strip()


def _load_csv(file_path: str) -> str:
    """Extract text from CSV file using pandas."""
    df = pd.read_csv(file_path)
    text = f"Columns: {', '.join(df.columns.tolist())}\n\n"
    text += df.to_string(index=False)
    return text.strip()