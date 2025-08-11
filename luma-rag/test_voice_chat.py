#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
语音聊天功能测试脚本
"""

import requests
import json
import time

def test_chat_api():
    """测试聊天API"""
    print("=" * 50)
    print("🗣️  测试聊天API")
    print("=" * 50)
    
    url = "http://localhost:5001/chat"
    payload = {"message": "你好，我想测试一下聊天功能"}
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 聊天测试成功!")
            print(f"回复: {result.get('reply', 'No reply')}")
            print(f"内存轮数: {result.get('memory_turns', 0)}")
            print(f"使用模型: {result.get('model_used', 'Unknown')}")
            return result.get('reply', '')
        else:
            print(f"❌ 聊天测试失败: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ 聊天请求异常: {str(e)}")
        return None

def test_tts_api(text):
    """测试语音合成API"""
    print("\n" + "=" * 50)
    print("🔊 测试语音合成API")
    print("=" * 50)
    
    url = "http://localhost:5001/api/elevenlabs-tts"
    payload = {"text": text[:100]}  # 限制长度
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            # 检查是否返回音频数据
            content_type = response.headers.get('content-type', '')
            content_length = len(response.content)
            
            print(f"✅ TTS测试成功!")
            print(f"内容类型: {content_type}")
            print(f"音频数据大小: {content_length} bytes")
            
            if content_length > 1000:  # 音频文件通常比较大
                print("🎵 音频数据生成成功!")
                return True
            else:
                print("⚠️  音频数据较小，可能有问题")
                return False
        else:
            print(f"❌ TTS测试失败: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ TTS请求异常: {str(e)}")
        return False

def test_server_status():
    """测试服务器状态"""
    print("=" * 50)
    print("🏥 测试服务器状态")
    print("=" * 50)
    
    try:
        # 测试主页
        response = requests.get("http://localhost:5001/", timeout=10)
        print(f"主页状态码: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ 服务器运行正常")
            return True
        else:
            print("❌ 服务器响应异常")
            return False
            
    except Exception as e:
        print(f"❌ 服务器连接失败: {str(e)}")
        return False

def main():
    print("🎤 Luma语音聊天功能测试")
    print("=" * 60)
    
    # 1. 测试服务器状态
    if not test_server_status():
        print("❌ 服务器未运行，测试终止")
        return
    
    # 2. 测试聊天功能
    chat_reply = test_chat_api()
    if not chat_reply:
        print("❌ 聊天功能失败，跳过语音测试")
        return
    
    # 3. 测试语音合成
    tts_success = test_tts_api(chat_reply)
    
    # 4. 总结
    print("\n" + "=" * 60)
    print("📊 测试总结")
    print("=" * 60)
    print(f"🏥 服务器状态: ✅ 正常")
    print(f"💬 聊天功能: {'✅ 正常' if chat_reply else '❌ 失败'}")
    print(f"🔊 语音合成: {'✅ 正常' if tts_success else '❌ 失败'}")
    
    if chat_reply and tts_success:
        print("\n🎉 所有语音聊天功能测试通过!")
        print("📱 现在可以在浏览器中测试完整的语音界面:")
        print("   http://localhost:5001")
    else:
        print("\n⚠️  部分功能测试失败，请检查服务器配置")

if __name__ == "__main__":
    main()
