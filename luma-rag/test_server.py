"""
简化的语音聊天测试服务器
"""
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

app = Flask(__name__)
CORS(app)

print("🔑 正在检查API密钥...")
openai_key = os.getenv("OPENAI_API_KEY", "")
together_key = os.getenv("TOGETHER_API_KEY", "")

print(f"OpenAI Key: {'✅ 已配置' if openai_key.startswith('sk-') else '❌ 未配置'}")
print(f"Together Key: {'✅ 已配置' if together_key.startswith('sk_') else '❌ 未配置'}")

@app.route("/")
def index():
    """提供主页"""
    try:
        return send_from_directory("public", "index.html")
    except:
        return """
        <!DOCTYPE html>
        <html>
        <head><title>Luma Voice Chat Test</title></head>
        <body>
            <h1>🎤 Luma 语音聊天测试</h1>
            <div id="status">服务器运行正常!</div>
            <button onclick="testAPI()">测试API连接</button>
            <script>
                function testAPI() {
                    fetch('/test')
                        .then(r => r.json())
                        .then(data => document.getElementById('status').innerText = JSON.stringify(data, null, 2));
                }
            </script>
        </body>
        </html>
        """

@app.route("/test")
def test():
    """测试API连接"""
    return jsonify({
        "status": "OK",
        "openai_configured": bool(os.getenv("OPENAI_API_KEY", "").startswith("sk-")),
        "together_configured": bool(os.getenv("TOGETHER_API_KEY", "").startswith("sk_")),
        "message": "测试服务器运行正常"
    })

@app.route("/chat", methods=["POST"])
def chat():
    """简化的聊天端点"""
    data = request.json
    user_input = data.get("message", "")
    
    # 简单的回复逻辑
    reply = f"你好！我收到了你的消息：'{user_input}'。这是一个测试回复。"
    
    return jsonify({"reply": reply})

if __name__ == "__main__":
    print("🚀 启动语音聊天测试服务器...")
    print("📡 服务地址: http://localhost:5000")
    print("🎤 请在浏览器中打开测试页面")
    app.run(debug=True, host='0.0.0.0', port=5000)
