import os
from ebooklib import epub
import ebooklib
from bs4 import BeautifulSoup
import PyPDF2

RAW_DIR = "docs_raw"
OUT_DIR = "docs"

def convert_pdf_to_txt(file_path):
    with open(file_path, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text

def convert_epub_to_txt(file_path):
    book = epub.read_epub(file_path)
    text = ""
    for item in book.get_items():
        if item.get_type() == ebooklib.ITEM_DOCUMENT:
            soup = BeautifulSoup(item.get_content(), 'html.parser')
            text += soup.get_text() + "\n"
    return text

def clean_filename(filename):
    name, _ = os.path.splitext(filename)
    return name.lower().replace(" ", "_").replace("-", "_") + ".txt"

print(f"Starting conversion process...")
print(f"Raw directory: {RAW_DIR}")
print(f"Output directory: {OUT_DIR}")

if not os.path.exists(OUT_DIR):
    os.makedirs(OUT_DIR)
    print(f"Created output directory: {OUT_DIR}")

print(f"Files found in {RAW_DIR}:")
for filename in os.listdir(RAW_DIR):
    print(f"  - {filename}")

print("\nStarting conversion...")
for filename in os.listdir(RAW_DIR):
    file_path = os.path.join(RAW_DIR, filename)
    if filename.endswith(".pdf"):
        try:
            print(f"Converting PDF: {filename}")
            text = convert_pdf_to_txt(file_path)
            out_name = clean_filename(filename)
            with open(os.path.join(OUT_DIR, out_name), "w", encoding="utf-8") as out_file:
                out_file.write(text)
            print(f"✓ Successfully converted {filename} -> {out_name}")
        except Exception as e:
            print(f"Failed to convert {filename}: {e}")
    elif filename.endswith(".epub"):
        try:
            print(f"Converting EPUB: {filename}")
            text = convert_epub_to_txt(file_path)
            out_name = clean_filename(filename)
            with open(os.path.join(OUT_DIR, out_name), "w", encoding="utf-8") as out_file:
                out_file.write(text)
            print(f"✓ Successfully converted {filename} -> {out_name}")
        except Exception as e:
            print(f"Failed to convert {filename}: {e}")

print("\n🎉 Conversion process completed!")
print(f"Check the '{OUT_DIR}' directory for converted files.")
