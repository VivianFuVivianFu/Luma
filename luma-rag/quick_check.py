import os
print("System ENV:", os.environ.get("TOGETHER_API_KEY", "Not found"))
from dotenv import load_dotenv
load_dotenv()
print("After .env:", os.getenv("TOGETHER_API_KEY", "Not found"))
