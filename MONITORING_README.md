# 📊 Luma 3 Monitoring System

完整的 Supabase 数据库监控和系统健康管理解决方案。

## 🎯 功能特性

### 🗄️ 容量监控
- **实时存储追踪**：按表分解的数据库使用量
- **增长趋势分析**：历史容量数据和预测
- **智能告警**：超过阈值自动发送警报
- **配额管理**：可配置的存储限制和警告百分比

### ⚡ 性能监控
- **API 响应时间**：端点级别的性能追踪
- **成功率统计**：请求成功率和错误统计
- **模型使用分析**：AI 模型调用频率和性能
- **时间序列数据**：小时/日级别的性能趋势

### 🚨 智能告警系统
- **自动告警创建**：基于阈值的告警触发
- **告警分级**：info/warning/critical 级别管理
- **告警历史**：完整的告警生命周期追踪
- **解决状态管理**：告警确认和解决跟踪

### 📈 系统健康仪表板
- **综合健康评分**：整体系统状态概览
- **关键指标聚合**：容量、性能、告警统一视图
- **实时状态更新**：定时刷新的系统状态

## 🏗️ 系统架构

```
┌─────────────────────┐
│   Frontend/API      │
│                     │
├─────────────────────┤
│   Monitoring API    │  ← 监控 API 端点
│   /api/monitoring/* │
├─────────────────────┤
│   Supabase DB       │
│   - capacity_reports│  ← 容量数据
│   - performance_logs│  ← 性能数据  
│   - monitoring_alerts│  ← 告警数据
│   - luma_settings   │  ← 配置数据
├─────────────────────┤
│   Cron Scheduler    │  ← 定时任务
│   - 15分钟: 容量收集 │
│   - 30分钟: 告警检查 │
│   - 1小时: 健康检查   │
└─────────────────────┘
```

## 📋 数据表结构

### `luma_settings` - 监控配置
```sql
- capacity_quota_gb: 数据库容量配额 (默认: 8GB)
- capacity_warn_pct: 警告阈值百分比 (默认: 80%)
- monitoring_enabled: 是否启用监控
- alert_email: 管理员邮箱
```

### `capacity_reports` - 容量报告
```sql
- total_db_bytes: 总数据库大小
- messages_bytes: 消息表大小
- summaries_bytes: 摘要表大小
- longmem_bytes: 长期记忆表大小
- evaluation_bytes: 评估数据大小
- messages_rows, longmem_rows: 行数统计
```

### `system_performance_logs` - 性能日志
```sql
- api_endpoint: API 端点
- response_time_ms: 响应时间
- success_rate: 成功率
- error_count: 错误数量
- model_used: 使用的 AI 模型
- route_type: 路由类型
```

### `monitoring_alerts` - 告警记录
```sql
- alert_type: 告警类型 (capacity_warning, performance_degradation)
- severity: 严重级别 (info, warning, critical)
- title, message: 告警标题和详情
- metadata: 额外的 JSON 元数据
- resolved_at: 解决时间
```

## 🚀 安装步骤

### 1. 安装数据库架构
在 Supabase SQL 编辑器中运行：
```bash
supabase_monitoring_system.sql
```

### 2. 配置环境变量
```bash
SUPABASE_URL=你的_supabase_url
SUPABASE_SERVICE_ROLE_KEY=你的_service_role_key
```

### 3. 启动监控系统
```bash
# 运行设置脚本
setup-monitoring.bat

# 或手动测试
node test-monitoring-system.js
```

### 4. 验证安装
```sql
-- 在 Supabase 中运行
SELECT luma_collect_capacity();
SELECT * FROM luma_capacity_status();
SELECT system_health_summary();
```

## 🔌 API 端点

### 容量监控
```
POST /api/monitoring/capacity/collect     # 收集容量指标
GET  /api/monitoring/capacity/status      # 获取容量状态
GET  /api/monitoring/capacity/trends      # 获取容量趋势
POST /api/monitoring/capacity/check-alerts # 检查容量告警
```

### 性能监控
```
POST /api/monitoring/performance/log      # 记录性能指标
GET  /api/monitoring/performance/trends   # 获取性能趋势
```

### 系统健康
```
GET  /api/monitoring/health               # 获取系统健康状态
```

### 告警管理
```
GET  /api/monitoring/alerts               # 获取告警列表
PUT  /api/monitoring/alerts/:id/resolve   # 解决告警
```

### 设置管理
```
GET  /api/monitoring/settings             # 获取监控设置
PUT  /api/monitoring/settings             # 更新监控设置
```

## 📊 仪表板查询示例

### 系统概览
```sql
SELECT 
    h.overall_health,
    h.capacity->>'used_pct' as capacity_pct,
    h.alerts_24h
FROM (SELECT system_health_summary() as h) as health_data;
```

### 容量趋势 (7天)
```sql
SELECT 
    DATE(collected_at) as date,
    ROUND(MAX(total_db_bytes) / 1024.0 / 1024.0 / 1024.0, 3) as max_gb
FROM capacity_reports 
WHERE collected_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(collected_at)
ORDER BY date;
```

### 性能分析 (24小时)
```sql
SELECT 
    api_endpoint,
    ROUND(AVG(response_time_ms)) as avg_response_time,
    COUNT(*) as total_requests
FROM system_performance_logs
WHERE logged_at > NOW() - INTERVAL '24 hours'
GROUP BY api_endpoint
ORDER BY total_requests DESC;
```

### 活跃告警
```sql
SELECT alert_type, severity, title, created_at
FROM monitoring_alerts
WHERE resolved_at IS NULL
ORDER BY severity, created_at DESC;
```

## ⏰ 自动化调度

监控系统包含以下自动化任务：

- **每15分钟**：收集容量指标
- **每30分钟**：检查容量告警
- **每小时**：系统健康检查
- **每日**：数据维护和清理

## 🛠️ 维护管理

### 数据保留策略
- 容量报告：保留 30 天
- 性能日志：保留 7 天  
- 已解决告警：保留 90 天

### 清理脚本 (定期执行)
```sql
-- 清理旧的容量报告
DELETE FROM capacity_reports WHERE collected_at < NOW() - INTERVAL '30 days';

-- 清理旧的性能日志
DELETE FROM system_performance_logs WHERE logged_at < NOW() - INTERVAL '7 days';

-- 清理旧的已解决告警
DELETE FROM monitoring_alerts 
WHERE resolved_at IS NOT NULL 
AND resolved_at < NOW() - INTERVAL '90 days';
```

## 🚨 告警配置

### 默认告警阈值
- **容量警告**：使用量达到 80% 时触发
- **容量紧急**：使用量达到 95% 时触发
- **性能警告**：响应时间超过 2 秒时触发
- **性能紧急**：响应时间超过 5 秒时触发

### 自定义告警设置
```sql
-- 更新容量警告阈值为 85%
UPDATE luma_settings 
SET value = '85' 
WHERE key = 'capacity_warn_pct';

-- 更新容量配额为 10GB
UPDATE luma_settings 
SET value = '10.0' 
WHERE key = 'capacity_quota_gb';
```

## 📱 集成示例

### 前端仪表板集成
```javascript
// 获取系统健康状态
const response = await fetch('/api/monitoring/health');
const { health } = await response.json();

// 显示容量使用情况
console.log(`容量使用: ${health.capacity.used_pct}%`);
console.log(`系统健康: ${health.overall_health}`);
```

### 告警通知集成
```javascript
// 检查活跃告警
const alerts = await fetch('/api/monitoring/alerts?active_only=true');
const { alerts: activeAlerts } = await alerts.json();

activeAlerts.forEach(alert => {
  if (alert.severity === 'critical') {
    // 发送紧急通知
    sendNotification(alert.title, alert.message);
  }
});
```

## 🔧 故障排查

### 常见问题

1. **无法收集容量指标**
   - 检查 Supabase 连接和权限
   - 确认数据表已正确创建

2. **API 端点返回 500 错误**
   - 验证环境变量设置
   - 检查 service_role_key 权限

3. **告警未触发**
   - 确认 cron 调度器正在运行
   - 检查告警阈值设置

4. **性能数据缺失**
   - 确认 API 端点正在记录性能指标
   - 检查 `log_api_performance` 函数调用

### 调试命令
```bash
# 测试数据库连接
node test-monitoring-system.js

# 检查 API 端点
curl http://localhost:8787/api/monitoring/health

# 手动收集容量指标
curl -X POST http://localhost:8787/api/monitoring/capacity/collect
```

## 📈 扩展建议

1. **集成外部告警系统** (PagerDuty, Slack)
2. **添加用户活动监控**
3. **创建 Grafana 仪表板**
4. **实现自动扩容建议**
5. **添加业务指标追踪**

---

## 🎉 总结

Luma 3 监控系统提供了全面的数据库和应用性能监控能力，通过自动化的数据收集、智能告警和丰富的查询接口，帮助维护系统稳定性和性能优化。

系统设计考虑了可扩展性和易用性，支持通过配置调整监控策略，适合生产环境长期运行。