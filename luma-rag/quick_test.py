# quick_test.py
# 快速测试您的问题

print("🔍 快速测试开始...")

try:
    # 检查环境变量
    import os
    from dotenv import load_dotenv
    from rag_paths import faiss_path_str
    load_dotenv()
    
    openai_key = os.getenv("OPENAI_API_KEY")
    together_key = os.getenv("TOGETHER_API_KEY")
    
    print(f"OpenAI Key: {'✅ 已设置' if openai_key else '❌ 未设置'}")
    print(f"Together Key: {'✅ 已设置' if together_key else '❌ 未设置'}")
    
    # 检查依赖包
    try:
        from together import Together
        print("✅ together 包已安装")
    except ImportError:
        print("❌ together 包未安装，请运行: pip install together")
        
    try:
        from langchain_openai import OpenAIEmbeddings
        print("✅ langchain_openai 包已安装")
    except ImportError:
        print("❌ langchain_openai 包未安装")
        
    try:
        from langchain_community.vectorstores import FAISS
        print("✅ langchain_community 包已安装")
    except ImportError:
        print("❌ langchain_community 包未安装")
    
    # 检查向量数据库
    if os.path.exists(faiss_path_str()):
        print("✅ 向量数据库存在")
        
        # 尝试加载
        embeddings = OpenAIEmbeddings()
        db = FAISS.load_local(faiss_path_str(), embeddings, allow_dangerous_deserialization=True)
        print(f"✅ 向量数据库加载成功，包含 {db.index.ntotal} 个文档块")
        
        # 测试搜索
        question = "为什么cptsd的人容易得焦虑型依恋"
        results = db.similarity_search(question, k=3)
        print(f"✅ 搜索成功，找到 {len(results)} 个相关文档")
        
        if results:
            print(f"📖 第一个文档预览: {results[0].page_content[:150]}...")
            
    else:
        print("❌ 向量数据库不存在")

except Exception as e:
    print(f"❌ 错误: {e}")
    import traceback
    traceback.print_exc()

print("\n🔍 测试完成！")
