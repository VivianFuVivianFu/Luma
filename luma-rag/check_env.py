# check_env.py
# 检查环境变量加载是否正确

import os
from dotenv import load_dotenv

print("🔍 检查环境变量加载状态")
print("=" * 50)

# 加载 .env 文件
load_dotenv()

# 检查 Together.ai API Key
together_key = os.getenv("TOGETHER_API_KEY")
openai_key = os.getenv("OPENAI_API_KEY")

print("📁 当前工作目录:", os.getcwd())

if together_key:
    print(f"✅ TOGETHER_API_KEY 已找到: {together_key[:15]}...")
    print(f"📋 完整长度: {len(together_key)} 字符")
    print(f"🔤 开头: {together_key[:10]}")
else:
    print("❌ TOGETHER_API_KEY 未找到")

if openai_key:
    print(f"✅ OPENAI_API_KEY 已找到: {openai_key[:15]}...")
    print(f"📋 完整长度: {len(openai_key)} 字符")
    print(f"🔤 开头: {openai_key[:10]}")
else:
    print("❌ OPENAI_API_KEY 未找到")

# 检查 .env 文件是否存在
env_file = ".env"
if os.path.exists(env_file):
    print(f"\n📄 .env 文件存在")
    with open(env_file, 'r', encoding='utf-8') as f:
        content = f.read()
        print(f"📏 文件大小: {len(content)} 字符")
        lines = content.split('\n')
        print(f"📝 文件行数: {len(lines)}")
        
        print("\n📋 .env 文件内容（部分）:")
        for i, line in enumerate(lines[:5]):  # 只显示前5行
            if line.strip():
                key = line.split('=')[0] if '=' in line else line
                print(f"   {i+1}: {key}=...")
else:
    print(f"\n❌ .env 文件不存在")

# 手动检查环境变量
print(f"\n🔧 手动检查系统环境变量:")
all_env_vars = dict(os.environ)
together_vars = {k: v for k, v in all_env_vars.items() if 'TOGETHER' in k.upper()}
openai_vars = {k: v for k, v in all_env_vars.items() if 'OPENAI' in k.upper()}

if together_vars:
    print(f"🎯 找到 Together 相关变量: {list(together_vars.keys())}")
    for k, v in together_vars.items():
        print(f"   {k}: {v[:15]}...")
else:
    print(f"❌ 未找到 Together 相关环境变量")

if openai_vars:
    print(f"🎯 找到 OpenAI 相关变量: {list(openai_vars.keys())}")
    for k, v in openai_vars.items():
        print(f"   {k}: {v[:15]}...")
else:
    print(f"❌ 未找到 OpenAI 相关环境变量")
