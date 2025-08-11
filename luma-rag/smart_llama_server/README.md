# Smart LLaMA Chat Server

智能 LLaMA 聊天服务器 - 优先使用 LLaMA 3 70B，复杂查询时自动启用 RAG

## ✨ 功能特点

### 🧠 双模式智能策略
- **主要模式**：LLaMA 3 70B Instruct - 快速、自然的对话
- **辅助模式**：RAG 检索增强 - 针对复杂专业问题

### 🔍 自动检测机制
服务器会智能判断何时使用 RAG：
- 包含专业术语关键词
- 问题较长（>100字符）
- 包含问号的详细询问（>50字符）

### 🚀 API 端点
- `POST /chat` - 主要聊天接口
- `GET /test` - 服务器状态检测
- `GET /debug` - 调试信息
- `POST /reset_memory` - 重置对话记忆

## 🛠️ 技术规格

### 依赖包
```
flask
requests
python-dotenv
```

### 环境变量
```
TOGETHER_API_KEY=your_together_api_key
```

### RAG 触发关键词
```python
RAG_TRIGGER_KEYWORDS = [
    "具体的", "详细的", "专业的", "技术细节", "文档", "资料", 
    "reference", "documentation", "specific", "detailed", "technical",
    "how to implement", "code example", "step by step", "tutorial",
    "什么是", "如何实现", "代码示例", "教程", "步骤"
]
```

## 📊 响应格式

### 直接 LLaMA 模式
```json
{
    "response": "AI回复内容",
    "mode": "Direct_LLaMA",
    "conversation_length": 对话轮数
}
```

### RAG 增强模式
```json
{
    "response": "基于文档的详细回复",
    "mode": "RAG_Enhanced", 
    "relevant_docs_count": 相关文档数量
}
```

## 🔧 使用方法

### 启动服务器
```bash
cd smart_llama_server
python smart_llama_chat.py
```

### 测试接口
```bash
# 检查状态
curl http://localhost:5001/test

# 发送消息
curl -X POST http://localhost:5001/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你好"}'

# 查看调试信息  
curl http://localhost:5001/debug
```

## 🧩 集成说明

- **可选 RAG 模块**：如果 `query_rag.py` 不存在，服务器将只使用 LLaMA 模式
- **对话记忆**：自动维护最近20轮对话历史
- **容错设计**：RAG 失败时自动降级到直接 LLaMA
- **智能路由**：根据问题复杂度自动选择最佳处理方式

## 📈 性能特点

- **快速响应**：简单问题直接使用 LLaMA，无需检索延迟
- **智能增强**：复杂问题自动启用文档检索
- **记忆管理**：对话历史长度控制，避免 token 超限
- **错误恢复**：多层错误处理，确保服务稳定性

## 🎯 适用场景

- **日常聊天**：友好自然的对话体验
- **专业咨询**：基于文档的准确回答
- **技术支持**：代码示例和教程查询
- **学习辅助**：概念解释和详细说明
