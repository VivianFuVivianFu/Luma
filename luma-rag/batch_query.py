# batch_query.py
# 批量问答测试脚本

from query_rag import load_vectorstore, create_qa_chain, ask_question

def test_questions():
    """测试一些常见问题"""
    
    # 测试问题列表
    test_questions = [
        "什么是依恋理论？",
        "如何处理焦虑型依恋？",
        "CPTSD 和 PTSD 有什么区别？",
        "什么是 EMDR 疗法？",
        "如何建立健康的关系边界？",
        "什么是 DBT 疗法？",
        "如何进行影子工作？",
        "共依存关系的特征是什么？"
    ]
    
    print("🔍 正在加载 RAG 知识库...")
    
    try:
        # 加载向量数据库和问答链
        db = load_vectorstore()
        qa_chain = create_qa_chain(db)
        print("✅ 系统初始化完成！")
        
        print("\n" + "="*60)
        print("🧪 开始批量问答测试")
        print("="*60)
        
        for i, question in enumerate(test_questions, 1):
            print(f"\n{'='*60}")
            print(f"📝 测试问题 {i}/{len(test_questions)}：{question}")
            print("="*60)
            
            try:
                ask_question(qa_chain, question)
            except Exception as e:
                print(f"❌ 处理问题时出错：{e}")
            
            # 分隔线
            print("\n" + "-"*60)
        
        print("\n🎉 批量测试完成！")
        
    except Exception as e:
        print(f"❌ 系统初始化失败：{e}")

if __name__ == "__main__":
    test_questions()
