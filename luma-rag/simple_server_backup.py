# simple_server.py
"""
简化版 Luma RAG 服务器 - 解决路由冲突问题
"""
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import requests
from dotenv import load_dotenv

# 导入RAG相关函数
try:
    from query_rag import search_relevant_docs, build_prompt_with_context, ask_llama
except ImportError:
    print("❌ 错误: 无法从 'query_rag.py' 导入所需函数。")
    exit()

# 加载环境变量
load_dotenv(override=True)

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)

# 获取API密钥
together_key = os.getenv("TOGETHER_API_KEY", "")
elevenlabs_key = os.getenv("ELEVENLABS_API_KEY", "")
elevenlabs_voice = os.getenv("ELEVENLABS_VOICE_ID", "")

print("🚀 启动简化版 Luma RAG 服务器...")
print(f"Together API: {'✅' if together_key else '❌'}")
print(f"ElevenLabs API: {'✅' if elevenlabs_key and elevenlabs_voice else '❌'}")

# 全局变量存储对话历史
conversation_memory = []

# 路由定义 - 特定路由优先
@app.route("/api/test")
def test_endpoint():
    """测试端点"""
    return jsonify({
        "status": "OK",
        "message": "服务器运行正常",
        "together_api": bool(together_key),
        "elevenlabs_api": bool(elevenlabs_key and elevenlabs_voice),
        "routes": ["/", "/api/test", "/chat", "/api/elevenlabs-tts"]
    })

@app.route("/api/elevenlabs-tts", methods=["POST"])
def elevenlabs_tts():
    """ElevenLabs 语音合成API"""
    try:
        data = request.get_json()
        text = data.get("text", "")
        
        if not text:
            return jsonify({"error": "缺少文本参数"}), 400
        
        if not elevenlabs_key or not elevenlabs_voice:
            return jsonify({"error": "ElevenLabs API未配置"}), 500
        
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
            return jsonify({"error": f"ElevenLabs API错误: {response.status_code}"}), 500
            
    except Exception as e:
        return jsonify({"error": f"语音合成失败: {str(e)}"}), 500

@app.route("/chat", methods=["POST"])
def chat():
    """聊天API端点"""
    global conversation_memory
    
    try:
        data = request.get_json()
        user_message = data.get("message", "").strip()
        
        if not user_message:
            return jsonify({"error": "消息不能为空"}), 400
        
        if not together_key:
            return jsonify({"error": "Together API未配置"}), 500
        
        # 搜索相关文档
        relevant_docs = search_relevant_docs(user_message)
        
        # 构建提示词
        prompt = build_prompt_with_context(user_message, relevant_docs, conversation_memory)
        
        # 调用LLaMA
        response = ask_llama(prompt)
        
        # 更新对话记忆
        conversation_memory.append({"role": "user", "content": user_message})
        conversation_memory.append({"role": "assistant", "content": response})
        
        # 限制对话历史长度
        if len(conversation_memory) > 20:
            conversation_memory = conversation_memory[-20:]
        
        return jsonify({
            "response": response,
            "relevant_docs_count": len(relevant_docs)
        })
        
    except Exception as e:
        return jsonify({"error": f"聊天处理失败: {str(e)}"}), 500

@app.route("/reset_memory", methods=["POST"])
def reset_memory():
    """重置对话记忆"""
    global conversation_memory
    conversation_memory = []
    return jsonify({"message": "对话记忆已重置"})

@app.route("/")
def index():
    """主页"""
    try:
        return send_from_directory("public", "index.html")
    except Exception as e:
        return f"<h1>无法加载页面</h1><p>错误: {e}</p>", 500

# 静态文件路由 - 必须放在最后
@app.route("/<path:filename>")
def serve_static_files(filename):
    """提供静态文件"""
    try:
        return send_from_directory("public", filename)
    except Exception as e:
        return f"文件未找到: {filename}", 404

if __name__ == "__main__":
    print("🌐 访问地址: http://localhost:5000")
    print("🧪 测试地址: http://localhost:5000/api/test")
    app.run(host="0.0.0.0", port=5000, debug=True)
