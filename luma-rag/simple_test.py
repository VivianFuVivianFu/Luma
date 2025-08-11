from flask import Flask
app = Flask(__name__)

@app.route("/")
def hello():
    return "Hello Luma! Server is running!"

if __name__ == "__main__":
    print("Starting simple server...")
    app.run(debug=True, port=5000)
