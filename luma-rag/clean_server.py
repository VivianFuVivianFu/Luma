# 创建修正版服务器文件
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from flask import Flask, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

print("🎯 Luma RAG Server Starting...")

@app.route("/test")
def simple_test():
    return jsonify({
        "status": "OK",
        "message": "Test endpoint working perfectly!",
        "environment": "luma-rag-env",
        "timestamp": "2024-08-06"
    })

@app.route("/api/test")
def api_test():
    return jsonify({
        "status": "OK", 
        "message": "API test endpoint working!",
        "routes": ["/", "/test", "/api/test"]
    })

@app.route("/")
def home():
    return jsonify({
        "status": "OK",
        "message": "Luma RAG Server is running!",
        "endpoints": ["/test", "/api/test"]
    })

if __name__ == "__main__":
    print("🚀 Server starting at: http://localhost:5000")
    print("🧪 Test endpoint: http://localhost:5000/test")
    app.run(host="0.0.0.0", port=5000, debug=True)
"@ | Out-File -FilePath "clean_server.py" -Encoding utf8