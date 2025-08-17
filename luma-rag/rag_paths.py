import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

def _auto_candidates():
    # Search typical locations in priority order
    here = Path(__file__).parent
    return [
        here / "vector_store",               # luma-rag/vector_store if file is in luma-rag/
        Path.cwd() / "luma-rag" / "vector_store",
        Path.cwd() / "Rag" / "vector_store",
    ]

def get_faiss_index_dir() -> Path:
    """
    Returns the absolute Path to the FAISS index directory.
    Priority:
      1) .env FAISS_INDEX_DIR
      2) autodetect common locations
      3) fallback: luma-rag/vector_store (created if missing)
    """
    # 1) ENV
    env_path = os.getenv("FAISS_INDEX_DIR")
    if env_path:
        p = Path(env_path).expanduser()
        p.mkdir(parents=True, exist_ok=True)
        return p.resolve()

    # 2) autodetect existing dirs
    for cand in _auto_candidates():
        if cand.exists():
            cand.mkdir(parents=True, exist_ok=True)
            return cand.resolve()

    # 3) fallback (create)
    fallback = Path.cwd() / "luma-rag" / "vector_store"
    fallback.mkdir(parents=True, exist_ok=True)
    return fallback.resolve()

def faiss_path_str() -> str:
    """String path for LangChain FAISS .save_local/.load_local."""
    return get_faiss_index_dir().as_posix()

def faiss_index_file() -> str:
    """Path to the FAISS index binary file (index.faiss)."""
    return (get_faiss_index_dir() / "index.faiss").as_posix()

def faiss_metadata_file() -> str:
    """Path to the FAISS metadata (index.pkl)."""
    return (get_faiss_index_dir() / "index.pkl").as_posix()