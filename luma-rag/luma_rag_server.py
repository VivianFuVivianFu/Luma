#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Luma RAG Server - API compatible with Luma's frontend
Provides endpoints: /health, /context, /search, /documents
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import time
from dotenv import load_dotenv
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
VECTOR_DB_PATH = "vector_store"
MAX_CONTEXT_LENGTH = 2000
DEFAULT_K = 5

# Global variables
vectorstore = None
embeddings = None

def initialize_rag():
    """Initialize the RAG system"""
    global vectorstore, embeddings
    
    print("🔍 Initializing Luma RAG system...")
    
    try:
        # Initialize embeddings
        embeddings = OpenAIEmbeddings()
        print("✅ OpenAI embeddings initialized")
        
        # Load vector store
        if os.path.exists(VECTOR_DB_PATH):
            vectorstore = FAISS.load_local(
                VECTOR_DB_PATH, 
                embeddings, 
                allow_dangerous_deserialization=True
            )
            print(f"✅ Vector store loaded from {VECTOR_DB_PATH}")
            
            # Get document count
            doc_count = vectorstore.index.ntotal if hasattr(vectorstore, 'index') else "Unknown"
            print(f"📚 Documents in vector store: {doc_count}")
            
            return True
        else:
            print(f"❌ Vector store not found at {VECTOR_DB_PATH}")
            return False
            
    except Exception as e:
        print(f"❌ RAG initialization failed: {e}")
        return False

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    global vectorstore
    
    status = {
        "status": "healthy" if vectorstore is not None else "unhealthy",
        "timestamp": time.time(),
        "vectorstore_loaded": vectorstore is not None,
        "embeddings_loaded": embeddings is not None,
        "vector_db_path": VECTOR_DB_PATH
    }
    
    if vectorstore is not None:
        try:
            doc_count = vectorstore.index.ntotal if hasattr(vectorstore, 'index') else 0
            status["document_count"] = doc_count
        except:
            status["document_count"] = "Unknown"
    
    return jsonify(status)

@app.route("/context", methods=["POST"])
def get_context():
    """Get relevant context for a query"""
    global vectorstore
    
    if vectorstore is None:
        return jsonify({"error": "RAG system not initialized"}), 500
    
    try:
        data = request.get_json()
        query = data.get("query", "")
        max_length = data.get("max_length", MAX_CONTEXT_LENGTH)
        
        if not query:
            return jsonify({"error": "No query provided"}), 400
        
        print(f"🔍 Getting context for query: {query}")
        
        # Search for relevant documents
        docs = vectorstore.similarity_search(query, k=5)
        
        # Build context from retrieved documents
        context_parts = []
        current_length = 0
        
        for doc in docs:
            content = doc.page_content
            
            # Add source information if available
            source = doc.metadata.get('source', 'Unknown')
            source_info = f"[Source: {os.path.basename(source)}]\n"
            
            # Check if adding this document would exceed max length
            potential_addition = source_info + content + "\n\n"
            if current_length + len(potential_addition) > max_length:
                # Add truncated version if possible
                remaining_space = max_length - current_length - len(source_info) - 10  # Leave some buffer
                if remaining_space > 100:  # Only add if we have reasonable space
                    truncated_content = content[:remaining_space] + "..."
                    context_parts.append(source_info + truncated_content)
                break
            
            context_parts.append(potential_addition)
            current_length += len(potential_addition)
        
        context = "".join(context_parts)
        
        print(f"✅ Context retrieved ({len(context)} characters)")
        
        return jsonify({
            "query": query,
            "context": context,
            "context_length": len(context)
        })
    
    except Exception as e:
        print(f"❌ Context retrieval failed: {e}")
        return jsonify({"error": f"Context retrieval failed: {str(e)}"}), 500

@app.route("/search", methods=["POST"])
def search_documents():
    """Search for relevant documents"""
    global vectorstore
    
    if vectorstore is None:
        return jsonify({"error": "RAG system not initialized"}), 500
    
    try:
        data = request.get_json()
        query = data.get("query", "")
        k = data.get("k", DEFAULT_K)
        
        if not query:
            return jsonify({"error": "No query provided"}), 400
        
        print(f"🔍 Searching documents for: {query}")
        
        # Search with scores
        docs_with_scores = vectorstore.similarity_search_with_score(query, k=k)
        
        results = []
        for doc, score in docs_with_scores:
            result = {
                "content": doc.page_content,
                "score": float(score),
                "metadata": doc.metadata
            }
            results.append(result)
        
        print(f"✅ Found {len(results)} relevant documents")
        
        return jsonify({
            "query": query,
            "results": results,
            "count": len(results)
        })
    
    except Exception as e:
        print(f"❌ Document search failed: {e}")
        return jsonify({"error": f"Document search failed: {str(e)}"}), 500

@app.route("/documents", methods=["GET"])
def get_documents():
    """Get list of available documents"""
    try:
        docs_path = "docs"
        if os.path.exists(docs_path):
            documents = [f for f in os.listdir(docs_path) if f.endswith('.txt')]
            print(f"📚 Available documents: {len(documents)}")
            return jsonify({"documents": documents})
        else:
            return jsonify({"documents": []})
    
    except Exception as e:
        print(f"❌ Failed to get documents: {e}")
        return jsonify({"error": f"Failed to get documents: {str(e)}"}), 500

@app.route("/", methods=["GET"])
def root():
    """Root endpoint - server info"""
    return jsonify({
        "service": "Luma RAG Server",
        "version": "1.0.0",
        "endpoints": ["/health", "/context", "/search", "/documents"],
        "status": "running"
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    print("🚀 Starting Luma RAG Server...")
    print("📋 Available endpoints:")
    print("   GET  /health      - Health check")
    print("   POST /context     - Get context for query")
    print("   POST /search      - Search documents")  
    print("   GET  /documents   - List available documents")
    print("   GET  /           - Server info")
    
    # Initialize RAG system
    if initialize_rag():
        print("\n✅ Luma RAG Server ready!")
        print("🌐 Server starting at: http://localhost:5000")
        app.run(host="0.0.0.0", port=5000, debug=True)
    else:
        print("\n❌ RAG system initialization failed!")
        print("Please check your vector store and OpenAI API key.")
        exit(1)