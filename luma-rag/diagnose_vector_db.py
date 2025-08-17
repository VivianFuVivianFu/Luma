# diagnose_vector_db.py
# 诊断向量数据库问题

import os
from dotenv import load_dotenv
from rag_paths import faiss_path_str

print("🔍 诊断向量数据库问题...")
print("="*50)

# 加载环境变量
load_dotenv()

# 1. 检查当前工作目录
print(f"📁 当前工作目录: {os.getcwd()}")

# 2. 检查向量数据库目录
vector_db_path = faiss_path_str()
print(f"📁 向量数据库路径: {vector_db_path}")
print(f"📁 向量数据库是否存在: {os.path.exists(vector_db_path)}")

if os.path.exists(vector_db_path):
    files = os.listdir(vector_db_path)
    print(f"📁 向量数据库文件: {files}")
    
    # 检查文件大小
    for file in files:
        file_path = os.path.join(vector_db_path, file)
        size = os.path.getsize(file_path)
        print(f"   {file}: {size} bytes")

# 3. 测试环境变量
openai_key = os.getenv("OPENAI_API_KEY")
print(f"🔑 OpenAI Key: {'存在' if openai_key else '不存在'}")

# 4. 测试依赖导入
try:
    from langchain_openai import OpenAIEmbeddings
    print("✅ OpenAIEmbeddings 导入成功")
except Exception as e:
    print(f"❌ OpenAIEmbeddings 导入失败: {e}")

try:
    from langchain_community.vectorstores import FAISS
    print("✅ FAISS 导入成功")
except Exception as e:
    print(f"❌ FAISS 导入失败: {e}")

# 5. 尝试加载向量数据库
try:
    if os.path.exists(vector_db_path):
        print("\n🔄 尝试加载向量数据库...")
        embeddings = OpenAIEmbeddings()
        print("✅ Embeddings 初始化成功")
        
        db = FAISS.load_local(faiss_path_str(), embeddings, allow_dangerous_deserialization=True)
        print(f"✅ 向量数据库加载成功！文档数量: {db.index.ntotal}")
        
        # 测试搜索
        test_question = "attachment theory"
        results = db.similarity_search(test_question, k=2)
        print(f"✅ 搜索测试成功，找到 {len(results)} 个结果")
        
        if results:
            print(f"📖 第一个结果预览: {results[0].page_content[:100]}...")
            
    else:
        print("❌ 向量数据库目录不存在")
        
except Exception as e:
    print(f"❌ 加载向量数据库失败: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*50)
print("🔍 诊断完成！")
