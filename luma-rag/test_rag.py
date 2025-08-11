# test_rag.py
# 简单测试脚本

import os
import sys
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

try:
    print("🔍 测试 RAG 系统...")
    
    # 导入修复后的模块
    from query_rag_fixed import load_vectorstore, search_relevant_docs, build_prompt_with_context, ask_llama
    
    print("✅ 模块导入成功")
    
    # 测试向量数据库
    print("📚 加载向量数据库...")
    db = load_vectorstore()
    print("✅ 向量数据库加载成功")
    
    # 测试搜索
    question = "为什么cptsd的人容易得焦虑型依恋？"
    print(f"🔍 搜索问题: {question}")
    
    docs = search_relevant_docs(question, k=3)
    print(f"✅ 找到 {len(docs)} 个相关文档")
    
    if docs:
        # 构建提示
        prompt = build_prompt_with_context(question, docs)
        print("✅ 提示构建成功")
        
        # 使用 LLaMA 回答
        print("🧠 正在生成回答...")
        answer = ask_llama(prompt)
        
        print("\n" + "="*60)
        print(f"❓ 问题: {question}")
        print("\n🤖 Luma的回答:")
        print(answer)
        print("="*60)
    else:
        print("❌ 未找到相关文档")
        
except Exception as e:
    print(f"❌ 错误: {e}")
    import traceback
    traceback.print_exc()
