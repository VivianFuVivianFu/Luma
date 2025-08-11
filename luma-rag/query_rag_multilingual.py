# query_rag_multilingual.py
# 支持中英文的 RAG 查询和问答脚本

import os
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain.schema import BaseOutputParser
import dotenv
import re

# 加载环境变量
dotenv.load_dotenv()

# 设置路径
VECTOR_DB_PATH = "vector_store"

def detect_language(text):
    """检测文本语言（简单检测中英文）"""
    chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text))
    total_chars = len(text.strip())
    
    if total_chars == 0:
        return "en"
    
    # 如果中文字符占比超过30%，认为是中文
    chinese_ratio = chinese_chars / total_chars
    return "zh" if chinese_ratio > 0.3 else "en"

def translate_to_english(chinese_text):
    """将中文翻译成英文（用于查询）"""
    llm = ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0)
    
    prompt = f"""
    Please translate the following Chinese text to English. 
    Focus on preserving the meaning, especially psychological and mental health terms.
    Only return the English translation, nothing else.
    
    Chinese text: {chinese_text}
    
    English translation:"""
    
    response = llm.invoke(prompt)
    return response.content.strip()

def translate_to_chinese(english_text):
    """将英文回答翻译成中文"""
    llm = ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0)
    
    prompt = f"""
    Please translate the following English text to Chinese. 
    This is a professional response about mental health and psychology.
    Keep technical terms accurate and maintain a professional, empathetic tone.
    Only return the Chinese translation, nothing else.
    
    English text: {english_text}
    
    Chinese translation:"""
    
    response = llm.invoke(prompt)
    return response.content.strip()

def load_vectorstore():
    """加载已构建的向量数据库"""
    embeddings = OpenAIEmbeddings()
    db = FAISS.load_local(VECTOR_DB_PATH, embeddings, allow_dangerous_deserialization=True)
    return db

def create_qa_chain(db):
    """创建问答链"""
    # 设置检索器
    retriever = db.as_retriever(search_kwargs={"k": 5})  # 返回最相关的5个文档块
    
    # 创建 LLM
    llm = ChatOpenAI(
        model_name="gpt-4",  # 或者使用 "gpt-3.5-turbo" 节省成本
        temperature=0.7
    )
    
    # 英文提示模板（因为知识库是英文的）
    prompt_template = """
    You are a professional assistant specializing in mental health and relationship therapy. 
    Please answer the user's question based on the following relevant document content.
    If there is not enough information in the documents to answer the question, please be honest and state that clearly. 
    Do not make up answers.
    
    Provide a detailed, accurate, and helpful answer in English.
    
    Relevant document content:
    {context}
    
    User question: {question}
    
    Answer:"""
    
    PROMPT = PromptTemplate(
        template=prompt_template,
        input_variables=["context", "question"]
    )
    
    # 创建问答链
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        chain_type_kwargs={"prompt": PROMPT},
        return_source_documents=True
    )
    
    return qa_chain

def ask_question_multilingual(qa_chain, question):
    """支持中英文的问答函数"""
    original_question = question
    user_language = detect_language(question)
    
    print(f"\n🌐 检测到语言: {'中文' if user_language == 'zh' else '英文'}")
    
    # 如果是中文问题，先翻译成英文
    if user_language == "zh":
        print("🔄 正在将问题翻译成英文...")
        english_question = translate_to_english(question)
        print(f"📝 英文问题: {english_question}")
        query_question = english_question
    else:
        query_question = question
    
    # 使用英文问题查询
    print("🔍 正在搜索相关文档...")
    result = qa_chain({"query": query_question})
    english_answer = result["result"]
    
    # 如果用户问的是中文，将答案翻译成中文
    if user_language == "zh":
        print("🔄 正在将答案翻译成中文...")
        final_answer = translate_to_chinese(english_answer)
        print(f"\n🤖 中文回答：")
        print(final_answer)
        
        print(f"\n📄 英文原答案：")
        print(english_answer)
    else:
        final_answer = english_answer
        print(f"\n🤖 Answer:")
        print(final_answer)
    
    print(f"\n📚 相关文档来源：")
    for i, doc in enumerate(result["source_documents"], 1):
        source = doc.metadata.get("source", "未知来源")
        print(f"  {i}. {os.path.basename(source)}")
    
    return {
        "original_question": original_question,
        "english_question": query_question if user_language == "zh" else None,
        "english_answer": english_answer,
        "final_answer": final_answer,
        "source_documents": result["source_documents"],
        "user_language": user_language
    }

def main():
    """主函数 - 支持中英文的交互式问答"""
    print("🔍 正在加载多语言 RAG 知识库...")
    
    try:
        # 加载向量数据库
        db = load_vectorstore()
        print("✅ 向量数据库加载成功！")
        
        # 创建问答链
        qa_chain = create_qa_chain(db)
        print("✅ 多语言问答系统初始化完成！")
        
        print("\n" + "="*60)
        print("🧠 心理健康多语言 RAG 问答系统")
        print("💬 支持中文和英文提问")
        print("输入 'quit' 或 'exit' 或 '退出' 结束")
        print("="*60)
        
        while True:
            question = input("\n❓ 请输入您的问题 (Enter your question): ").strip()
            
            if question.lower() in ['quit', 'exit', '退出', 'q']:
                print("👋 再见！Goodbye!")
                break
            
            if not question:
                print("请输入有效的问题。Please enter a valid question.")
                continue
            
            try:
                ask_question_multilingual(qa_chain, question)
            except Exception as e:
                print(f"❌ 处理问题时出错 Error: {e}")
                import traceback
                traceback.print_exc()
                
    except Exception as e:
        print(f"❌ 系统初始化失败 System initialization failed: {e}")
        print("请确保 Please ensure:")
        print("1. .env 文件包含有效的 OPENAI_API_KEY")
        print("2. 向量数据库已经构建完成（运行 rag_pipeline.py）")

if __name__ == "__main__":
    main()
