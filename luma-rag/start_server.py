import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from server.agent import app

if __name__ == "__main__":
    print("🚀 启动语音聊天服务器...")
    print("📡 服务地址: http://localhost:5000")
    print("🎤 请在浏览器中打开上述地址测试语音功能")
    app.run(debug=True, host='0.0.0.0', port=5000)
