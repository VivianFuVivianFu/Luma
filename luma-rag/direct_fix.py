# direct_fix.py
# 直接修复API Key问题

import os

# 直接设置正确的API Key，绕过所有环境变量问题
os.environ["TOGETHER_API_KEY"] = "tgp_v1_F2EI8G3enFm67hoiUQRZxJlRWGsbYt-xE7As3V0y0b4"

# 验证设置
print("🔧 直接设置API Key")
print(f"TOGETHER_API_KEY: {os.getenv('TOGETHER_API_KEY')[:15]}...")

# 导入并运行验证
from verify_model_name import check_api_key, test_official_models

if __name__ == "__main__":
    print("="*50)
    api_key = check_api_key()
    if api_key:
        test_official_models(api_key)
