# rebuild_vector_db_compatible.py
# 兼容版本的向量数据库重建

import os
from dotenv import load_dotenv
from rag_paths import faiss_path_str

print("🔄 重新构建向量数据库（兼容版本）...")
print("="*50)

# 加载环境变量
load_dotenv()

try:
    # 使用新的兼容性导入方案
    print("📦 导入依赖包...")
    
    from langchain_community.document_loaders import TextLoader
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain_community.vectorstores import FAISS
    
    # 🔧 使用兼容性嵌入工具
    from embedding_utils import get_openai_embeddings
    print("✅ 导入成功")

    # 设置路径
    DOCS_PATH = "docs"
    VECTOR_DB_PATH = faiss_path_str()

    print(f"📁 文档路径: {DOCS_PATH}")
    print(f"📁 向量数据库路径: {VECTOR_DB_PATH}")

    # 检查文档目录
    if not os.path.exists(DOCS_PATH):
        print(f"❌ 文档目录不存在: {DOCS_PATH}")
        exit(1)

    # 1. 加载所有文本文档
    print("\n📚 加载文档...")
    all_docs = []
    doc_count = 0
    
    for file_name in os.listdir(DOCS_PATH):
        if file_name.endswith(".txt"):
            file_path = os.path.join(DOCS_PATH, file_name)
            try:
                loader = TextLoader(file_path, encoding="utf-8")
                docs = loader.load()
                all_docs.extend(docs)
                doc_count += 1
                print(f"  ✅ {file_name}")
            except Exception as e:
                print(f"  ❌ {file_name}: {e}")

    print(f"📖 总共加载了 {doc_count} 个文档，{len(all_docs)} 个文档对象")

    if not all_docs:
        print("❌ 没有加载到任何文档")
        exit(1)

    # 2. 分割文档
    print("\n✂️ 分割文档...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500, 
        chunk_overlap=50
    )
    docs_split = text_splitter.split_documents(all_docs)
    print(f"📝 分割后得到 {len(docs_split)} 个文档块")

    # 3. 创建嵌入（使用兼容性工具）
    print("\n🔗 创建嵌入...")
    try:
        embeddings = get_openai_embeddings()
        print("✅ Embeddings 创建成功")
    except Exception as e:
        print(f"❌ Embeddings 创建失败: {e}")
        print("💡 这可能是版本兼容性问题")
        exit(1)

    # 4. 构建向量数据库
    print("\n🔨 构建向量数据库...")
    try:
        db = FAISS.from_documents(docs_split, embeddings)
        print("✅ 向量数据库构建成功")
        
    except Exception as e:
        print(f"❌ 向量数据库构建失败: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

    # 5. 保存向量数据库
    print("\n💾 保存向量数据库...")
    try:
        # 如果目录存在，先删除
        if os.path.exists(VECTOR_DB_PATH):
            import shutil
            shutil.rmtree(VECTOR_DB_PATH)
            print("🗑️ 删除旧的向量数据库")
        
        db.save_local(faiss_path_str())
        print("✅ 向量数据库保存成功")
        
        # 验证保存
        saved_files = os.listdir(VECTOR_DB_PATH)
        print(f"📁 保存的文件: {saved_files}")
        
        # 测试加载
        print("\n🧪 测试重新加载...")
        db_test = FAISS.load_local(faiss_path_str(), embeddings, allow_dangerous_deserialization=True)
        test_results = db_test.similarity_search("attachment", k=2)
        print(f"✅ 测试成功，找到 {len(test_results)} 个结果")
        
    except Exception as e:
        print(f"❌ 保存/测试失败: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

    print("\n" + "="*50)
    print("🎉 向量数据库重建完成！")
    print("✅ 现在可以运行查询系统了")
    
except Exception as e:
    print(f"❌ 重建过程出错: {e}")
    import traceback
    traceback.print_exc()
    
    print("\n💡 建议手动操作步骤：")
    print("1. 运行: pip install --upgrade langchain langchain-openai openai")
    print("2. 重新运行: python rag_pipeline.py")
    print("3. 或者运行: python rebuild_vector_db_compatible.py")
