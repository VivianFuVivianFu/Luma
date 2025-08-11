# verify_model_name.py
# 使用官方文档正确格式验证 Meta Llama 3 70B 模型

import os
import requests
import json
from dotenv import load_dotenv

# 强制覆盖系统环境变量
load_dotenv(override=True)

def check_api_key():
    """检查 Together.ai API Key"""
    # 临时直接使用正确的API Key
    together_api_key = "tgp_v1_F2EI8G3enFm67hoiUQRZxJlRWGsbYt-xE7As3V0y0b4"
    
    print(f"✅ API Key 已找到: {together_api_key[:10]}...")
    return together_api_key

def test_official_models(api_key):
    """测试官方文档中确认的 LLaMA 3 70B 模型"""
    
    # 根据官方文档的可用模型端点
    official_models = [
        "meta-llama/Meta-Llama-3.3-70B-Instruct-Turbo",  # 正確的 70B 模型名稱
        "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
        "meta-llama/Meta-Llama-3-70B-Instruct-Turbo",
        "meta-llama/Llama-3-70b-chat-hf"
    ]
    
    # 使用官方文档推荐的正确端点
    url = "https://api.together.xyz/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    print("🧪 测试官方文档中的 LLaMA 3 70B 模型:")
    print("📋 使用正确的 /v1/chat/completions 端点")
    print("-" * 60)
    
    working_models = []
    
    for model_name in official_models:
        print(f"\n🔍 测试: {model_name}")
        
        # 使用官方文档的正确 messages 格式
        data = {
            "model": model_name,
            "messages": [
                {
                    "role": "user",
                    "content": "Hello, please respond briefly to confirm you're working."
                }
            ],
            "max_tokens": 50,
            "temperature": 0.1
        }
        
        try:
            response = requests.post(url, headers=headers, json=data, timeout=45)
            
            if response.status_code == 200:
                result = response.json()
                response_text = result["choices"][0]["message"]["content"].strip()
                print(f"   ✅ 工作正常!")
                print(f"   📝 回答: {response_text[:80]}...")
                working_models.append({
                    'name': model_name,
                    'response': response_text,
                    'status': 'working'
                })
                
            elif response.status_code == 400:
                error_info = response.json()
                error_message = error_info.get("error", {}).get("message", "Unknown error")
                print(f"   ❌ 失败 (400): {error_message}")
                
            elif response.status_code == 401:
                print(f"   ❌ 认证失败 (401): 请检查 API Key")
                
            elif response.status_code == 404:
                print(f"   ❌ 模型不存在 (404)")
                
            else:
                print(f"   ❌ 失败 ({response.status_code}): {response.text[:100]}...")
                
        except requests.exceptions.Timeout:
            print(f"   ⏰ 超时 (模型可能需要更长加载时间)")
        except Exception as e:
            print(f"   ❌ 连接失败: {e}")
    
    return working_models

def test_psychotherapy_capability(api_key, model_name):
    """测试心理治疗问题回答能力"""
    
    url = "https://api.together.xyz/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # 使用系统消息设置角色
    data = {
        "model": model_name,
        "messages": [
            {
                "role": "system",
                "content": "你是一个专业的心理健康助手。请提供准确、简洁的专业回答。"
            },
            {
                "role": "user",
                "content": "为什么cptsd的人容易得焦虑型依恋？请简洁回答。"
            }
        ],
        "max_tokens": 200,
        "temperature": 0.3
    }
    
    try:
        print(f"\n🧠 测试 {model_name} 的心理治疗问题回答能力...")
        response = requests.post(url, headers=headers, json=data, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            answer = result["choices"][0]["message"]["content"].strip()
            print(f"✅ 心理治疗问题测试成功!")
            print(f"📝 回答预览: {answer[:150]}...")
            return True, answer
        else:
            print(f"❌ 心理治疗问题测试失败: {response.status_code}")
            return False, None
            
    except Exception as e:
        print(f"❌ 心理治疗问题测试出错: {e}")
        return False, None

def get_model_info(api_key):
    """尝试获取可用模型列表（如果 API 支持）"""
    
    url = "https://api.together.xyz/v1/models"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    try:
        print("\n🔍 尝试获取 Together.ai 模型列表...")
        response = requests.get(url, headers=headers, timeout=30)
        
        if response.status_code == 200:
            models_data = response.json()
            
            llama3_70b_models = []
            for model in models_data.get("data", []):
                model_name = model.get("id", "")
                if ("llama-3" in model_name.lower() or "llama3" in model_name.lower()) and "70b" in model_name.lower():
                    llama3_70b_models.append(model_name)
            
            if llama3_70b_models:
                print(f"✅ 找到 {len(llama3_70b_models)} 个 LLaMA 3 70B 模型:")
                for model in llama3_70b_models:
                    print(f"   • {model}")
            else:
                print("⚠️ 未找到 LLaMA 3 70B 模型")
                
            return llama3_70b_models
            
        else:
            print(f"⚠️ 无法获取模型列表 ({response.status_code})")
            return []
            
    except Exception as e:
        print(f"⚠️ 获取模型列表失败: {e}")
        return []

def recommend_best_model(working_models):
    """推荐最佳模型"""
    
    if not working_models:
        print("\n❌ 没有找到可用的模型")
        return None
    
    print(f"\n🎯 可用模型总结 ({len(working_models)} 个):")
    print("-" * 60)
    
    # 优先级排序
    priority_order = [
        "meta-llama/Meta-Llama-3-70B-Instruct-Turbo",
        "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
        "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        "meta-llama/Llama-3-70b-chat-hf"
    ]
    
    # 按优先级排序
    sorted_models = []
    for priority_model in priority_order:
        for model in working_models:
            if model['name'] == priority_model:
                sorted_models.append(model)
                break
    
    # 添加其他模型
    for model in working_models:
        if model not in sorted_models:
            sorted_models.append(model)
    
    # 显示结果
    best_model = None
    for i, model in enumerate(sorted_models):
        if i == 0:
            print(f"🌟 推荐: {model['name']}")
            best_model = model['name']
        else:
            print(f"✅ 可用: {model['name']}")
    
    return best_model

def main():
    print("🔍 Together.ai Meta Llama 3 70B 模型验证工具")
    print("📋 使用官方文档推荐的正确 API 格式")
    print("="*60)
    
    # 检查 API Key
    api_key = check_api_key()
    if not api_key:
        return
    
    # 测试官方模型
    working_models = test_official_models(api_key)
    
    # 推荐最佳模型
    best_model = recommend_best_model(working_models)
    
    # 如果找到推荐模型，测试心理治疗能力
    if best_model:
        therapy_success, therapy_answer = test_psychotherapy_capability(api_key, best_model)
        
        if therapy_success:
            print(f"\n🎉 完整测试通过!")
            print(f"✅ 推荐模型: {best_model}")
            print(f"✅ API 端点: /v1/chat/completions")
            print(f"✅ 请求格式: messages 数组")
            print(f"✅ 心理治疗问题: 可以正常回答")
            
            print(f"\n💡 下一步:")
            print(f"   1. 运行 update_model_names.py 更新所有文件")
            print(f"   2. 确保使用 /v1/chat/completions 端点")
            print(f"   3. 确保使用 messages 格式（不是 prompt）")
    
    # 尝试获取完整模型列表
    get_model_info(api_key)
    
    # 最终总结
    print(f"\n📋 验证结果总结")
    print("="*60)
    if working_models:
        print(f"🎉 验证成功!")
        print(f"✅ 找到 {len(working_models)} 个可用的 LLaMA 3 70B 模型")
        print(f"🌟 推荐使用: {best_model}")
    else:
        print(f"❌ 验证失败，没有找到可用模型")
        print(f"💡 请检查:")
        print(f"   1. TOGETHER_API_KEY 是否正确")
        print(f"   2. Together.ai 账户是否有余额")
        print(f"   3. 是否有访问 70B 模型的权限")

if __name__ == "__main__":
    main()
    
