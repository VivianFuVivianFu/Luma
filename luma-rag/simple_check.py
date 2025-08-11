# simple_check.py
# 简单检查API Key是否正确

import os
from dotenv import load_dotenv

# 显式加载.env文件
load_dotenv()

print("=== API Key 检查 ===")

# 检查Together.ai API Key
together_key = os.getenv("TOGETHER_API_KEY")
if together_key:
    print(f"✅ TOGETHER_API_KEY: {together_key[:15]}...")
    if together_key.startswith("tgp_v1_"):
        print("✅ Together.ai API Key 格式正确")
    else:
        print("❌ Together.ai API Key 格式错误，应该以 tgp_v1_ 开头")
else:
    print("❌ 未找到 TOGETHER_API_KEY")

# 检查OpenAI API Key  
openai_key = os.getenv("OPENAI_API_KEY")
if openai_key:
    print(f"✅ OPENAI_API_KEY: {openai_key[:15]}...")
    if openai_key.startswith("sk-"):
        print("✅ OpenAI API Key 格式正确")
    else:
        print("❌ OpenAI API Key 格式错误，应该以 sk- 开头")
else:
    print("❌ 未找到 OPENAI_API_KEY")

print("\n=== 环境变量来源检查 ===")
import sys
print(f"当前工作目录: {os.getcwd()}")
print(f"Python路径: {sys.executable}")

# 检查是否有其他来源的环境变量
env_sources = []
if "TOGETHER_API_KEY" in os.environ:
    env_sources.append("系统环境变量")
if os.path.exists(".env"):
    env_sources.append(".env文件") 
    
print(f"可能的环境变量来源: {env_sources}")
