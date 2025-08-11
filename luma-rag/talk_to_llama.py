from together import Together
import os
from dotenv import load_dotenv

# 加载 .env 文件中的 TOGETHER_API_KEY
load_dotenv(".env")  # 显式指定 .env 文件路径

# 获取API密钥并创建客户端
api_key = os.getenv('TOGETHER_API_KEY')
if not api_key:
    # 如果环境变量没有加载，直接设置
    api_key = "fb7aff549ab882fc14736723a326d1797588568c0f0edaa89f7e3b29492a3cb1"

client = Together(api_key=api_key)

response = client.chat.completions.create(
    model="meta-llama/Llama-3.2-3B-Instruct-Turbo",
    messages=[
        {"role": "system", "content": "You are Luma, a warm, trauma-informed AI companion specializing in CPTSD healing, internal family systems, and neuropsychology."},
        {"role": "user", "content": "I feel very anxious and alone today. Can you help me?"}
    ]
)

print(response.choices[0].message.content)

