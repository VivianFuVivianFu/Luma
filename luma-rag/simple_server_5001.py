#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Luma RAG Server - Migrated to Port 5001
Complete migration with all original functionality
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import requests
from dotenv import load_dotenv

# Try to import query_rag, but don't exit if it fails
try:
    from query_rag import search_relevant_docs, build_prompt_with_context, ask_llama
    QUERY_RAG_AVAILABLE = True
    print("✅ Query RAG module loaded successfully")
except ImportError:
    print("⚠️  Warning: query_rag module not found. Some features will be disabled.")
    QUERY_RAG_AVAILABLE = False

# Load environment variables
load_dotenv(override=True)

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)

# API Keys
together_key = os.getenv("TOGETHER_API_KEY", "")
elevenlabs_key = os.getenv("ELEVENLABS_API_KEY", "")
elevenlabs_voice = os.getenv("ELEVENLABS_VOICE_ID", "")

print("🎯 Luma RAG Server Starting on Port 5001...")
print(f"Together API: {'✅' if together_key else '❌'}")
print(f"ElevenLabs API: {'✅' if elevenlabs_key and elevenlabs_voice else '❌'}")
print(f"Query RAG: {'✅' if QUERY_RAG_AVAILABLE else '❌'}")

# Global conversation memory
conversation_memory = []

# ============================================================================
# BASIC TEST ENDPOINTS
# ============================================================================

@app.route("/test")
def simple_test():
    """Simple test endpoint - MIGRATED TO PORT 5001"""
    return jsonify({
        "status": "OK",
        "message": "Test endpoint working perfectly on port 5001!",
        "environment": "luma-rag-env",
        "port": 5001,
        "migration_status": "complete"
    })

@app.route("/api/test")
def api_test_endpoint():
    """API test endpoint with full status"""
    return jsonify({
        "status": "OK",
        "message": "Luma RAG API working on port 5001!",
        "port": 5001,
        "together_api": bool(together_key),
        "elevenlabs_api": bool(elevenlabs_key and elevenlabs_voice),
        "query_rag": QUERY_RAG_AVAILABLE,
        "routes": ["/", "/test", "/api/test", "/chat", "/api/elevenlabs-tts", "/reset_memory"]
    })

# ============================================================================
# ELEVENLABS TTS ENDPOINT
# ============================================================================

@app.route("/api/elevenlabs-tts", methods=["POST"])
def elevenlabs_tts():
    """ElevenLabs TTS API - MIGRATED TO PORT 5001"""
    try:
        data = request.get_json()
        text = data.get("text", "")
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        if not elevenlabs_key or not elevenlabs_voice:
            return jsonify({"error": "ElevenLabs API not configured"}), 500
        
        # Call ElevenLabs API
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{elevenlabs_voice}"
        
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": elevenlabs_key
        }
        
        payload = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }
        
        response = requests.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            return response.content, 200, {'Content-Type': 'audio/mpeg'}
        else:
            return jsonify({"error": f"ElevenLabs API error: {response.status_code}"}), 500
    
    except Exception as e:
        return jsonify({"error": f"TTS error: {str(e)}"}), 500

# ============================================================================
# CHAT ENDPOINT
# ============================================================================

@app.route("/chat", methods=["POST"])
def chat():
    """Chat API endpoint with RAG support - MIGRATED TO PORT 5001"""
    global conversation_memory
    
    try:
        data = request.get_json()
        user_message = data.get("message", "").strip()
        
        if not user_message:
            return jsonify({"error": "No message provided"}), 400
        
        if not together_key:
            return jsonify({"error": "Together API not configured"}), 500
        
        if QUERY_RAG_AVAILABLE:
            # Use RAG if available
            try:
                relevant_docs = search_relevant_docs(user_message)
                prompt = build_prompt_with_context(user_message, relevant_docs, conversation_memory)
                response = ask_llama(prompt)
                
                # Update conversation memory
                conversation_memory.append({"role": "user", "content": user_message})
                conversation_memory.append({"role": "assistant", "content": response})
                
                # Keep only last 20 messages
                if len(conversation_memory) > 20:
                    conversation_memory = conversation_memory[-20:]
                
                return jsonify({
                    "response": response,
                    "relevant_docs_count": len(relevant_docs),
                    "port": 5001,
                    "rag_enabled": True
                })
                
            except Exception as e:
                return jsonify({"error": f"RAG processing error: {str(e)}"}), 500
        else:
            # Fallback response without RAG
            response = f"Echo: {user_message} (RAG module not available, running on port 5001)"
            
            conversation_memory.append({"role": "user", "content": user_message})
            conversation_memory.append({"role": "assistant", "content": response})
            
            if len(conversation_memory) > 20:
                conversation_memory = conversation_memory[-20:]
            
            return jsonify({
                "response": response,
                "relevant_docs_count": 0,
                "port": 5001,
                "rag_enabled": False
            })
    
    except Exception as e:
        return jsonify({"error": f"Chat error: {str(e)}"}), 500

# ============================================================================
# MEMORY MANAGEMENT
# ============================================================================

@app.route("/reset_memory", methods=["POST"])
def reset_memory():
    """Reset conversation memory - MIGRATED TO PORT 5001"""
    global conversation_memory
    conversation_memory = []
    return jsonify({
        "message": "Memory reset successfully",
        "port": 5001
    })

# ============================================================================
# STATIC FILE SERVING
# ============================================================================

@app.route("/")
def index():
    """Serve main page or status - MIGRATED TO PORT 5001"""
    try:
        return send_from_directory("public", "index.html")
    except Exception as e:
        return jsonify({
            "status": "OK",
            "message": "Luma RAG Server is running on port 5001!",
            "port": 5001,
            "migration_status": "complete",
            "endpoints": {
                "test": "/test",
                "api_test": "/api/test", 
                "chat": "/chat",
                "tts": "/api/elevenlabs-tts",
                "reset": "/reset_memory"
            },
            "note": f"index.html not found: {e}"
        }), 200

@app.route("/<path:filename>")
def serve_static_files(filename):
    """Serve static files - MIGRATED TO PORT 5001"""
    try:
        return send_from_directory("public", filename)
    except Exception as e:
        return jsonify({"error": f"File not found: {filename}"}), 404

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 LUMA RAG SERVER - MIGRATED TO PORT 5001")
    print("=" * 60)
    print("📍 Server URL: http://localhost:5001")
    print("🧪 Test endpoint: http://localhost:5001/test")
    print("🧪 API test: http://localhost:5001/api/test")
    print("💬 Chat endpoint: http://localhost:5001/chat")
    print("🔊 TTS endpoint: http://localhost:5001/api/elevenlabs-tts")
    print("🧹 Reset memory: http://localhost:5001/reset_memory")
    print("=" * 60)
    print("✅ Migration to port 5001 complete!")
    print("❗ Update your client URLs from :5000 to :5001")
    print("=" * 60)
    
    app.run(host="0.0.0.0", port=5001, debug=True)
    

