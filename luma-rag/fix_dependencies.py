# fix_dependencies.py
# 修复依赖版本冲突

print("🔧 修复依赖版本冲突...")

import subprocess
import sys

def run_command(command):
    """运行命令并显示输出"""
    print(f"🔄 执行: {command}")
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ 成功")
            if result.stdout:
                print(result.stdout)
        else:
            print("❌ 失败")
            if result.stderr:
                print(result.stderr)
        return result.returncode == 0
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False

print("="*60)
print("🚀 开始修复依赖包版本...")

# 方案1：升级到兼容版本
commands = [
    "pip install --upgrade langchain",
    "pip install --upgrade langchain-community", 
    "pip install --upgrade langchain-openai",
    "pip install --upgrade openai",
    "pip install --upgrade pydantic"
]

print("\n📦 升级核心依赖包...")
for cmd in commands:
    run_command(cmd)

print("\n" + "="*60)
print("✅ 依赖包升级完成！")
print("💡 请重新运行 rebuild_vector_db.py")
