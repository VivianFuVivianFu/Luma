# debug_env.py
# 调试环境变量问题

import os
import sys
from dotenv import load_dotenv

print("🔍 环境变量调试工具")
print("=" * 60)

print("📁 当前工作目录:", os.getcwd())
print("🐍 Python 路径:", sys.executable)

print("\n1️⃣ 检查系统环境变量（在加载 .env 之前）:")
system_together = os.environ.get("TOGETHER_API_KEY")
system_openai = os.environ.get("OPENAI_API_KEY")

if system_together:
    print(f"⚠️  系统中已有 TOGETHER_API_KEY: {system_together[:15]}...")
else:
    print("✅ 系统中没有 TOGETHER_API_KEY")

if system_openai:
    print(f"⚠️  系统中已有 OPENAI_API_KEY: {system_openai[:15]}...")
else:
    print("✅ 系统中没有 OPENAI_API_KEY")

print("\n2️⃣ 检查 .env 文件:")
env_file = ".env"
if os.path.exists(env_file):
    print(f"✅ .env 文件存在")
    with open(env_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        print(f"📄 .env 文件内容:")
        for i, line in enumerate(lines, 1):
            line = line.strip()
            if line and not line.startswith('#'):
                if '=' in line:
                    key, value = line.split('=', 1)
                    if 'API_KEY' in key:
                        print(f"   第{i}行: {key}={value[:15]}...")
                    else:
                        print(f"   第{i}行: {line}")
            elif line.startswith('#'):
                print(f"   第{i}行: {line} (注释)")
else:
    print("❌ .env 文件不存在")

print("\n3️⃣ 加载 .env 文件:")
load_dotenv()

print("\n4️⃣ 检查加载后的环境变量:")
after_together = os.getenv("TOGETHER_API_KEY")
after_openai = os.getenv("OPENAI_API_KEY")

print(f"TOGETHER_API_KEY: {after_together[:15] if after_together else 'None'}...")
print(f"OPENAI_API_KEY: {after_openai[:15] if after_openai else 'None'}...")

print("\n5️⃣ 检查所有环境变量中的 API Keys:")
all_env = dict(os.environ)
api_keys = {k: v for k, v in all_env.items() if 'API_KEY' in k.upper() or k.upper().startswith('SK_') or k.upper().startswith('TGP_')}

if api_keys:
    print("🔑 找到的所有 API 相关变量:")
    for key, value in api_keys.items():
        print(f"   {key}: {value[:15]}...")
else:
    print("❌ 没有找到任何 API 相关变量")

print("\n6️⃣ 检查 dotenv 是否覆盖:")
print(f"Override 设置: {load_dotenv.__doc__}")

# 重新加载，强制覆盖
print("\n7️⃣ 强制重新加载 .env:")
load_dotenv(override=True)
final_together = os.getenv("TOGETHER_API_KEY")
final_openai = os.getenv("OPENAI_API_KEY")

print(f"最终 TOGETHER_API_KEY: {final_together[:15] if final_together else 'None'}...")
print(f"最终 OPENAI_API_KEY: {final_openai[:15] if final_openai else 'None'}...")

print("\n" + "=" * 60)
print("💡 分析结果:")
if system_together and system_together != final_together:
    print("⚠️  发现系统环境变量与 .env 文件冲突！")
    print("📝 建议：删除系统环境变量或使用 load_dotenv(override=True)")
elif not final_together:
    print("❌ 没有找到 TOGETHER_API_KEY")
elif final_together.startswith('tgp_v1_'):
    print("✅ TOGETHER_API_KEY 格式正确")
else:
    print("⚠️  TOGETHER_API_KEY 格式可能不正确")
