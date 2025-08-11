# query_rag_optimized.py
# 优化延迟的多语言 RAG 系统

import os
import asyncio
import time
import json
from concurrent.futures import ThreadPoolExecutor
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
import dotenv
import re
import hashlib

# 加载环境变量
dotenv.load_dotenv()

# 设置路径
VECTOR_DB_PATH = "vector_store"
CACHE_FILE = "translation_cache.json"

class TranslationCache:
    """翻译缓存系统"""
    def __init__(self):
        self.cache = self.load_cache()
    
    def load_cache(self):
        """加载缓存"""
        try:
            if os.path.exists(CACHE_FILE):
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except:
            pass
        return {}
    
    def save_cache(self):
        """保存缓存"""
        try:
            with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.cache, f, ensure_ascii=False, indent=2)
        except:
            pass
    
    def get_cache_key(self, text):
        """生成缓存键"""
        return hashlib.md5(text.encode()).hexdigest()
    
    def get_translation(self, text, direction):
        """获取缓存的翻译"""
        key = f"{direction}_{self.get_cache_key(text)}"
        return self.cache.get(key)
    
    def set_translation(self, text, translation, direction):
        """设置缓存"""
        key = f"{direction}_{self.get_cache_key(text)}"
        self.cache[key] = translation
        self.save_cache()

# 全局缓存实例
translation_cache = TranslationCache()

def detect_language(text):
    """检测文本语言"""
    chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text))
    total_chars = len(text.strip())
    
    if total_chars == 0:
        return "en"
    
    chinese_ratio = chinese_chars / total_chars
    return "zh" if chinese_ratio > 0.3 else "en"

def translate_text_fast(text, to_language="en"):
    """快速翻译（带缓存）"""
    direction = f"zh_to_{to_language}" if to_language == "en" else f"en_to_{to_language}"
    
    # 检查缓存
    cached = translation_cache.get_translation(text, direction)
    if cached:
        print(f"🚀 使用缓存翻译")
        return cached
    
    # 没有缓存，进行翻译
    print(f"🔄 正在翻译...")
    llm = ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0)
    
    if to_language == "en":
        prompt = f"""Translate to English (preserve psychological terms): {text}"""
    else:
        prompt = f"""Translate to Chinese (preserve psychological terms): {text}"""
    
    start_time = time.time()
    response = llm.invoke(prompt)
    translation = response.content.strip()
    end_time = time.time()
    
    print(f"⏱️ 翻译耗时: {end_time - start_time:.2f}秒")
    
    # 保存到缓存
    translation_cache.set_translation(text, translation, direction)
    
    return translation

def load_vectorstore():
    """加载已构建的向量数据库"""
    embeddings = OpenAIEmbeddings()
    db = FAISS.load_local(VECTOR_DB_PATH, embeddings, allow_dangerous_deserialization=True)
    return db

def create_qa_chain(db):
    """创建问答链"""
    retriever = db.as_retriever(search_kwargs={"k": 5})
    
    # 使用更快的模型进行问答
    llm = ChatOpenAI(
        model_name="gpt-3.5-turbo",  # 更快的模型
        temperature=0.7
    )
    
    prompt_template = """
    You are a professional mental health assistant. Answer based on the document content.
    Be concise but informative. If information is insufficient, state that clearly.
    
    Document content:
    {context}
    
    Question: {question}
    
    Answer:"""
    
    PROMPT = PromptTemplate(
        template=prompt_template,
        input_variables=["context", "question"]
    )
    
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        chain_type_kwargs={"prompt": PROMPT},
        return_source_documents=True
    )
    
    return qa_chain

def ask_question_optimized(qa_chain, question):
    """优化的问答函数"""
    start_time = time.time()
    
    user_language = detect_language(question)
    print(f"\n🌐 检测语言: {'中文' if user_language == 'zh' else '英文'}")
    
    # 阶段1: 翻译问题（如果需要）
    if user_language == "zh":
        translation_start = time.time()
        english_question = translate_text_fast(question, "en")
        translation_end = time.time()
        print(f"📝 英文问题: {english_question}")
        print(f"⏱️ 问题翻译耗时: {translation_end - translation_start:.2f}秒")
        query_question = english_question
    else:
        query_question = question
    
    # 阶段2: 检索和生成答案
    retrieval_start = time.time()
    result = qa_chain({"query": query_question})
    english_answer = result["result"]
    retrieval_end = time.time()
    print(f"⏱️ 检索+生成耗时: {retrieval_end - retrieval_start:.2f}秒")
    
    # 阶段3: 翻译答案（如果需要）
    if user_language == "zh":
        answer_translation_start = time.time()
        chinese_answer = translate_text_fast(english_answer, "zh")
        answer_translation_end = time.time()
        print(f"⏱️ 答案翻译耗时: {answer_translation_end - answer_translation_start:.2f}秒")
        
        print(f"\n🤖 中文回答：")
        print(chinese_answer)
        
        # 只在需要时显示英文原答案
        show_original = input("\n🔍 是否显示英文原答案? (y/n): ").lower() == 'y'
        if show_original:
            print(f"\n📄 英文原答案：")
            print(english_answer)
    else:
        print(f"\n🤖 Answer:")
        print(english_answer)
    
    # 显示来源
    print(f"\n📚 相关文档来源：")
    for i, doc in enumerate(result["source_documents"], 1):
        source = doc.metadata.get("source", "未知来源")
        print(f"  {i}. {os.path.basename(source)}")
    
    end_time = time.time()
    total_time = end_time - start_time
    print(f"\n⏱️ 总耗时: {total_time:.2f}秒")
    
    return result

def main():
    """主函数"""
    print("🔍 正在加载优化版 RAG 知识库...")
    
    try:
        db = load_vectorstore()
        print("✅ 向量数据库加载成功！")
        
        qa_chain = create_qa_chain(db)
        print("✅ 优化版问答系统初始化完成！")
        print("🚀 特性：缓存翻译、快速模型、性能监控")
        
        print("\n" + "="*60)
        print("🧠 心理健康优化版 RAG 问答系统")
        print("💬 支持中文和英文提问（已优化延迟）")
        print("输入 'quit' 或 'exit' 或 '退出' 结束")
        print("输入 'cache' 查看缓存统计")
        print("="*60)
        
        while True:
            question = input("\n❓ 请输入您的问题: ").strip()
            
            if question.lower() in ['quit', 'exit', '退出', 'q']:
                print("👋 再见！")
                break
            
            if question.lower() == 'cache':
                print(f"📊 缓存条目数: {len(translation_cache.cache)}")
                continue
                
            if not question:
                print("请输入有效的问题。")
                continue
            
            try:
                ask_question_optimized(qa_chain, question)
            except Exception as e:
                print(f"❌ 处理问题时出错: {e}")
                
    except Exception as e:
        print(f"❌ 系统初始化失败: {e}")

if __name__ == "__main__":
    main()
