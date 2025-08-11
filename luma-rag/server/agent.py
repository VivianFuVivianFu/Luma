import os
import requests
import io
from flask import Flask, request, jsonify, session, send_file, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# --- 1. 初始化和配置 ---
load_dotenv()
app = Flask(__name__)
CORS(app, supports_credentials=True)
app.secret_key = os.urandom(24)

# 初始化所有需要的客户端和密钥
together_api_key = os.getenv("TOGETHER_API_KEY")
elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY")
elevenlabs_voice_id = os.getenv("ELEVENLABS_VOICE_ID")

# 系统提示
SYSTEM_PROMPT = """You are Luma, a warm and trauma-informed AI companion specializing in CPTSD healing, internal family systems, and neuropsychology. 

Core traits:
- Speak with empathy, softness, and emotional safety
- Ask open-ended questions to encourage reflection
- Never give direct advice or diagnose
- Create a safe space for self-exploration
- Keep responses SHORT (1-3 sentences max)
- Use gentle language and show genuine care

Remember: You are not a therapist, but a supportive companion for healing journeys."""

# --- 2. 核心辅助函数 (已简化) ---

def get_ai_response(conversation_history: list) -> str:
    """
    一个专用于调用 LLaMA 3 的函数。
    """
    print("Using: Together.ai Llama-3 70B")
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + conversation_history
    
    headers = {
        "Authorization": f"Bearer {together_api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "meta-llama/Llama-3-70b-chat-hf",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 150
    }

    try:
        response = requests.post(
            "https://api.together.xyz/v1/chat/completions",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"ERROR: Together.ai Llama 3 API failed: {e}")
        return "I'm having trouble connecting right now, please try again in a moment."


def get_elevenlabs_audio(text: str):
    """调用 ElevenLabs API 并返回音频数据"""
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{elevenlabs_voice_id}"
    headers = {"Accept": "audio/mpeg", "Content-Type": "application/json", "xi-api-key": elevenlabs_api_key}
    data = {"text": text, "model_id": "eleven_multilingual_v2"}

    try:
        response = requests.post(url, json=data, headers=headers)
        response.raise_for_status()
        return response.content
    except Exception as e:
        print(f"ERROR: ElevenLabs API error: {e}")
        return None

# --- 3. API 接口 (Endpoints) (已简化) ---

# 文本聊天接口
@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.json
    user_input = data["message"]

    if 'history' not in session:
        session['history'] = []
    
    session['history'].append({"role": "user", "content": user_input})
    ai_reply = get_ai_response(session['history'])
    session['history'].append({"role": "assistant", "content": ai_reply})
    
    if len(session['history']) > 8 * 2:
        session['history'] = session['history'][-8*2:]
    
    session.modified = True
    return jsonify({"reply": ai_reply})

# 语音聊天接口
@app.route("/api/voice-chat", methods=["POST"])
def voice_chat():
    data = request.json
    user_input = data["question"]

    if 'history' not in session:
        session['history'] = []

    session['history'].append({"role": "user", "content": user_input})
    ai_text_reply = get_ai_response(session['history'])
    session['history'].append({"role": "assistant", "content": ai_text_reply})

    if len(session['history']) > 8 * 2:
        session['history'] = session['history'][-8*2:]

    session.modified = True
    
    audio_content = get_elevenlabs_audio(ai_text_reply)
    if audio_content:
        return send_file(io.BytesIO(audio_content), mimetype="audio/mpeg")
    else:
        return jsonify({"error": "语音合成失败"}), 500

# 重置记忆接口
@app.route("/api/reset_memory", methods=["POST"])
def reset_memory():
    session.pop('history', None)
    print("Memory reset for current session.")
    return jsonify({"status": "Memory reset successfully"})

# 健康检查接口 (已简化) 
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "together_key": "OK" if os.getenv("TOGETHER_API_KEY") else "MISSING",
        "elevenlabs_key": "OK" if os.getenv("ELEVENLABS_API_KEY") else "MISSING",
        "vectorstore_loaded": False,
        "timestamp": __import__('time').time()
    })

# RAG endpoints for Luma integration
@app.route("/context", methods=["POST"])
def get_context():
    """Get relevant context for a query - Mock implementation"""
    try:
        data = request.get_json()
        query = data.get("query", "")
        max_length = data.get("max_length", 1500)
        
        if not query:
            return jsonify({"error": "No query provided"}), 400
        
        print(f"Getting mock context for query: {query}")
        
        # Mock context based on common topics
        context = get_mock_context(query)
        
        return jsonify({
            "query": query,
            "context": context,
            "context_length": len(context)
        })
    except Exception as e:
        print(f"ERROR: Context retrieval failed: {e}")
        return jsonify({"error": f"Context retrieval failed: {str(e)}"}), 500

@app.route("/search", methods=["POST"]) 
def search_documents():
    """Search for relevant documents - Mock implementation"""
    try:
        data = request.get_json()
        query = data.get("query", "")
        k = data.get("k", 5)
        
        if not query:
            return jsonify({"error": "No query provided"}), 400
        
        print(f"Mock searching documents for: {query}")
        
        # Mock search results
        results = [{
            "content": f"Mock content related to: {query}",
            "score": 0.85,
            "metadata": {"source": "mock_document.txt"}
        }]
        
        return jsonify({
            "query": query,
            "results": results,
            "count": len(results)
        })
    except Exception as e:
        print(f"ERROR: Document search failed: {e}")
        return jsonify({"error": f"Document search failed: {str(e)}"}), 500

@app.route("/documents", methods=["GET"])
def get_documents():
    """Get list of available documents"""
    try:
        docs_path = "../docs"
        if os.path.exists(docs_path):
            documents = [f for f in os.listdir(docs_path) if f.endswith('.txt')]
        else:
            documents = ["cptsd_surviving_to_thriving.txt", "attached_amir_levine.txt", "body_keeps_the_score.txt"]
        
        print(f"Available documents: {len(documents)}")
        return jsonify({"documents": documents})
    except Exception as e:
        print(f"ERROR: Failed to get documents: {e}")
        return jsonify({"documents": []})

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

# --- 4. 启动服务器 ---
if __name__ == "__main__":
    print("Starting Luma Chat Server (LLaMA 3 70B Only)...")
    app.run(debug=True, host="0.0.0.0", port=5001)
    
