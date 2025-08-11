from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route("/test")
def test():
    return jsonify({"status": "OK", "message": "Server working on 5001"})

@app.route("/api/test") 
def api_test():
    return jsonify({
        "status": "OK", 
        "message": "API test working on 5001",
        "port": 5001,
        "routes": ["/test", "/api/test", "/chat", "/reset_memory"]
    })

@app.route("/chat", methods=["GET", "POST"])
def chat():
    try:
        if request.method == "POST":
            data = request.get_json() or {}
            message = data.get("message", "No message")
            return jsonify({"response": f"Echo: {message}", "port": 5001})
        else:
            return jsonify({"message": "Chat endpoint ready", "port": 5001})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/reset_memory", methods=["POST"])
def reset():
    return jsonify({"message": "Memory reset on port 5001"})

@app.route("/")
def home():
    return jsonify({
        "status": "OK", 
        "message": "Server running on 5001",
        "available_routes": ["/test", "/api/test", "/chat", "/reset_memory"]
    })

if __name__ == "__main__":
    print("=== Complete Server on Port 5001 ===")
    print("Routes: /test, /api/test, /chat, /reset_memory")
    app.run(host="0.0.0.0", port=5001, debug=True)
