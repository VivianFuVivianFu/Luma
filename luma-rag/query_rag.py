import os
from dotenv import load_dotenv
from together import Together
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from rag_paths import faiss_path_str

# --- 配置 ---
# 加载 .env 文件中的环境变量
load_dotenv()

# 初始化 Together AI 客户端
# 它会自动从环境变量中读取 TOGETHER_API_KEY
try:
    client = Together()
except Exception as e:
    print(f"❌ 初始化 Together 客户端失败: {e}")
    print("💡 请确保你的 .env 文件中包含了正确的 TOGETHER_API_KEY。")
    exit()

# 定义向量数据库和嵌入模型的路径
VECTOR_STORE_PATH = faiss_path_str()
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

# --- 核心功能函数 ---

def search_relevant_docs(query_text: str) -> list[str]:
    """
    从本地 FAISS 向量数据库中搜索与查询相关的文档。
    """
    try:
        # 使用 HuggingFace 的模型在本地进行文本嵌入，无需额外API Key
        embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL_NAME)
        
        # 加载本地的 FAISS 索引
        print("🔍 正在加载知识库...")
        db = FAISS.load_local(faiss_path_str(), embeddings, allow_dangerous_deserialization=True)
        
        # 执行相似性搜索，返回最相关的3个文档
        print(f"📚 正在为 “{query_text}” 检索相关信息...")
        retriever = db.as_retriever(search_kwargs={"k": 3})
        relevant_docs = retriever.invoke(query_text)
        
        # 提取文档内容
        return [doc.page_content for doc in relevant_docs]

    except FileNotFoundError:
        print(f"❌ 错误: 在 '{VECTOR_STORE_PATH}' 目录下找不到向量数据库。")
        print("💡 请先运行 `rag_pipeline.py` 或类似的脚本来构建知识库。")
        return []
    except Exception as e:
        print(f"❌ 文档检索时发生错误: {e}")
        return []

def build_prompt_with_context(query_text: str, context_docs: list[str]) -> str:
    """
    将检索到的文档和用户问题拼接成一个完整的提示。
    """
    if not context_docs:
        # 如果没有找到相关文档，只返回用户原始问题
        return query_text

    # 将文档内容格式化
    context = "\n\n---\n\n".join(context_docs)
    
    # 构建最终的提示模板
    prompt = f"""
请根据以下背景知识来回答用户的问题。如果背景知识中没有相关信息，请根据你的理解回答，并保持 Luma 的人格设定。

[背景知识]
{context}

[用户问题]
{query_text}
"""
    return prompt.strip()

def ask_llama(prompt: str) -> str:
    """
    使用 Together.ai 的 LLaMA 3 模型生成回答。
    """
    system_prompt = "You are Luma, a warm, trauma-informed AI companion. You are not a therapist. Your role is to provide gentle, supportive, and reflective responses based on the provided context and your general knowledge. Speak calmly and with empathy."
    
    try:
        response = client.chat.completions.create(
            model="meta-llama/Llama-3-8b-chat",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=512
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"❌ 调用 LLaMA 模型时出错: {e}"

def main():
    """
    主运行循环，处理用户输入和AI回复。
    """
    print("="*50)
    print("💬 Luma (RAG Version) is ready.")
    print("   - Type your message and press Enter.")
    print("   - Type 'exit' or 'quit' to end the session.")
    print("="*50)

    while True:
        user_input = input("👤 You: ")
        if user_input.lower() in ["exit", "quit"]:
            print("✨ Hope this was a supportive moment. Goodbye!")
            break

        # 1. 检索相关文档
        docs = search_relevant_docs(user_input)
        
        # 2. 构建带上下文的提示
        prompt_for_llama = build_prompt_with_context(user_input, docs)
        
        # 3. 获取 LLaMA 的回答
        print("🧠 Luma is thinking...")
        answer = ask_llama(prompt_for_llama)
        
        # 4. 打印回答
        print(f"\n💡 Luma: {answer}\n")

if __name__ == "__main__":
    main()
