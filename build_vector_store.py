#!/usr/bin/env python3
"""
Build Vector Store for RAG System
Processes documents from Rag/docs/ and creates FAISS vector store
"""

import os
import pickle
import logging
from typing import List, Dict, Any
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_documents(docs_path: str) -> List[Dict[str, Any]]:
    """Load all text documents from the docs directory"""
    documents = []

    if not os.path.exists(docs_path):
        logger.error(f"Documents directory not found: {docs_path}")
        return documents

    for filename in os.listdir(docs_path):
        if filename.endswith('.txt'):
            filepath = os.path.join(docs_path, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read().strip()

                if content:
                    # Split content into chunks for better retrieval
                    chunks = split_text_into_chunks(content, chunk_size=500, overlap=50)

                    for i, chunk in enumerate(chunks):
                        documents.append({
                            'content': chunk,
                            'source': filename,
                            'chunk_id': i,
                            'total_chunks': len(chunks)
                        })

                    logger.info(f"Loaded {len(chunks)} chunks from {filename}")

            except Exception as e:
                logger.error(f"Error loading {filename}: {str(e)}")

    logger.info(f"Total documents loaded: {len(documents)}")
    return documents

def split_text_into_chunks(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Split text into overlapping chunks"""
    words = text.split()
    chunks = []

    for i in range(0, len(words), chunk_size - overlap):
        chunk_words = words[i:i + chunk_size]
        chunk = ' '.join(chunk_words)
        chunks.append(chunk)

        # Break if we've reached the end
        if i + chunk_size >= len(words):
            break

    return chunks

def build_vector_store(documents: List[Dict[str, Any]], model_name: str = 'all-MiniLM-L6-v2'):
    """Build FAISS vector store from documents"""
    logger.info(f"Loading sentence transformer model: {model_name}")
    model = SentenceTransformer(model_name)

    # Extract text content for encoding
    texts = [doc['content'] for doc in documents]

    logger.info(f"Encoding {len(texts)} documents...")
    embeddings = model.encode(texts, show_progress_bar=True)
    embeddings = embeddings.astype('float32')

    # Create FAISS index
    logger.info("Creating FAISS index...")
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatIP(dimension)  # Inner product for cosine similarity

    # Normalize embeddings for cosine similarity
    faiss.normalize_L2(embeddings)
    index.add(embeddings)

    logger.info(f"FAISS index created with {index.ntotal} vectors")

    return index, model, texts, [doc for doc in documents]

def save_vector_store(index, texts: List[str], metadata: List[Dict[str, Any]],
                     vector_store_path: str):
    """Save the vector store and metadata"""
    os.makedirs(vector_store_path, exist_ok=True)

    # Save FAISS index
    index_path = os.path.join(vector_store_path, "index.faiss")
    faiss.write_index(index, index_path)
    logger.info(f"FAISS index saved to {index_path}")

    # Save documents and metadata
    metadata_path = os.path.join(vector_store_path, "index.pkl")
    data = {
        'documents': texts,
        'metadata': metadata
    }

    with open(metadata_path, 'wb') as f:
        pickle.dump(data, f)

    logger.info(f"Metadata saved to {metadata_path}")

def main():
    """Main function to build the vector store"""
    docs_path = "Rag/docs"
    vector_store_path = "Rag/vector_store"

    # Check if vector store already exists
    index_path = os.path.join(vector_store_path, "index.faiss")
    metadata_path = os.path.join(vector_store_path, "index.pkl")

    if os.path.exists(index_path) and os.path.exists(metadata_path):
        logger.info("Vector store already exists. Skipping build.")
        logger.info("To rebuild, delete the vector_store directory first.")
        return

    # Load documents
    logger.info("Loading documents...")
    documents = load_documents(docs_path)

    if not documents:
        logger.error("No documents found. Exiting.")
        return

    # Build vector store
    logger.info("Building vector store...")
    index, model, texts, metadata = build_vector_store(documents)

    # Save vector store
    logger.info("Saving vector store...")
    save_vector_store(index, texts, metadata, vector_store_path)

    logger.info("Vector store build complete!")
    logger.info(f"Total documents: {len(texts)}")
    logger.info(f"Vector dimension: {index.d}")
    logger.info(f"Index size: {index.ntotal}")

if __name__ == "__main__":
    main()
