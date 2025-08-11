# rag_pipeline.py
# 改进版本，增加错误处理

import os
import dotenv

# 加载环境变量
dotenv.load_dotenv()

def main():
    print("🚀 开始构建知识库...")
    print("="*40)

    # 检查 API Key
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ 未找到 OPENAI_API_KEY 环境变量")
        print("💡 请检查 .env 文件")
        return False

    try:
        # 导入依赖
        print("📦 导入依赖包...")
        from langchain_community.document_loaders import TextLoader
        from langchain.text_splitter import RecursiveCharacterTextSplitter
        from langchain_community.vectorstores import FAISS
        
        # 尝试导入 OpenAI Embeddings
        try:
            from langchain_openai import OpenAIEmbeddings
            print("✅ 使用 langchain_openai")
        except ImportError:
            print("⚠️ langchain_openai 不可用，尝试旧版本...")
            from langchain.embeddings.openai import OpenAIEmbeddings
            print("✅ 使用 langchain.embeddings.openai")

        # 设置路径
        DOCS_PATH = "docs"
        VECTOR_DB_PATH = "vector_store"

        print(f"📁 文档路径: {DOCS_PATH}")
        print(f"📁 向量库路径: {VECTOR_DB_PATH}")

        # 检查文档目录
        if not os.path.exists(DOCS_PATH):
            print(f"❌ 文档目录不存在: {DOCS_PATH}")
            return False

        # 1️⃣ 加载所有文本
        print("\n📚 加载文档...")
        all_docs = []
        doc_count = 0
        
        txt_files = [f for f in os.listdir(DOCS_PATH) if f.endswith(".txt")]
        if not txt_files:
            print(f"❌ 在 {DOCS_PATH} 中未找到 .txt 文件")
            return False

        for file_name in txt_files:
            try:
                file_path = os.path.join(DOCS_PATH, file_name)
                loader = TextLoader(file_path, encoding="utf-8")
                docs = loader.load()
                all_docs.extend(docs)
                doc_count += 1
                print(f"  ✅ {file_name}")
            except Exception as e:
                print(f"  ❌ {file_name}: {e}")

        print(f"📖 成功加载 {doc_count} 个文档，共 {len(all_docs)} 个文档对象")

        if not all_docs:
            print("❌ 没有加载到任何文档")
            return False

        # 2️⃣ 切割文本为小块
        print("\n✂️ 分割文档...")
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500, 
            chunk_overlap=50
        )
        docs_split = text_splitter.split_documents(all_docs)
        print(f"📝 分割成 {len(docs_split)} 个文档块")

        # 3️⃣ 创建嵌入
        print("\n🔗 创建 OpenAI Embeddings...")
        try:
            # 先尝试不传递任何参数
            embeddings = OpenAIEmbeddings()
            print("✅ Embeddings 创建成功")
        except Exception as e:
            print(f"⚠️ 默认方式失败: {e}")
            # 尝试显式传递 API key
            try:
                embeddings = OpenAIEmbeddings(openai_api_key=os.getenv("OPENAI_API_KEY"))
                print("✅ Embeddings 创建成功（显式 API key）")
            except Exception as e2:
                print(f"❌ Embeddings 创建失败: {e2}")
                return False

        # 测试 embeddings
        print("🧪 测试 Embeddings...")
        try:
            test_result = embeddings.embed_query("test")
            print(f"✅ 测试成功，向量维度: {len(test_result)}")
        except Exception as e:
            print(f"❌ Embeddings 测试失败: {e}")
            return False

        # 4️⃣ 构建 FAISS 向量库
        print("\n🔨 构建向量库...")
        print("   这可能需要几分钟，请耐心等待...")
        try:
            db = FAISS.from_documents(docs_split, embeddings)
            print("✅ 向量库构建成功")
        except Exception as e:
            print(f"❌ 向量库构建失败: {e}")
            return False

        # 快速测试
        print("🔍 测试向量库...")
        try:
            test_results = db.similarity_search("therapy", k=2)
            print(f"✅ 测试成功，找到 {len(test_results)} 个结果")
        except Exception as e:
            print(f"⚠️ 测试失败: {e}")

        # 5️⃣ 保存到磁盘
        print("\n💾 保存向量库...")
        try:
            # 如果目录存在，先删除
            if os.path.exists(VECTOR_DB_PATH):
                import shutil
                shutil.rmtree(VECTOR_DB_PATH)
                print("🗑️ 删除旧向量库")

            db.save_local(VECTOR_DB_PATH)
            print("✅ 向量库保存成功")
            
            # 验证保存的文件
            saved_files = os.listdir(VECTOR_DB_PATH)
            print(f"📁 保存的文件: {saved_files}")

        except Exception as e:
            print(f"❌ 保存失败: {e}")
            return False

        print("\n" + "="*40)
        print("🎉 知识库构建完成！")
        print(f"📊 统计:")
        print(f"   - 文档数: {doc_count}")
        print(f"   - 文档块: {len(docs_split)}")
        print(f"   - 保存位置: {VECTOR_DB_PATH}")
        print("\n✅ 现在可以进行查询了！")
        return True

    except ImportError as e:
        print(f"❌ 导入失败: {e}")
        print("💡 可能需要安装或升级依赖包")
        return False
    except Exception as e:
        print(f"❌ 构建过程出错: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    if not success:
        print("\n❌ 知识库构建失败")
        print("💡 请检查错误信息并重试")
    else:
        print("\n🎊 构建成功完成！")
        
