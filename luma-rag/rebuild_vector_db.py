# rebuild_vector_db.py
# 重新构建向量数据库 - 优化版本

import os
import sys
from dotenv import load_dotenv

def main():
    print("🔄 重新构建向量数据库...")
    print("="*50)

    # 加载环境变量
    load_dotenv()
    
    # 检查 API Key
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ 未找到 OPENAI_API_KEY 环境变量")
        print("💡 请确保 .env 文件中设置了 OPENAI_API_KEY")
        return False

    try:
        # 尝试不同的导入方式
        print("📦 导入依赖包...")
        
        # 导入基础包
        from langchain_community.document_loaders import TextLoader
        from langchain.text_splitter import RecursiveCharacterTextSplitter
        from langchain_community.vectorstores import FAISS
        
        # 尝试导入 OpenAI Embeddings
        embeddings = None
        try:
            from langchain_openai import OpenAIEmbeddings
            print("✅ 使用 langchain_openai")
            embeddings = OpenAIEmbeddings(
                openai_api_key=api_key,
                model="text-embedding-ada-002"
            )
        except ImportError as e1:
            print(f"⚠️ langchain_openai 失败: {e1}")
            try:
                from langchain.embeddings.openai import OpenAIEmbeddings
                print("✅ 使用 langchain.embeddings.openai")
                embeddings = OpenAIEmbeddings(openai_api_key=api_key)
            except ImportError as e2:
                print(f"❌ 两种导入方式都失败:")
                print(f"   新版本: {e1}")
                print(f"   旧版本: {e2}")
                return False
        except Exception as e:
            print(f"❌ Embeddings 初始化失败: {e}")
            # 尝试不指定模型
            try:
                embeddings = OpenAIEmbeddings(openai_api_key=api_key)
                print("✅ 使用默认模型创建 Embeddings")
            except Exception as e2:
                print(f"❌ 默认方式也失败: {e2}")
                return False

        if not embeddings:
            print("❌ 无法创建 OpenAI Embeddings")
            return False

        # 设置路径
        DOCS_PATH = "docs"
        VECTOR_DB_PATH = "vector_store"

        print(f"📁 文档路径: {DOCS_PATH}")
        print(f"📁 向量数据库路径: {VECTOR_DB_PATH}")

        # 检查文档目录
        if not os.path.exists(DOCS_PATH):
            print(f"❌ 文档目录不存在: {DOCS_PATH}")
            return False

        # 1. 加载所有文本文档
        print("\n📚 加载文档...")
        all_docs = []
        doc_count = 0
        
        txt_files = [f for f in os.listdir(DOCS_PATH) if f.endswith(".txt")]
        if not txt_files:
            print(f"❌ 在 {DOCS_PATH} 目录中未找到任何 .txt 文件")
            return False
        
        for file_name in txt_files:
            file_path = os.path.join(DOCS_PATH, file_name)
            try:
                loader = TextLoader(file_path, encoding="utf-8")
                docs = loader.load()
                all_docs.extend(docs)
                doc_count += 1
                print(f"  ✅ {file_name} ({len(docs)} 个文档对象)")
            except Exception as e:
                print(f"  ❌ {file_name}: {e}")
                # 尝试其他编码
                try:
                    loader = TextLoader(file_path, encoding="latin-1")
                    docs = loader.load()
                    all_docs.extend(docs)
                    doc_count += 1
                    print(f"  ✅ {file_name} (使用 latin-1 编码)")
                except Exception as e2:
                    print(f"  ❌ {file_name} 完全失败: {e2}")

        print(f"📖 总共加载了 {doc_count} 个文件，{len(all_docs)} 个文档对象")

        if not all_docs:
            print("❌ 没有加载到任何文档")
            return False

        # 2. 分割文档
        print("\n✂️ 分割文档...")
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500, 
            chunk_overlap=50,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )
        docs_split = text_splitter.split_documents(all_docs)
        print(f"📝 分割后得到 {len(docs_split)} 个文档块")

        if not docs_split:
            print("❌ 文档分割失败")
            return False

        # 3. 测试嵌入功能
        print("\n🧪 测试 Embeddings...")
        try:
            test_embedding = embeddings.embed_query("test")
            print(f"✅ Embeddings 测试成功，向量维度: {len(test_embedding)}")
        except Exception as e:
            print(f"❌ Embeddings 测试失败: {e}")
            return False

        # 4. 构建向量数据库
        print("\n🔨 构建向量数据库...")
        try:
            print("   正在创建向量数据库，请稍候...")
            db = FAISS.from_documents(docs_split, embeddings)
            print("✅ 向量数据库构建成功")
            
            # 测试数据库
            print("\n🔍 测试向量数据库...")
            test_queries = ["attachment theory", "trauma", "therapy"]
            for query in test_queries:
                try:
                    results = db.similarity_search(query, k=2)
                    print(f"  ✅ '{query}': 找到 {len(results)} 个结果")
                except Exception as e:
                    print(f"  ❌ '{query}': {e}")
            
        except Exception as e:
            print(f"❌ 向量数据库构建失败: {e}")
            import traceback
            traceback.print_exc()
            return False

        # 5. 保存向量数据库
        print("\n💾 保存向量数据库...")
        try:
            # 如果目录存在，先删除
            if os.path.exists(VECTOR_DB_PATH):
                import shutil
                shutil.rmtree(VECTOR_DB_PATH)
                print("🗑️ 删除旧的向量数据库")
            
            # 创建目录
            os.makedirs(VECTOR_DB_PATH, exist_ok=True)
            
            # 保存数据库
            db.save_local(VECTOR_DB_PATH)
            print("✅ 向量数据库保存成功")
            
            # 验证保存的文件
            saved_files = os.listdir(VECTOR_DB_PATH)
            print(f"📁 保存的文件: {saved_files}")
            
            # 验证可以重新加载
            print("\n🔄 验证数据库加载...")
            test_db = FAISS.load_local(VECTOR_DB_PATH, embeddings, allow_dangerous_deserialization=True)
            test_result = test_db.similarity_search("test", k=1)
            print(f"✅ 数据库验证成功，可以正常加载和查询")
            
        except Exception as e:
            print(f"❌ 保存失败: {e}")
            import traceback
            traceback.print_exc()
            return False

        print("\n" + "="*50)
        print("🎉 向量数据库重建完成！")
        print("✅ 现在可以运行查询系统了")
        print("💡 运行命令: python query_rag.py")
        return True
        
    except Exception as e:
        print(f"❌ 重建过程出错: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    if not success:
        print("\n❌ 向量数据库重建失败")
        sys.exit(1)
    else:
        print("\n🎊 所有操作完成！")
