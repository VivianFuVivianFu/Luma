# rag_server.py
# Flask server for RAG service to work with Vercel deployment

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from together import Together
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from rag_paths import faiss_path_str
import logging

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend access

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Together client
together_api_key = os.getenv("TOGETHER_API_KEY")
client = Together(api_key=together_api_key) if together_api_key else None

# Global vectorstore instance
vectorstore = None

def load_vectorstore():
    """Load the FAISS vectorstore"""
    global vectorstore
    if vectorstore is None:
        try:
            embeddings = OpenAIEmbeddings(openai_api_key=os.getenv("OPENAI_API_KEY"))
            vectorstore = FAISS.load_local(
                faiss_path_str(), 
                embeddings, 
                allow_dangerous_deserialization=True
            )
            logger.info("Vectorstore loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load vectorstore: {e}")
            vectorstore = None
    return vectorstore

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "luma-rag",
        "vectorstore_available": vectorstore is not None
    })

@app.route('/context', methods=['POST'])
def get_context():
    """Get RAG context for a query"""
    try:
        data = request.get_json()
        query = data.get('query', '')
        max_length = data.get('max_length', 1000)
        
        if not query:
            return jsonify({
                "error": "Query is required"
            }), 400
        
        # Load vectorstore if not already loaded
        db = load_vectorstore()
        if db is None:
            return jsonify({
                "query": query,
                "context": "",
                "context_length": 0
            })
        
        # Search for relevant documents
        docs = db.similarity_search(query, k=3)
        
        # Build context from documents
        context_parts = []
        current_length = 0
        
        for doc in docs:
            content = doc.page_content.strip()
            if current_length + len(content) <= max_length:
                context_parts.append(content)
                current_length += len(content)
            else:
                # Add partial content if it fits
                remaining_space = max_length - current_length
                if remaining_space > 50:  # Only add if meaningful space left
                    context_parts.append(content[:remaining_space] + "...")
                break
        
        context = "\n\n".join(context_parts)
        
        logger.info(f"Context generated for query: '{query[:50]}...' ({len(context)} chars)")
        
        return jsonify({
            "query": query,
            "context": context,
            "context_length": len(context)
        })
        
    except Exception as e:
        logger.error(f"Context generation error: {e}")
        return jsonify({
            "query": query if 'query' in locals() else "",
            "context": "",
            "context_length": 0
        })

@app.route('/search', methods=['POST'])
def search():
    """Search for relevant documents"""
    try:
        data = request.get_json()
        query = data.get('query', '')
        k = data.get('k', 5)
        
        if not query:
            return jsonify({
                "error": "Query is required"
            }), 400
        
        # Load vectorstore if not already loaded
        db = load_vectorstore()
        if db is None:
            return jsonify({
                "query": query,
                "results": [],
                "count": 0
            })
        
        # Search for relevant documents with scores
        docs_with_scores = db.similarity_search_with_score(query, k=k)
        
        results = []
        for doc, score in docs_with_scores:
            results.append({
                "content": doc.page_content,
                "score": float(score),
                "metadata": doc.metadata
            })
        
        logger.info(f"Search completed for query: '{query[:50]}...' ({len(results)} results)")
        
        return jsonify({
            "query": query,
            "results": results,
            "count": len(results)
        })
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        return jsonify({
            "query": query if 'query' in locals() else "",
            "results": [],
            "count": 0
        })

@app.route('/documents', methods=['GET'])
def get_documents():
    """Get list of available documents"""
    try:
        db = load_vectorstore()
        if db is None:
            return jsonify({
                "documents": []
            })
        
        # Get unique document sources from metadata
        all_docs = db.similarity_search("", k=1000)  # Get many docs to find sources
        sources = set()
        
        for doc in all_docs:
            if 'source' in doc.metadata:
                sources.add(doc.metadata['source'])
        
        return jsonify({
            "documents": list(sources)
        })
        
    except Exception as e:
        logger.error(f"Documents listing error: {e}")
        return jsonify({
            "documents": []
        })

if __name__ == '__main__':
    # Initialize vectorstore on startup
    logger.info("Starting RAG server...")
    load_vectorstore()
    
    # Run the server
    port = int(os.getenv('RAG_PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)