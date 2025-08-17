# Thin re-export so existing imports keep working:
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'luma-rag'))

from rag_paths import (
    get_faiss_index_dir,
    faiss_path_str,
    faiss_index_file,
    faiss_metadata_file,
)