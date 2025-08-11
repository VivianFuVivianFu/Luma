# 心理健康 RAG 问答系统

这是一个基于 RAG（检索增强生成）技术的心理健康知识问答系统。

## 📁 项目结构

```
luma-rag/
├── docs_raw/          # 原始文档（PDF、EPUB）
├── docs/              # 转换后的文本文件
├── vector_store/      # FAISS 向量数据库
├── convert_to_txt.py  # 文档格式转换脚本
├── rag_pipeline.py    # 向量数据库构建脚本
├── query_rag.py       # 交互式问答脚本
├── batch_query.py     # 批量问答测试脚本
├── requirements.txt   # Python 依赖包
└── .env              # 环境变量（OpenAI API Key）
```

## 🚀 使用步骤

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 设置 API Key
在 `.env` 文件中添加：
```
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. 运行流程

#### 步骤 1：转换文档（已完成）
```bash
python convert_to_txt.py
```

#### 步骤 2：构建向量数据库（已完成）
```bash
python rag_pipeline.py
```

#### 步骤 3：开始问答
```bash
# 交互式问答
python query_rag.py

# 或批量测试
python batch_query.py
```

## 📚 知识库内容

系统包含以下心理健康相关书籍和资料：

1. **依恋理论**
   - 《Attached》- Amir Levine
   - 焦虑型依恋恢复指南

2. **创伤治疗**
   - 《身体从未忘记》(The Body Keeps the Score)
   - CPTSD 相关资料
   - EMDR 疗法步骤

3. **关系治疗**
   - 共依存关系资料
   - 关系问题工作表
   - 《像女士一样行动，像男人一样思考》

4. **治疗方法**
   - DBT (辩证行为疗法)
   - IFS (内在家庭系统)
   - MBT (心智化为基础的治疗)
   - 影子工作日记

## 💡 功能特点

- **智能检索**：基于语义相似度检索相关文档
- **准确回答**：使用 GPT-4 生成专业、准确的回答
- **来源追踪**：显示回答的文档来源
- **中文支持**：完全支持中文问答
- **交互式界面**：友好的命令行交互界面

## 🔧 技术栈

- **LangChain**：RAG 框架
- **FAISS**：向量数据库
- **OpenAI GPT-4**：语言模型
- **OpenAI Embeddings**：文本嵌入
- **Python**：主要编程语言

## 📝 示例问题

- "什么是焦虑型依恋？如何改善？"
- "CPTSD 和 PTSD 有什么区别？"
- "如何建立健康的关系边界？"
- "什么是 EMDR 疗法？适用于哪些情况？"
- "共依存关系的特征是什么？"

## ⚠️ 注意事项

1. 本系统仅供教育和信息参考，不能替代专业心理治疗
2. 如有严重心理健康问题，请寻求专业帮助
3. 确保 OpenAI API Key 的安全性

## 🔄 项目状态

✅ **已完成**：
- 文档格式转换
- 向量数据库构建
- 基础问答功能

🚀 **下一步**：开始使用问答系统！
