#!/usr/bin/env python3
"""
Simple RAG Server for Luma AI - Psychology/Therapy Knowledge Base
Provides retrieval-augmented generation using FAISS vector store
"""

import os
import pickle
import logging
from typing import List, Dict, Any
from flask import Flask, request, jsonify
from flask_cors import CORS
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global variables
model = None
index = None
documents = None
document_metadata = None

def initialize_rag():
    """Initialize the RAG system with pre-built vector store"""
    global model, index, documents, document_metadata

    try:
        logger.info("Initializing RAG system...")

        # Load sentence transformer model
        logger.info("Loading sentence transformer model...")
        model = SentenceTransformer('all-MiniLM-L6-v2')

        # Load FAISS index
        vector_store_path = "Rag/vector_store"
        index_path = os.path.join(vector_store_path, "index.faiss")

        if os.path.exists(index_path):
            logger.info(f"Loading FAISS index from {index_path}")
            index = faiss.read_index(index_path)
        else:
            logger.error(f"FAISS index not found at {index_path}")
            return False

        # Load document metadata
        metadata_path = os.path.join(vector_store_path, "index.pkl")
        if os.path.exists(metadata_path):
            logger.info(f"Loading document metadata from {metadata_path}")
            with open(metadata_path, 'rb') as f:
                data = pickle.load(f)
                documents = data.get('documents', [])
                document_metadata = data.get('metadata', [])
        else:
            logger.error(f"Document metadata not found at {metadata_path}")
            return False

        logger.info(f"RAG system initialized successfully!")
        logger.info(f"Loaded {len(documents)} documents")
        logger.info(f"Vector index size: {index.ntotal}")

        return True

    except Exception as e:
        logger.error(f"Failed to initialize RAG system: {str(e)}")
        return False

def search_documents_func(query: str, k: int = 5) -> List[Dict[str, Any]]:
    """Search for relevant documents using vector similarity"""
    global model, index, documents, document_metadata

    try:
        if not model or not index or not documents:
            logger.error("RAG system not properly initialized")
            return []

        # Encode the query
        query_vector = model.encode([query])
        query_vector = query_vector.astype('float32')

        # Search the index
        scores, indices = index.search(query_vector, k)

        results = []
        for i, (score, idx) in enumerate(zip(scores[0], indices[0])):
            if idx < len(documents):
                result = {
                    'content': documents[idx],
                    'score': float(score),
                    'rank': i + 1,
                    'metadata': document_metadata[idx] if idx < len(document_metadata) else {}
                }
                results.append(result)

        logger.info(f"Found {len(results)} relevant documents for query: {query[:50]}...")
        return results

    except Exception as e:
        logger.error(f"Error during search: {str(e)}")
        return []

def get_context_func(query: str, max_context_length: int = 2000) -> str:
    """Get relevant context for a query, formatted for LLM consumption"""
    try:
        results = search_documents_func(query, k=5)

        if not results:
            logger.warning(f"No search results found for query: {query}")
            return ""

        context_parts = []
        current_length = 0

        for result in results:
            content = result['content']
            source = result['metadata'].get('source', 'Unknown')
            score = result.get('score', 0)

            # Only include results with reasonable similarity scores
            if score < 0.3:  # Skip very low similarity results
                continue

            # Format the context piece
            context_piece = f"[Source: {source}]\n{content}\n"

            # Check if adding this piece would exceed the limit
            if current_length + len(context_piece) > max_context_length:
                # If this is the first piece and it's too long, truncate it
                if len(context_parts) == 0:
                    truncated_content = content[:max_context_length - 100]  # Leave room for source info
                    context_piece = f"[Source: {source}]\n{truncated_content}...\n"
                    context_parts.append(context_piece)
                break

            context_parts.append(context_piece)
            current_length += len(context_piece)

        if not context_parts:
            logger.warning(f"No high-quality results found for query: {query}")
            return ""

        context = "\n---\n".join(context_parts)

        logger.info(f"Generated context of {len(context)} characters from {len(context_parts)} sources for query: {query[:50]}...")
        return context

    except Exception as e:
        logger.error(f"Error generating context: {str(e)}")
        return ""

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    global model, documents
    return jsonify({
        'status': 'healthy',
        'rag_initialized': model is not None,
        'documents_loaded': len(documents) if documents else 0
    })

@app.route('/search', methods=['POST'])
def search_documents():
    """Search for relevant documents"""
    try:
        data = request.get_json()

        if not data or 'query' not in data:
            return jsonify({'error': 'Query is required'}), 400

        query = data['query']
        k = data.get('k', 5)

        if not isinstance(query, str) or not query.strip():
            return jsonify({'error': 'Query must be a non-empty string'}), 400

        results = search_documents_func(query, k)

        return jsonify({
            'query': query,
            'results': results,
            'count': len(results)
        })

    except Exception as e:
        logger.error(f"Error in search endpoint: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/context', methods=['POST'])
def get_context():
    """Get formatted context for LLM consumption"""
    try:
        data = request.get_json()

        if not data or 'query' not in data:
            return jsonify({'error': 'Query is required'}), 400

        query = data['query']
        max_length = data.get('max_length', 2000)

        if not isinstance(query, str) or not query.strip():
            return jsonify({'error': 'Query must be a non-empty string'}), 400

        context = get_context_func(query, max_length)

        return jsonify({
            'query': query,
            'context': context,
            'context_length': len(context)
        })

    except Exception as e:
        logger.error(f"Error in context endpoint: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/documents', methods=['GET'])
def list_documents():
    """List available documents in the knowledge base"""
    global document_metadata, documents

    try:
        if not document_metadata:
            return jsonify({'documents': [], 'count': 0})

        # Get unique sources
        sources = set()
        for metadata in document_metadata:
            if 'source' in metadata:
                sources.add(metadata['source'])

        return jsonify({
            'documents': list(sources),
            'count': len(sources),
            'total_chunks': len(documents) if documents else 0
        })

    except Exception as e:
        logger.error(f"Error in documents endpoint: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Initialize the RAG system
    if not initialize_rag():
        logger.error("Failed to initialize RAG system. Exiting.")
        exit(1)

    # Start the Flask server
    logger.info("Starting RAG server on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=False)
