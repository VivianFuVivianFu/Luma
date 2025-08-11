# test_rag_system.py
# 测试RAG系统功能

import os
from dotenv import load_dotenv

# 强制加载正确的API Key
os.environ["TOGETHER_API_KEY"] = "tgp_v1_F2EI8G3enFm67hoiUQRZxJlRWGsbYt-xE7As3V0y0b4"

print("🧪 RAG系统测试")
print("=" * 50)

try:
    # 导入RAG功能
    from query_rag import search_relevant_docs, build_prompt_with_context, ask_llama
    print("✅ 成功导入RAG模块")
    
    # 测试问题
    test_question = "为什么cptsd的人容易得焦虑型依恋？"
    print(f"\n🤔 测试问题: {test_question}")
    
    # 1. 搜索相关文档
    print("\n📚 搜索相关文档...")
    docs = search_relevant_docs(test_question)
    print(f"✅ 找到 {len(docs)} 个相关文档片段")
    
    # 显示前几个文档片段
    for i, doc in enumerate(docs[:2]):
        content = doc.page_content[:100] + "..." if len(doc.page_content) > 100 else doc.page_content
        print(f"   文档{i+1}: {content}")
    
    # 2. 构建提示
    print("\n📝 构建提示...")
    prompt = build_prompt_with_context(test_question, docs)
    print(f"✅ 提示长度: {len(prompt)} 字符")
    
    # 3. 获取LLaMA回答
    print("\n🧠 调用LLaMA模型...")
    answer = ask_llama(prompt)
    print(f"✅ 获得回答 (长度: {len(answer)} 字符)")
    
    # 显示回答
    print("\n💡 LLaMA回答:")
    print("-" * 50)
    print(answer)
    print("-" * 50)
    
    print("\n🎉 RAG系统测试成功！")
    
except ImportError as e:
    print(f"❌ 导入错误: {e}")
    print("💡 请确保所有必要的文件都存在")
    
except Exception as e:
    print(f"❌ 测试过程中出现错误: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 50)
print("测试完成")
