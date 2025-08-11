# test_together_basic.py
# 測試 Together.ai API Key 基本功能

import os
import requests
from dotenv import load_dotenv

load_dotenv()

def test_basic_api():
    """使用小模型測試基本 API 連接"""
    
    api_key = os.getenv("TOGETHER_API_KEY")
    if not api_key:
        print("❌ 未找到 TOGETHER_API_KEY")
        return
    
    print(f"🔑 測試 API Key: {api_key[:10]}...")
    
    # 使用更便宜的小模型測試
    test_models = [
        "meta-llama/Meta-Llama-3.3-70B-Instruct-Turbo",  # 正確的 70B 模型名稱
        "meta-llama/Llama-3.2-3B-Instruct-Turbo",        # 3B 模型，更便宜
        "meta-llama/Llama-3.2-1B-Instruct-Turbo",        # 1B 模型，最便宜
        "mistralai/Mistral-7B-Instruct-v0.1",            # Mistral 7B
    ]
    
    url = "https://api.together.xyz/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    for model in test_models:
        print(f"\n🧪 測試小模型: {model}")
        
        data = {
            "model": model,
            "messages": [{"role": "user", "content": "Hello"}],
            "max_tokens": 10
        }
        
        try:
            response = requests.post(url, headers=headers, json=data, timeout=30)
            
            if response.status_code == 200:
                print(f"✅ API Key 工作正常！")
                print(f"🎯 問題：可能沒有訪問 70B 模型的權限")
                return True
            elif response.status_code == 401:
                print(f"❌ API Key 無效或過期")
                return False
            else:
                print(f"⚠️ 狀態碼: {response.status_code}")
                print(f"   回應: {response.text}")
                
        except Exception as e:
            print(f"❌ 連接失敗: {e}")
    
    return False

def check_account_info():
    """檢查賬戶信息"""
    
    api_key = os.getenv("TOGETHER_API_KEY")
    
    # 嘗試獲取賬戶信息（如果 API 支持）
    endpoints_to_try = [
        "https://api.together.xyz/v1/models",
        "https://api.together.xyz/v1/account",
        "https://api.together.xyz/account"
    ]
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    for endpoint in endpoints_to_try:
        try:
            print(f"\n🔍 嘗試獲取賬戶信息: {endpoint}")
            response = requests.get(endpoint, headers=headers, timeout=30)
            
            if response.status_code == 200:
                print(f"✅ 賬戶信息獲取成功")
                data = response.json()
                print(f"📊 回應: {str(data)[:200]}...")
                return True
            else:
                print(f"⚠️ 狀態碼: {response.status_code}")
                
        except Exception as e:
            print(f"❌ 失敗: {e}")
    
    return False

if __name__ == "__main__":
    print("🔍 Together.ai API Key 基本測試")
    print("="*50)
    
    # 測試基本連接
    if test_basic_api():
        print(f"\n💡 建議解決方案:")
        print(f"   1. 聯繫 Together.ai 申請 70B 模型訪問權限")
        print(f"   2. 或使用較小的模型（3B, 7B）")
        print(f"   3. 檢查賬戶是否有足夠餘額")
    else:
        print(f"\n💡 需要修復 API Key:")
        print(f"   1. 檢查 Together.ai 控制台")
        print(f"   2. 重新生成 API Key")
        print(f"   3. 更新 .env 文件")
    
    # 嘗試獲取賬戶信息
    check_account_info()
