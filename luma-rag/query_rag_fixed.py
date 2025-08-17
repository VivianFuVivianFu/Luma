# query_rag.py
# RAG 查询和问答脚本

import os
from dotenv import load_dotenv
from together import Together
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from rag_paths import faiss_path_str

# ✅ 自动加载 .env 中的 key
load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")
together_api_key = os.getenv("TOGETHER_API_KEY")

# ✅ 初始化 Together 客户端
client = Together(api_key=together_api_key)

# 设置路径
VECTOR_DB_PATH = faiss_path_str()

def load_vectorstore():
    """加载已构建的向量数据库"""
    embeddings = OpenAIEmbeddings(openai_api_key=os.getenv("OPENAI_API_KEY"))
    db = FAISS.load_local(faiss_path_str(), embeddings, allow_dangerous_deserialization=True)
    return db

def search_relevant_docs(question: str, k: int = 5):
    """搜索相关文档"""
    try:
        db = load_vectorstore()
        docs = db.similarity_search(question, k=k)
        return [doc.page_content for doc in docs]
    except Exception as e:
        print(f"[⚠️ 文档搜索失败]：{e}")
        return []

def build_prompt_with_context(question: str, docs: list) -> str:
    """构建包含上下文的提示"""
    context = "\n\n".join(docs[:3])  # 使用前3个最相关的文档
    
    prompt = f"""作为Luma，一个温暖、创伤知情的AI伴侣，专门从事CPTSD治疗、内在家庭系统和神经心理学。

基于以下相关文档内容回答问题：

相关背景资料：
{context}

用户问题：{question}

请以Luma的身份，用温暖、支持和专业的语调回答。如果问题涉及专业治疗建议，请提醒用户咨询专业治疗师。"""
    
    return prompt

# ✅ 判断问题是否复杂（需RAG）
def is_complex_question(question: str) -> bool:
    try:
        # 使用 ChatOpenAI 的新API
        llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)
        
        # 创建判断提示
        classification_prompt = f"""判断以下问题是否需要专业知识或文档支持。
        
问题：{question}

如果这是关于心理学、创伤、治疗、医学或需要专业背景知识的问题，回答'complex'。
如果这是简单的日常对话、问候或基本问题，回答'simple'。

只回答'complex'或'simple'，不要其他内容。"""
        
        response = llm.invoke(classification_prompt)
        classification = response.content.strip().lower()
        return "complex" in classification
    except Exception as e:
        print(f"[⚠️ 判断问题类型失败，默认complex]：{e}")
        return True  # 默认使用RAG以获得更好的回答

# ✅ 用 Together 的 LLaMA 模型回答
def ask_llama(prompt: str) -> str:
    try:
        response = client.chat.completions.create(
            model="meta-llama/Llama-3.2-3B-Instruct-Turbo",  # 使用可用的模型
            messages=[
                {"role": "system", "content": "You are Luma, a warm, trauma-informed AI companion specializing in CPTSD healing, internal family systems, and neuropsychology."},
                {"role": "user", "content": prompt}
            ]
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"[❌ LLaMA回答失败]：{e}"

# ✅ 主运行逻辑
def main():
    print("💬 Luma is ready. Type your message (or type 'exit' to quit):\n")
    
    # 检查向量数据库是否存在
    if not os.path.exists(VECTOR_DB_PATH):
        print("⚠️ 向量数据库不存在，请先运行 rag_pipeline.py 构建知识库")
        return
    
    while True:
        user_input = input("👤 You: ")
        if user_input.lower() in ["exit", "quit"]:
            print("👋 Goodbye! Take care.")
            break

        if is_complex_question(user_input):
            print("📚 复杂问题，执行文档检索 RAG...")
            docs = search_relevant_docs(user_input)
            if docs:
                prompt = build_prompt_with_context(user_input, docs)
            else:
                print("📝 未找到相关文档，使用基础对话模式")
                prompt = user_input
        else:
            print("🧸 简单问题，直接使用 LLaMA 对话")
            prompt = user_input

        answer = ask_llama(prompt)
        print(f"\n🧠 Luma: {answer}\n")

if __name__ == "__main__":
    main()
