# final_test.py
import os
from dotenv import load_dotenv

print("=== 最终测试 ===")
print("1. 系统环境变量:")
sys_key = os.environ.get("TOGETHER_API_KEY")
if sys_key:
    print(f"   TOGETHER_API_KEY: {sys_key[:15]}...")
else:
    print("   TOGETHER_API_KEY: 未设置")

print("\n2. 加载 .env (不覆盖):")
load_dotenv()
env_key = os.getenv("TOGETHER_API_KEY")
if env_key:
    print(f"   TOGETHER_API_KEY: {env_key[:15]}...")
else:
    print("   TOGETHER_API_KEY: 未找到")

print("\n3. 强制加载 .env (覆盖):")
load_dotenv(override=True)
final_key = os.getenv("TOGETHER_API_KEY")
if final_key:
    print(f"   TOGETHER_API_KEY: {final_key[:15]}...")
    if final_key.startswith("tgp_v1_"):
        print("   ✅ 格式正确")
    else:
        print("   ❌ 格式错误")
else:
    print("   TOGETHER_API_KEY: 未找到")

print(f"\n结论: 系统变量 {'冲突' if sys_key and sys_key != final_key else '正常'}")
