# test_multilingual.py
# 测试中英文问答功能

from query_rag_multilingual import load_vectorstore, create_qa_chain, ask_question_multilingual

def test_multilingual_questions():
    """测试中英文问题"""
    
    # 测试问题列表（中英文混合）
    test_questions = [
        # 英文问题
        "What is attachment theory?",
        "How to deal with anxious attachment?",
        "What are the symptoms of CPTSD?",
        
        # 中文问题
        "什么是依恋理论？",
        "如何处理焦虑型依恋？",
        "CPTSD有哪些症状？",
        "什么是EMDR疗法？",
        "如何建立健康的关系边界？"
    ]
    
    print("🔍 正在加载多语言 RAG 知识库...")
    
    try:
        # 加载向量数据库和问答链
        db = load_vectorstore()
        qa_chain = create_qa_chain(db)
        print("✅ 系统初始化完成！")
        
        print("\n" + "="*70)
        print("🧪 开始中英文问答测试")
        print("="*70)
        
        for i, question in enumerate(test_questions, 1):
            print(f"\n{'='*70}")
            print(f"📝 测试问题 {i}/{len(test_questions)}：{question}")
            print("="*70)
            
            try:
                result = ask_question_multilingual(qa_chain, question)
                print(f"\n✅ 问题 {i} 完成")
            except Exception as e:
                print(f"❌ 处理问题 {i} 时出错：{e}")
            
            # 分隔线
            print("\n" + "-"*70)
            
            # 暂停一下，避免API调用太频繁
            if i < len(test_questions):
                input("按 Enter 继续下一个问题...")
        
        print("\n🎉 多语言测试完成！")
        
    except Exception as e:
        print(f"❌ 系统初始化失败：{e}")

if __name__ == "__main__":
    test_multilingual_questions()
