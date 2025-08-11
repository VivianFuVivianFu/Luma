# deep_debug.py
# 深度调试 API Key 来源

import os
import sys
from dotenv import load_dotenv

print("🔍 深度调试 API Key 来源")
print("=" * 60)

print("📁 当前工作目录:", os.getcwd())
print("🐍 Python 可执行文件:", sys.executable)

# 1. 检查原始环境变量
print("\n1️⃣ 原始系统环境变量:")
original_together = os.environ.get("TOGETHER_API_KEY")
if original_together:
    print(f"   TOGETHER_API_KEY: {original_together}")
    print(f"   长度: {len(original_together)}")
    print(f"   类型: {type(original_together)}")
else:
    print("   TOGETHER_API_KEY: 未找到")

# 2. 手动读取 .env 文件
print("\n2️⃣ 手动读取 .env 文件:")
env_path = ".env"
if os.path.exists(env_path):
    print(f"   .env 文件存在: {os.path.abspath(env_path)}")
    with open(env_path, 'r', encoding='utf-8') as f:
        content = f.read()
        print(f"   文件大小: {len(content)} 字符")
        
    # 逐行解析
    with open(env_path, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if 'TOGETHER_API_KEY' in line:
                print(f"   第{line_num}行: {line}")
                if '=' in line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    print(f"   解析出的值: '{value}'")
                    print(f"   值的长度: {len(value)}")
else:
    print("   ❌ .env 文件不存在")

# 3. 使用 dotenv 加载
print("\n3️⃣ 使用 load_dotenv() 加载:")
load_dotenv()
after_load = os.getenv("TOGETHER_API_KEY")
if after_load:
    print(f"   加载后: {after_load}")
    print(f"   与原始相同: {after_load == original_together}")
else:
    print("   加载后: 未找到")

# 4. 使用 override=True 强制覆盖
print("\n4️⃣ 使用 load_dotenv(override=True):")
load_dotenv(override=True)
override_result = os.getenv("TOGETHER_API_KEY")
if override_result:
    print(f"   覆盖后: {override_result}")
    print(f"   与原始相同: {override_result == original_together}")
    print(f"   是否正确格式: {override_result.startswith('tgp_v1_')}")
else:
    print("   覆盖后: 未找到")

# 5. 检查所有包含 'sk_' 的环境变量
print("\n5️⃣ 所有包含 'sk_' 的环境变量:")
sk_vars = {k: v for k, v in os.environ.items() if 'sk_' in v.lower()}
for key, value in sk_vars.items():
    print(f"   {key}: {value[:20]}...")

# 6. 检查可能的路径问题
print("\n6️⃣ 检查可能的路径问题:")
possible_env_files = [
    ".env",
    "../.env", 
    "../../.env",
    os.path.expanduser("~/.env"),
    os.path.join(os.path.expanduser("~"), ".env")
]

for env_file in possible_env_files:
    if os.path.exists(env_file):
        print(f"   找到 .env 文件: {os.path.abspath(env_file)}")

# 7. 检查 Python 模块中是否有硬编码的值
print("\n7️⃣ 检查当前目录下的 Python 文件:")
import glob
py_files = glob.glob("*.py")
for py_file in py_files[:5]:  # 只检查前5个
    try:
        with open(py_file, 'r', encoding='utf-8') as f:
            content = f.read()
            if 'sk_48eebc' in content:
                print(f"   ⚠️  在 {py_file} 中找到硬编码的 API Key!")
    except:
        pass

print("\n" + "=" * 60)
print("🎯 诊断结果:")
if override_result and override_result.startswith('tgp_v1_'):
    print("✅ API Key 应该已经正确!")
elif original_together and original_together.startswith('sk_'):
    print("❌ 系统环境变量中有错误的 API Key")
    print("💡 建议: 重启计算机或重新登录")
else:
    print("❓ 需要进一步调试")
