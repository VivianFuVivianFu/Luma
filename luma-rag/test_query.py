from query_rag_fixed import load_vectorstore, create_qa_chain, ask_question
import time

print('🔍 正在加载知识库...')
try:
    db = load_vectorstore()
    qa_chain = create_qa_chain(db)
    print('✅ 初始化完成')

    question = '为什么cptsd的人容易得焦虑型依恋？'
    print(f'\n❓ 问题: {question}')

    ask_question(qa_chain, question)

except Exception as e:
    print(f'❌ 错误: {e}')
    import traceback
    traceback.print_exc()

