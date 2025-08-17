#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple RAG Server for Luma - minimal dependencies
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import time
import json
from rag_paths import faiss_path_str

app = Flask(__name__)
CORS(app)

# Try to load the vector store if available
vectorstore = None
try:
    from langchain_community.vectorstores import FAISS
    from langchain_openai import OpenAIEmbeddings
    
    VECTOR_DB_PATH = faiss_path_str()
    if os.path.exists(faiss_path_str()):
        embeddings = OpenAIEmbeddings()
        vectorstore = FAISS.load_local(
            faiss_path_str(), 
            embeddings, 
            allow_dangerous_deserialization=True
        )
        print(f"✅ Vector store loaded successfully")
    else:
        print(f"❌ Vector store not found at {VECTOR_DB_PATH}")
except Exception as e:
    print(f"⚠️ Could not load vector store: {e}")
    print("Running in mock mode...")

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    status = {
        "status": "healthy",
        "timestamp": time.time(),
        "vectorstore_loaded": vectorstore is not None,
        "mock_mode": vectorstore is None
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
    try:
        data = request.get_json()
        query = data.get("query", "")
        max_length = data.get("max_length", 1500)
        
        if not query:
            return jsonify({"error": "No query provided"}), 400
        
        print(f"🔍 Getting context for query: {query}")
        
        if vectorstore is not None:
            # Real RAG search
            docs = vectorstore.similarity_search(query, k=3)
            
            context_parts = []
            current_length = 0
            
            for doc in docs:
                content = doc.page_content
                source = doc.metadata.get('source', 'Unknown')
                source_info = f"[Source: {os.path.basename(source)}]\n"
                
                potential_addition = source_info + content + "\n\n"
                if current_length + len(potential_addition) > max_length:
                    remaining_space = max_length - current_length - len(source_info) - 10
                    if remaining_space > 100:
                        truncated_content = content[:remaining_space] + "..."
                        context_parts.append(source_info + truncated_content)
                    break
                
                context_parts.append(potential_addition)
                current_length += len(potential_addition)
            
            context = "".join(context_parts)
        else:
            # Mock context for common mental health topics
            context = get_mock_context(query)
        
        print(f"✅ Context retrieved ({len(context)} characters)")
        
        return jsonify({
            "query": query,
            "context": context,
            "context_length": len(context)
        })
    
    except Exception as e:
        print(f"❌ Context retrieval failed: {e}")
        return jsonify({"error": f"Context retrieval failed: {str(e)}"}), 500

def get_mock_context(query):
    """Provide mock context for testing when vector store isn't available"""
    query_lower = query.lower()
    
    if any(term in query_lower for term in ['cptsd', 'c-ptsd', 'complex ptsd']):
        return """[Source: cptsd_surviving_to_thriving.txt]
Complex PTSD (C-PTSD) is a psychological condition that can develop in response to prolonged, repeated trauma, particularly during childhood. Unlike traditional PTSD, which typically results from a single traumatic event, C-PTSD arises from sustained trauma, often in relationships where escape isn't possible.

Key symptoms include:
- Emotional dysregulation (difficulty managing emotions)
- Negative self-concept (deep shame, self-hatred)
- Interpersonal difficulties (problems with relationships)

[Source: cptsd_treatment.txt]
Treatment for C-PTSD often involves trauma-informed therapy approaches such as EMDR, Internal Family Systems (IFS), and Dialectical Behavior Therapy (DBT). Recovery is possible with proper support and treatment."""
    
    elif any(term in query_lower for term in ['anxious attachment', 'attachment']):
        return """[Source: attached_amir_levine.txt]
Anxious attachment style is characterized by a strong desire for close relationships but fear of abandonment. People with anxious attachment often:
- Seek excessive reassurance from partners
- Experience high levels of relationship anxiety
- Have difficulty self-soothing when distressed
- May engage in protest behaviors when feeling disconnected

[Source: anxious_attachment_recovery.txt]
Recovery from anxious attachment involves developing secure attachment patterns through:
- Learning emotional regulation skills
- Building self-worth independent of relationships
- Practicing effective communication
- Working with a trauma-informed therapist"""
    
    elif any(term in query_lower for term in ['loneliness', 'lonely', 'alone']):
        return """[Source: healing_everyday_traumas.txt]
Loneliness is a common human experience that can significantly impact mental health. It's important to distinguish between being alone (physical isolation) and feeling lonely (emotional experience).

Chronic loneliness can:
- Increase risk of depression and anxiety
- Impact physical health and immune system
- Affect sleep quality and cognitive function

[Source: relationship_worksheets.txt]
Addressing loneliness often involves:
- Building meaningful connections with others
- Developing self-compassion and self-acceptance
- Engaging in activities that align with personal values
- Seeking professional support when needed"""
    
    else:
        return """[Source: general_mental_health.txt]
Mental health is a crucial aspect of overall well-being. It's important to remember that seeking help is a sign of strength, not weakness. If you're struggling with persistent mental health concerns, consider reaching out to a qualified mental health professional.

Common self-care practices include:
- Maintaining regular sleep and exercise routines
- Practicing mindfulness and stress reduction techniques
- Building supportive relationships
- Setting healthy boundaries"""

@app.route("/search", methods=["POST"])
def search_documents():
    """Search for relevant documents"""
    try:
        data = request.get_json()
        query = data.get("query", "")
        k = data.get("k", 5)
        
        if not query:
            return jsonify({"error": "No query provided"}), 400
        
        print(f"🔍 Searching documents for: {query}")
        
        if vectorstore is not None:
            # Real search
            docs_with_scores = vectorstore.similarity_search_with_score(query, k=k)
            results = []
            for doc, score in docs_with_scores:
                result = {
                    "content": doc.page_content,
                    "score": float(score),
                    "metadata": doc.metadata
                }
                results.append(result)
        else:
            # Mock search results
            results = [{
                "content": "Mock search result for testing purposes",
                "score": 0.85,
                "metadata": {"source": "mock_document.txt"}
            }]
        
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
        else:
            documents = ["mock_document.txt", "example_content.txt"]
        
        print(f"📚 Available documents: {len(documents)}")
        return jsonify({"documents": documents})
    
    except Exception as e:
        print(f"❌ Failed to get documents: {e}")
        return jsonify({"error": f"Failed to get documents: {str(e)}"}), 500

@app.route("/", methods=["GET"])
def root():
    """Root endpoint - server info"""
    return jsonify({
        "service": "Simple Luma RAG Server",
        "version": "1.0.0",
        "endpoints": ["/health", "/context", "/search", "/documents"],
        "status": "running",
        "mode": "real" if vectorstore is not None else "mock"
    })

if __name__ == "__main__":
    print("🚀 Starting Simple Luma RAG Server...")
    print("📋 Available endpoints:")
    print("   GET  /health      - Health check")
    print("   POST /context     - Get context for query")
    print("   POST /search      - Search documents")  
    print("   GET  /documents   - List available documents")
    print("   GET  /           - Server info")
    print()
    
    if vectorstore is not None:
        print("✅ Running in REAL mode with vector store")
    else:
        print("⚠️ Running in MOCK mode - install dependencies for full functionality")
    
    print("🌐 Server starting at: http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)