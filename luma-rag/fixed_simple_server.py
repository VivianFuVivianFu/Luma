#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fixed Simple Server for Luma RAG
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
except ImportError:
    print("Warning: query_rag module not found. Some features will be disabled.")
    QUERY_RAG_AVAILABLE = False

# Load environment variables
load_dotenv(override=True)

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)

# API Keys
together_key = os.getenv("TOGETHER_API_KEY", "")
elevenlabs_key = os.getenv("ELEVENLABS_API_KEY", "")
elevenlabs_voice = os.getenv("ELEVENLABS_VOICE_ID", "")

print("🎯 Luma RAG Server Starting...")
print(f"Together API: {'✅' if together_key else '❌'}")
print(f"ElevenLabs API: {'✅' if elevenlabs_key and elevenlabs_voice else '❌'}")

# Global conversation memory
conversation_memory = []

# Simple test endpoint
@app.route("/api/test")
def test_endpoint():
    """Simple test endpoint"""
    return jsonify({
        "status": "OK",
        "message": "Server is working perfectly!",
        "together_api": bool(together_key),
        "elevenlabs_api": bool(elevenlabs_key and elevenlabs_voice),
        "query_rag": QUERY_RAG_AVAILABLE,
        "routes": ["/", "/api/test", "/test", "/chat", "/api/elevenlabs-tts"]
    })

# Add a simple /test endpoint for your PowerShell command
@app.route("/test")
def simple_test():
    """Simple test endpoint without /api prefix"""
    return jsonify({
        "status": "OK",
        "message": "Simple test endpoint working!",
        "timestamp": "2024-08-06"
    })

@app.route("/api/elevenlabs-tts", methods=["POST"])
def elevenlabs_tts():
    """ElevenLabs TTS API"""
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
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/chat", methods=["POST"])
def chat():
    """Chat API endpoint"""
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
            relevant_docs = search_relevant_docs(user_message)
            prompt = build_prompt_with_context(user_message, relevant_docs, conversation_memory)
            response = ask_llama(prompt)
        else:
            # Simple response without RAG
            response = f"Echo: {user_message} (RAG module not available)"
        
        # Update conversation memory
        conversation_memory.append({"role": "user", "content": user_message})
        conversation_memory.append({"role": "assistant", "content": response})
        
        # Keep only last 20 messages
        if len(conversation_memory) > 20:
            conversation_memory = conversation_memory[-20:]
        
        return jsonify({
            "response": response,
            "relevant_docs_count": len(relevant_docs) if QUERY_RAG_AVAILABLE else 0
        })
    
    except Exception as e:
        return jsonify({"error": f"Chat error: {str(e)}"}), 500

@app.route("/reset_memory", methods=["POST"])
def reset_memory():
    """Reset conversation memory"""
    global conversation_memory
    conversation_memory = []
    return jsonify({"message": "Memory reset successfully"})

@app.route("/")
def index():
    """Serve main page"""
    try:
        return send_from_directory("public", "index.html")
    except Exception as e:
        return f"<h1>Server Running</h1><p>Error loading index.html: {e}</p>", 500

@app.route("/<path:filename>")
def serve_static_files(filename):
    """Serve static files"""
    try:
        return send_from_directory("public", filename)
    except Exception as e:
        return f"File not found: {filename}", 404

if __name__ == "__main__":
    print("🚀 Starting server at: http://localhost:5000")
    print("🧪 Test endpoint: http://localhost:5000/api/test")
    print("🧪 Simple test: http://localhost:5000/test")
    app.run(host="0.0.0.0", port=5000, debug=True)