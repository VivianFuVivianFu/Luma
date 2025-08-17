# 🛡️ Luma 3 API Guard & Degradation System

智能API调用保护、降级和恢复系统，确保心理健康AI服务的高可用性和用户体验。

## 🎯 系统特性

### 🚦 **智能速率限制**
- **自适应限流**：不同模型的差异化速率限制
- **滑动窗口**：基于时间窗口的平滑流量控制
- **内存追踪**：实时监控API调用频率

### ⚡ **熔断器保护**
- **故障检测**：自动检测连续失败并熔断
- **半开状态**：智能恢复尝试机制
- **快速失败**：避免级联故障和资源浪费

### 🔄 **指数退避重试**
- **智能重试**：根据错误类型决定重试策略
- **抖动算法**：避免惊群效应
- **最大重试限制**：防止无限重试

### 🎭 **优雅降级策略**
- **多层降级**：70B→32B→7B→关键词检测
- **温暖回复**：即使技术失败也保持共情
- **上下文保持**：降级过程中保持对话连贯性

### 📊 **实时监控记录**
- **事件追踪**：完整的API调用生命周期记录
- **性能指标**：响应时间、成功率、错误分析
- **可靠性评分**：基于历史数据的健康评估

## 🏗️ 系统架构

```
┌─────────────────────┐
│   用户请求           │
│                     │
├─────────────────────┤
│   Guard Layer       │  ← 保护层
│   - 速率限制         │
│   - 熔断器           │
│   - 超时控制         │
├─────────────────────┤
│   Model APIs        │  ← AI模型层
│   - Together 70B/32B│
│   - HuggingFace 7B  │
│   - BERT Triage     │
├─────────────────────┤
│   Degradation       │  ← 降级层
│   - 模型降级         │
│   - 关键词检测       │
│   - 温暖回复         │
├─────────────────────┤
│   Monitoring        │  ← 监控层
│   - 事件记录         │
│   - 性能统计         │
│   - 健康评估         │
└─────────────────────┘
```

## 📋 配置说明

### 速率限制配置
```javascript
rateLimits: {
  'triage': { maxCalls: 60, windowMs: 60000 },     // 60次/分钟
  'reason32B': { maxCalls: 30, windowMs: 60000 },  // 30次/分钟
  'reason70B': { maxCalls: 15, windowMs: 60000 },  // 15次/分钟  
  'empathy': { maxCalls: 100, windowMs: 60000 }    // 100次/分钟
}
```

### 熔断器配置
```javascript
circuitBreaker: {
  failureThreshold: 5,      // 5次失败后熔断
  recoveryTimeMs: 30000,    // 30秒后尝试恢复
  halfOpenMaxCalls: 3       // 半开状态最大尝试次数
}
```

### 重试策略配置
```javascript
retry: {
  maxAttempts: 3,           // 最多重试3次
  baseDelayMs: 1000,        // 基础延迟1秒
  maxDelayMs: 5000,         // 最大延迟5秒
  backoffMultiplier: 2      // 指数退避倍数
}
```

## 🚀 集成示例

### Together AI 推理模块集成
```javascript
// llm.reason.together.js
const { guardedModelCall } = require('./guard.fetch')

async function togetherChat(model, messages, temperature = 0.3) {
  const route = model.includes('70') ? 'reason70B' : 'reason32B'
  
  const response = await guardedModelCall({
    route,
    model,
    timeoutMs: model.includes('70') ? 45000 : 30000,
    request: {
      url: `${cfg.TOGETHER_BASE}/chat/completions`,
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${cfg.TOGETHER_KEY}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ model, messages, temperature })
    },
    onDegrade: async (failureType, error) => {
      // 降级策略：70B → 32B → 空回复
      if (model.includes('70')) {
        return await togetherChat(cfg.REASON_32B_MODEL, messages, temperature)
      }
      return { ok: true, json: { choices: [{ message: { content: '' } }] } }
    }
  })
  
  return response.json?.choices?.[0]?.message?.content?.trim() || ''
}
```

### HuggingFace Empathy 模块集成
```javascript
// llm.empathy.js  
const fallbackResponses = [
  "I hear you, and I want you to know that your feelings are completely valid...",
  "Thank you for sharing with me. I'm experiencing some technical difficulties..."
]

async function empathyReply({ system, user }) {
  const response = await guardedModelCall({
    route: 'empathy',
    model: 'MentaLLaMA-7B', 
    request: { /* HuggingFace API call */ },
    onDegrade: async (failureType, error) => {
      // 返回温暖的人工降级回复
      const fallback = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
      return { ok: true, json: [{ generated_text: fallback }] }
    }
  })
  
  return response.json?.[0]?.generated_text || fallbackResponses[0]
}
```

### Triage 分类模块集成
```javascript
// llm.triage.js
function simpleEmotionDetection(text) {
  // 基于关键词的简单情绪检测作为降级策略
  const crisisKeywords = ['自杀', 'suicide', '想死', '不想活']
  if (crisisKeywords.some(k => text.toLowerCase().includes(k))) {
    return { label: 'crisis', score: 0.9, type: 'keyword_detection' }
  }
  return { label: 'neutral', score: 0.5, type: 'keyword_detection' }
}

async function triage(text) {
  const response = await guardedModelCall({
    route: 'triage',
    request: { /* HuggingFace API call */ },
    onDegrade: async () => {
      return { ok: true, json: [simpleEmotionDetection(text)] }
    }
  })
  
  return response.json[0]
}
```

## 📊 API 端点

### 系统状态监控
```
GET  /api/guard/status        # 获取保护系统状态
GET  /api/guard/config        # 获取配置信息
GET  /api/guard/health        # 获取健康概览
```

### 可靠性分析
```
GET  /api/guard/reliability   # 获取可靠性统计
GET  /api/guard/incidents     # 获取最近事件
POST /api/guard/incidents/cleanup # 清理旧事件
```

### 紧急操作
```
POST /api/guard/routes/:route/reset # 重置路由统计
POST /api/guard/simulate            # 模拟API调用
```

## 🗄️ 数据库架构

### `api_incidents` 表
```sql
CREATE TABLE api_incidents (
  id              BIGSERIAL PRIMARY KEY,
  route           TEXT NOT NULL,     -- 'triage', 'reason32B', 'reason70B', 'empathy'
  model           TEXT NOT NULL,     -- 模型名称
  incident_type   TEXT NOT NULL,     -- 'failure', 'timeout', 'rate_limit', 'degradation'
  details         TEXT,              -- JSON详情
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 统计函数
```sql
-- 获取可靠性统计
SELECT * FROM get_api_reliability_stats('empathy', 24);

-- 获取最近事件
SELECT * FROM get_recent_api_incidents(50, 'reason70B');

-- 清理旧数据
SELECT cleanup_old_api_incidents(30);
```

## 🔧 降级策略详解

### 1. **推理模型降级链**
```
用户请求 → Triage分类 → 复杂度判断
    ↓
危机情况: Together 70B → 32B → 空回复(empathy-only)
复杂情况: Together 32B → 70B → 空回复(empathy-only)  
简单情况: 直接 Empathy
```

### 2. **共情模型降级策略**
```
HuggingFace MentaLLaMA-7B
    ↓ (失败)
温暖的预设回复库 (总是成功)
```

### 3. **分类模型降级策略**
```
HuggingFace BERT Sentiment
    ↓ (失败)
基于关键词的简单情绪检测
```

## 📈 监控指标

### 实时健康指标
- **可用性评分**：基于成功率和错误类型的综合评分
- **响应时间分布**：P50, P95, P99响应时间统计
- **错误率趋势**：按时间和错误类型分组的失败率
- **熔断器状态**：各路由的熔断器开关状态

### 可靠性评分算法
```javascript
// 基于事件类型和频率的可靠性评分
reliability_score = 100 - (
  failures * 10 +           // 失败权重最高
  timeouts * 5 +            // 超时中等权重  
  rate_limits * 2 +         // 限流较低权重
  degradations * 3 +        // 降级中等权重
  circuit_breaker_events * 15 // 熔断权重很高
) / hours * 24
```

## 🧪 测试和验证

### 1. 运行完整测试套件
```bash
node test-guard-system.js
```

### 2. 测试API端点
```bash
# 检查系统健康状态
curl http://localhost:8787/api/guard/health

# 查看可靠性统计
curl http://localhost:8787/api/guard/reliability

# 模拟API调用
curl -X POST http://localhost:8787/api/guard/simulate \
  -H "Content-Type: application/json" \
  -d '{"route": "empathy", "shouldFail": false}'
```

### 3. 验证降级行为
```bash
# 测试记忆选择器
node test-memory-selector.js

# 测试监控系统
node test-monitoring-system.js
```

## 🔥 生产环境配置

### 1. 环境变量设置
```bash
# API密钥配置
TOGETHER_KEY=your_together_api_key
HF_API_TOKEN=your_huggingface_token

# Supabase配置
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 可选：自定义超时和限制
REASON_MAX_TOKENS=512
EMPATHY_MAX_TOKENS=256
```

### 2. 数据库初始化
```sql
-- 运行API事件表创建脚本
\i api_incidents_table.sql

-- 验证函数可用性
SELECT * FROM get_api_reliability_stats();
```

### 3. 监控仪表板设置
```javascript
// 集成到现有监控系统
const healthData = await fetch('/api/guard/health').then(r => r.json())
const reliabilityData = await fetch('/api/guard/reliability').then(r => r.json())

// 显示关键指标
console.log(`系统健康评分: ${healthData.overview.healthScore}%`)
console.log(`可用路由: ${healthData.overview.availableRoutes}/${healthData.overview.totalRoutes}`)
```

## ⚡ 紧急响应

### 当系统出现问题时：

1. **检查健康状态**
   ```bash
   curl http://localhost:8787/api/guard/health
   ```

2. **重置问题路由**
   ```bash
   curl -X POST http://localhost:8787/api/guard/routes/reason70B/reset
   ```

3. **查看最近事件**
   ```bash
   curl http://localhost:8787/api/guard/incidents?limit=20
   ```

4. **检查数据库连接**
   ```sql
   SELECT * FROM get_recent_api_incidents(10);
   ```

## 🎯 最佳实践

### 1. **监控建议**
- 设置健康评分低于90%的告警
- 监控熔断器开启事件
- 跟踪降级调用频率

### 2. **配置调优**
- 根据实际API限制调整速率限制
- 基于模型响应时间设置超时
- 根据业务需求调整重试次数

### 3. **降级策略优化**
- 定期更新降级回复模板
- 改进关键词检测词典
- 测试降级路径的用户体验

---

## 🎉 总结

Luma 3 API Guard系统提供了企业级的API保护和降级能力，确保即使在外部服务不稳定的情况下，用户仍能获得温暖、有用的心理健康支持。

通过智能降级、熔断保护和实时监控，系统在保证服务可用性的同时，维护了AI心理健康助手的专业性和共情能力。