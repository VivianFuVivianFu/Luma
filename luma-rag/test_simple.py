from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
import os
import requests
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)

# 获取API密钥
together_key = os.getenv("TOGETHER_API_KEY", "")
elevenlabs_key = os.getenv("ELEVENLABS_API_KEY", "")
elevenlabs_voice = os.getenv("ELEVENLABS_VOICE_ID", "")

print(f"Together API Key: {'✅ Configured' if together_key else '❌ Missing'}")
print(f"ElevenLabs API: {'✅ Configured' if elevenlabs_key and elevenlabs_voice else '❌ Missing'}")

# 全局对话记忆
conversation_memory = []

@app.route("/")
def home():
    try:
        return send_from_directory("public", "index.html")
    except Exception as e:
        return f"<h1>Server Running</h1><p>Error loading index.html: {e}</p>", 200

@app.route("/test")
def test():
    return {"status": "OK", "message": "Server working on 5001"}

@app.route("/chat", methods=["POST"])
def chat():
    """聊天API端点 - 使用Together.ai LLaMA 3 70B Instruct"""
    global conversation_memory
    
    try:
        data = request.get_json()
        user_message = data.get("message", "").strip()
        
        if not user_message:
            return jsonify({"error": "No message provided"}), 400
        
        if not together_key:
            return jsonify({"error": "Together API key not configured"}), 500
        
        # 构建对话上下文
        messages = [
            {"role": "system", "content": "You are Luma, a caring and supportive AI companion. You provide thoughtful responses and emotional support. Be warm, empathetic, and helpful."}
        ]
        
        # 添加对话历史（最近10轮）
        recent_memory = conversation_memory[-20:] if len(conversation_memory) > 20 else conversation_memory
        messages.extend(recent_memory)
        
        # 添加当前用户消息
        messages.append({"role": "user", "content": user_message})
        
        # 调用Together.ai API
        response = requests.post(
            "https://api.together.xyz/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {together_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
                "messages": messages,
                "max_tokens": 1000,
                "temperature": 0.7,
                "top_p": 0.9,
                "stream": False
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            ai_response = result["choices"][0]["message"]["content"]
            
            # 更新对话记忆
            conversation_memory.append({"role": "user", "content": user_message})
            conversation_memory.append({"role": "assistant", "content": ai_response})
            
            # 限制对话历史长度
            if len(conversation_memory) > 30:
                conversation_memory = conversation_memory[-30:]
            
            # 返回前端期望的格式
            return jsonify({
                "reply": ai_response,                    # main.js期望的字段名
                "model_used": "LLaMA 3.1 70B Instruct", # 模型信息
                "memory_turns": len(conversation_memory) // 2,  # 对话轮数
                "response": ai_response,                 # 备用字段
                "port": 5001
            })
        else:
            return jsonify({"error": f"Together API error: {response.status_code} - {response.text}"}), 500
            
    except Exception as e:
        return jsonify({"error": f"Chat error: {str(e)}"}), 500

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
        
        # 调用ElevenLabs API
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

@app.route("/reset_memory", methods=["POST"])
def reset_memory():
    """重置对话记忆"""
    global conversation_memory
    conversation_memory = []
    return jsonify({"message": "Memory reset successfully", "port": 5001})

@app.route("/<path:filename>")
def serve_static(filename):
    try:
        return send_from_directory("public", filename)
    except Exception as e:
        return f"File not found: {filename}", 404

if __name__ == "__main__":
    print("=" * 50)
    print("🚀 Luma Chat Server with Together.ai LLaMA 3 70B")
    print("=" * 50)
    print("📍 Server: http://localhost:5001")
    print("💬 Chat API: /chat")
    print("🔊 TTS API: /api/elevenlabs-tts")
    print("🧹 Reset: /reset_memory")
    print("🤖 Model: Meta-LLaMA-3.1-70B-Instruct-Turbo")
    print("=" * 50)
    app.run(host="0.0.0.0", port=5001, debug=True)
