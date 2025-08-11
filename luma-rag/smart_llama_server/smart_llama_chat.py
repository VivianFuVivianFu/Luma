#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Smart LLaMA Chat Server - LLaMA 3 70B First, RAG When Needed
Port: 5001
"""

from flask import Flask, jsonify, request
import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables
# Try to load .env from current directory first, then parent directory
load_dotenv(override=True)
parent_env = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
if os.path.exists(parent_env):
    load_dotenv(parent_env, override=True)
    print(f"📁 Environment loaded from: {parent_env}")

app = Flask(__name__)

# API Configuration
TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY", "")
TOGETHER_API_URL = "https://api.together.xyz/v1/chat/completions"

# Try to import RAG functions (optional)
try:
    import sys
    import os
    # Add parent directory to path to access query_rag module
    parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.insert(0, parent_dir)
    
    from query_rag import search_relevant_docs, build_prompt_with_context
    RAG_AVAILABLE = True
    print("✅ RAG module loaded - will be used for complex queries")
    print(f"📁 RAG module loaded from: {parent_dir}")
except ImportError as e:
    RAG_AVAILABLE = False
    print(f"⚠️  RAG module not available - using LLaMA only")
    print(f"📁 Import error: {str(e)}")

# Global conversation memory
conversation_memory = []

# Keywords that trigger RAG usage
RAG_TRIGGER_KEYWORDS = [
    "具体的", "详细的", "专业的", "技术细节", "文档", "资料", 
    "reference", "documentation", "specific", "detailed", "technical",
    "how to implement", "code example", "step by step", "tutorial",
    "什么是", "如何实现", "代码示例", "教程", "步骤"
]

def should_use_rag(message):
    """
    判断是否需要使用RAG检索
    """
    message_lower = message.lower()
    
    # 检查是否包含触发词
    for keyword in RAG_TRIGGER_KEYWORDS:
        if keyword in message_lower:
            return True
    
    # 检查消息长度 - 很长的问题可能需要详细回答
    if len(message) > 100:
        return True
        
    # 检查是否包含问号且较长
    if "?" in message and len(message) > 50:
        return True
    if "？" in message and len(message) > 50:
        return True
        
    return False

def call_llama_api(messages, use_rag_context=False):
    """
    调用 LLaMA 3 70B API
    """
    try:
        headers = {
            "Authorization": f"Bearer {TOGETHER_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # 根据是否使用RAG调整系统提示
        if use_rag_context:
            system_prompt = """你是一个智能助手，能够基于提供的上下文信息给出准确、详细的回答。
请根据用户问题和相关文档内容，提供专业而有用的回复。如果文档中没有相关信息，请诚实说明并提供你的一般性建议。
请用中文回答，语言自然友好。"""
        else:
            system_prompt = """你是一个友好、智能的AI助手。请用自然、有趣的方式与用户对话。
- 保持对话轻松愉快
- 回答要简洁明了，不要过于冗长
- 用中文回答
- 如果遇到你不确定的专业问题，可以建议用户提供更多细节"""

        # 构建消息列表
        api_messages = [{"role": "system", "content": system_prompt}]
        api_messages.extend(messages)
        
        payload = {
            "model": "meta-llama/Llama-3-70b-chat-hf",
            "messages": api_messages,
            "max_tokens": 1000,
            "temperature": 0.7,
            "top_p": 0.9,
            "repetition_penalty": 1.1
        }
        
        print(f"[DEBUG] Calling LLaMA API, use_rag_context: {use_rag_context}")
        
        response = requests.post(
            TOGETHER_API_URL,
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return result["choices"][0]["message"]["content"]
        else:
            print(f"[ERROR] API call failed: {response.status_code}, {response.text}")
            return f"抱歉，API调用失败。状态码: {response.status_code}"
            
    except Exception as e:
        print(f"[ERROR] Exception in API call: {str(e)}")
        return f"抱歉，调用语言模型时出现错误: {str(e)}"

@app.route("/test")
def test():
    return jsonify({
        "status": "OK", 
        "message": "Smart LLaMA Chat Server on 5001",
        "llama_configured": bool(TOGETHER_API_KEY),
        "rag_available": RAG_AVAILABLE
    })

@app.route("/chat", methods=["POST"])
def chat():
    global conversation_memory
    
    try:
        data = request.get_json() or {}
        user_message = data.get("message", "").strip()
        
        if not user_message:
            return jsonify({"error": "请提供消息内容"}), 400
        
        if not TOGETHER_API_KEY:
            return jsonify({"error": "Together API密钥未配置"}), 500
        
        print(f"[INFO] User message: {user_message}")
        
        # 判断是否需要使用RAG
        needs_rag = should_use_rag(user_message) and RAG_AVAILABLE
        print(f"[INFO] Using RAG: {needs_rag}")
        
        # 准备对话消息
        recent_messages = conversation_memory[-6:] if conversation_memory else []
        messages = recent_messages + [{"role": "user", "content": user_message}]
        
        if needs_rag:
            # 使用RAG增强回答
            try:
                relevant_docs = search_relevant_docs(user_message)
                if relevant_docs:
                    # 构建带有上下文的消息
                    context = "\n".join([doc.get("content", "") for doc in relevant_docs[:3]])
                    enhanced_message = f"""基于以下相关信息回答用户问题：

相关信息：
{context}

用户问题：{user_message}

请根据上述信息给出详细、准确的回答。如果信息不足，请说明并提供你的建议。"""
                    
                    messages[-1]["content"] = enhanced_message
                    response = call_llama_api(messages, use_rag_context=True)
                    
                    print(f"[INFO] RAG enhanced response generated")
                    
                    return jsonify({
                        "response": response,
                        "mode": "RAG_Enhanced",
                        "relevant_docs_count": len(relevant_docs)
                    })
                else:
                    print("[INFO] No relevant docs found, using direct LLaMA")
                    
            except Exception as e:
                print(f"[ERROR] RAG failed: {str(e)}, falling back to direct LLaMA")
        
        # 直接使用LLaMA 3 70B
        response = call_llama_api(messages, use_rag_context=False)
        
        # 更新对话历史
        conversation_memory.append({"role": "user", "content": user_message})
        conversation_memory.append({"role": "assistant", "content": response})
        
        # 保持对话历史在合理长度
        if len(conversation_memory) > 20:
            conversation_memory = conversation_memory[-20:]
        
        print(f"[INFO] Direct LLaMA response generated")
        
        return jsonify({
            "response": response,
            "mode": "Direct_LLaMA",
            "conversation_length": len(conversation_memory)
        })
        
    except Exception as e:
        print(f"[ERROR] Chat error: {str(e)}")
        return jsonify({"error": f"聊天处理错误: {str(e)}"}), 500

@app.route("/reset_memory", methods=["POST"])
def reset_memory():
    global conversation_memory
    conversation_memory = []
    print("[INFO] Conversation memory reset")
    return jsonify({"message": "对话记忆已重置"})

@app.route("/debug", methods=["GET"])
def debug():
    return jsonify({
        "together_api_configured": bool(TOGETHER_API_KEY),
        "rag_available": RAG_AVAILABLE,
        "conversation_length": len(conversation_memory),
        "rag_triggers": RAG_TRIGGER_KEYWORDS[:5],  # 显示部分触发词
        "last_messages": conversation_memory[-4:] if conversation_memory else []
    })

@app.route("/")
def home():
    return jsonify({
        "status": "Smart LLaMA Chat Server",
        "port": 5001,
        "strategy": "LLaMA-first, RAG-when-needed",
        "endpoints": ["/test", "/chat", "/debug", "/reset_memory"]
    })

if __name__ == "__main__":
    print("=" * 60)
    print("🤖 Smart LLaMA Chat Server")
    print("=" * 60)
    print("🧠 Primary: LLaMA 3 70B Instruct")
    print("🔍 Secondary: RAG for complex queries")
    print("📍 Server: http://localhost:5001")
    print("=" * 60)
    print(f"✅ Together API: {'Configured' if TOGETHER_API_KEY else '❌ Not configured'}")
    print(f"✅ RAG System: {'Available' if RAG_AVAILABLE else '❌ Not available'}")
    print("=" * 60)
    
    app.run(host="0.0.0.0", port=5001, debug=True)
