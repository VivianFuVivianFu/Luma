# query_rag_hybrid.py
# 混合检索策略 - 中英文关键词同时检索

import os
import time
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
import dotenv
import re

dotenv.load_dotenv()

VECTOR_DB_PATH = "vector_store"

def detect_language(text):
    """检测文本语言"""
    chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text))
    total_chars = len(text.strip())
    return "zh" if total_chars > 0 and chinese_chars / total_chars > 0.3 else "en"

def extract_keywords_bilingual(question):
    """提取中英文关键词"""
    # 心理学专业术语对照表
    psychology_terms = {
        "依恋": "attachment",
        "焦虑": "anxiety anxious",
        "创伤": "trauma PTSD CPTSD",
        "抑郁": "depression depressive",
        "治疗": "therapy treatment",
        "关系": "relationship",
        "情绪": "emotion emotional",
        "心理": "psychology psychological",
        "边界": "boundary boundaries",
        "共依存": "codependency codependent",
        "依赖": "dependency dependent",
        "回避": "avoidant avoidance",
        "安全": "secure security",
        "恐惧": "fear afraid",
        "愤怒": "anger angry",
        "羞耻": "shame",
        "内疚": "guilt",
        "自尊": "self-esteem",
        "自信": "confidence",
        "冥想": "meditation mindfulness",
        "正念": "mindfulness",
        "认知": "cognitive",
        "行为": "behavior behavioral",
        "DBT": "DBT dialectical",
        "CBT": "CBT cognitive behavioral",
        "EMDR": "EMDR",
        "IFS": "IFS internal family",
        "创伤后": "post-traumatic",
        "复杂创伤": "complex trauma CPTSD",
        "解离": "dissociation dissociative",
        "触发": "trigger triggered",
        "闪回": "flashback",
        "噩梦": "nightmare",
        "过度警觉": "hypervigilance",
        "回避症状": "avoidance symptoms",
        "麻木": "numbness numb",
        "分离": "detachment",
        "人际关系": "interpersonal relationship",
        "亲密关系": "intimate relationship",
        "沟通": "communication",
        "冲突": "conflict",
        "边界设定": "boundary setting",
        "情感调节": "emotional regulation",
        "应对": "coping",
        "康复": "recovery healing",
        "治愈": "healing",
        "成长": "growth",
        "韧性": "resilience"
    }
    
    user_language = detect_language(question)
    keywords = []
    
    if user_language == "zh":
        # 中文问题，添加对应的英文关键词
        for zh_term, en_terms in psychology_terms.items():
            if zh_term in question:
                keywords.extend(en_terms.split())
        
        # 如果没有找到专业术语，使用简单翻译
        if not keywords:
            # 提取中文关键词并添加常见英文同义词
            question_lower = question.lower()
            if "什么" in question or "介绍" in question:
                keywords.append("definition concept")
            if "如何" in question or "怎么" in question:
                keywords.append("how to method")
            if "为什么" in question:
                keywords.append("why reason cause")
            if "症状" in question:
                keywords.append("symptoms signs")
            if "原因" in question:
                keywords.append("causes reasons")
            if "影响" in question:
                keywords.append("effects impact")
    
    return " ".join(keywords) if keywords else question

def create_hybrid_retriever(db, question):
    """创建混合检索器"""
    user_language = detect_language(question)
    
    if user_language == "zh":
        # 对中文问题使用混合检索策略
        english_keywords = extract_keywords_bilingual(question)
        
        # 使用英文关键词检索
        if english_keywords and english_keywords != question:
            print(f"🔍 使用关键词检索: {english_keywords}")
            docs1 = db.similarity_search(english_keywords, k=3)
        else:
            docs1 = []
        
        # 同时使用原问题检索
        docs2 = db.similarity_search(question, k=2)
        
        # 合并去重
        all_docs = docs1 + docs2
        unique_docs = []
        seen_content = set()
        
        for doc in all_docs:
            content_hash = hash(doc.page_content[:100])
            if content_hash not in seen_content:
                unique_docs.append(doc)
                seen_content.add(content_hash)
        
        return unique_docs[:5]
    else:
        # 英文问题直接检索
        return db.similarity_search(question, k=5)

def load_vectorstore():
    """加载已构建的向量数据库"""
    embeddings = OpenAIEmbeddings()
    db = FAISS.load_local(VECTOR_DB_PATH, embeddings, allow_dangerous_deserialization=True)
    return db

def ask_question_hybrid(db, question):
    """使用混合检索策略的问答"""
    start_time = time.time()
    
    user_language = detect_language(question)
    print(f"\n🌐 检测语言: {'中文' if user_language == 'zh' else '英文'}")
    
    # 混合检索
    retrieval_start = time.time()
    relevant_docs = create_hybrid_retriever(db, question)
    retrieval_end = time.time()
    print(f"🔍 找到 {len(relevant_docs)} 个相关文档块")
    print(f"⏱️ 检索耗时: {retrieval_end - retrieval_start:.2f}秒")
    
    # 构建上下文
    context = "\n\n".join([doc.page_content for doc in relevant_docs])
    
    # 创建智能提示模板
    llm = ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0.7)
    
    if user_language == "zh":
        prompt = f"""
你是专业的心理健康助手。请基于以下英文文档内容，用中文回答用户的问题。
如果文档信息不足，请诚实说明。请提供准确、专业且易懂的回答。

相关文档内容：
{context}

用户问题：{question}

请用中文回答："""
    else:
        prompt = f"""
You are a professional mental health assistant. Answer the question based on the document content.
If information is insufficient, state that clearly. Provide accurate and professional answers.

Relevant document content:
{context}

Question: {question}

Answer:"""
    
    # 生成答案
    generation_start = time.time()
    response = llm.invoke(prompt)
    answer = response.content.strip()
    generation_end = time.time()
    print(f"⏱️ 生成答案耗时: {generation_end - generation_start:.2f}秒")
    
    print(f"\n🤖 回答：")
    print(answer)
    
    print(f"\n📚 相关文档来源：")
    for i, doc in enumerate(relevant_docs, 1):
        source = doc.metadata.get("source", "未知来源")
        print(f"  {i}. {os.path.basename(source)}")
    
    end_time = time.time()
    total_time = end_time - start_time
    print(f"\n⏱️ 总耗时: {total_time:.2f}秒")
    
    return answer, relevant_docs

def main():
    """主函数"""
    print("🔍 正在加载混合检索 RAG 系统...")
    
    try:
        db = load_vectorstore()
        print("✅ 向量数据库加载成功！")
        print("🚀 特性：混合检索、无翻译延迟、智能关键词映射")
        
        print("\n" + "="*60)
        print("🧠 心理健康混合检索 RAG 问答系统")
        print("💬 支持中文和英文提问（超低延迟）")
        print("输入 'quit' 或 'exit' 或 '退出' 结束")
        print("="*60)
        
        while True:
            question = input("\n❓ 请输入您的问题: ").strip()
            
            if question.lower() in ['quit', 'exit', '退出', 'q']:
                print("👋 再见！")
                break
                
            if not question:
                print("请输入有效的问题。")
                continue
            
            try:
                ask_question_hybrid(db, question)
            except Exception as e:
                print(f"❌ 处理问题时出错: {e}")
                import traceback
                traceback.print_exc()
                
    except Exception as e:
        print(f"❌ 系统初始化失败: {e}")

if __name__ == "__main__":
    main()
