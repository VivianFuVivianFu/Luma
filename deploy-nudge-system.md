# Luma 关怀邮件系统部署指南

## 🔥 Claude Code 已完成的准备工作

✅ **数据库架构** - `supabase_schema.sql`
✅ **Edge Function 代码** - `supabase/functions/nudge-email-24h/index.ts` 
✅ **测试脚本** - `test-nudge-function.sql`
✅ **配置文件检查** - 发现您的 Supabase 项目配置

---

## 🚨 需要您手动完成的步骤

### 步骤 1: 登录 Supabase CLI
```bash
npx supabase login
```
**说明：** 会自动打开浏览器，用您的 Supabase 账号登录

### 步骤 2: 链接项目
```bash
npx supabase link --project-ref oyqzljunafjfuwdedjee
```
**说明：** 链接到您现有的项目，会提示输入数据库密码

### 步骤 3: 执行数据库脚本
**方法 1 - 在 Supabase Dashboard:**
1. 访问 https://supabase.com/dashboard/project/oyqzljunafjfuwdedjee
2. 左侧菜单点击 **"SQL Editor"**
3. 点击 **"New Query"**
4. 复制粘贴 `supabase_schema.sql` 的全部内容
5. 点击 **"Run"** 执行

**方法 2 - 使用 CLI (推荐):**
```bash
npx supabase db push
```

### 步骤 4: 设置环境变量
```bash
npx supabase secrets set \
  SUPABASE_URL="https://oyqzljunafjfuwdedjee.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="您的Service Role Key" \
  RESEND_API_KEY="re_fyNdBZxk_61v8KRBJ8aTUxJnNp92GBCSr" \
  FROM_EMAIL="Luma <noreply@您的域名.com>" \
  HUGGINGFACE_API_KEY="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" \
  HF_MODEL_ID="klyang/MentaLLaMA-chat-7B" \
  CRON_SECRET="iugftdhuy8756475e5dvhgkdt"
```

**⚠️ 重要说明:**
- `FROM_EMAIL` 中的域名需要在 Resend 中验证
- 如果没有自己的域名，可以暂时用测试邮箱

### 步骤 5: 部署 Edge Function
```bash
npx supabase functions deploy nudge-email-24h --no-verify-jwt
```
**结果：** 会返回函数 URL，类似：
`https://oyqzljunafjfuwdedjee.functions.supabase.co/nudge-email-24h`

### 步骤 6: 设置定时任务
1. 访问 https://supabase.com/dashboard/project/oyqzljunafjfuwdedjee
2. 左侧菜单 **"Edge Functions"** 
3. 找到 `nudge-email-24h` 点击进入
4. 点击 **"Schedules"** 标签
5. 点击 **"Add schedule"**

**定时任务配置：**
- **Cron Expression:** `0 10 * * *` (每天上午10点)
- **Time zone:** 选择您的时区 (建议 Asia/Shanghai)
- **Method:** `POST`
- **URL:** `https://oyqzljunafjfuwdedjee.functions.supabase.co/nudge-email-24h?token=iugftdhuy8756475e5dvhgkdt`

---

## 🔍 验证和测试

### 测试函数手动执行
```bash
curl -X POST "https://oyqzljunafjfuwdedjee.functions.supabase.co/nudge-email-24h?token=iugftdhuy8756475e5dvhgkdt"
```

### 查看函数日志
```bash
npx supabase functions logs nudge-email-24h --since 1h
```

### 检查数据库记录
在 Supabase SQL Editor 中运行 `test-nudge-function.sql` 的内容

---

## 📧 Resend 邮件服务配置

### 如果您还没有设置 Resend:
1. 访问 [resend.com](https://resend.com) 注册
2. 验证您的发送域名
3. 创建 API Key (已有: `re_fyNdBZxk_61v8KRBJ8aTUxJnNp92GBCSr`)

### 如果暂时没有自己域名:
可以使用 Resend 的测试功能，邮件会发送到您的注册邮箱

---

## 🎯 系统设计特点

✅ **24小时不上线才发邮件**
✅ **一周最多发一次给同一用户**  
✅ **每天只检查一次 (上午10点)**
✅ **每次最多处理10个用户**
✅ **优先关怀离线时间更长的用户**
✅ **只关怀有过负向情绪历史的用户**

---

## 🆘 如果遇到问题

1. **登录失败:** 确保网络正常，浏览器允许弹出窗口
2. **链接项目失败:** 检查项目 ID 是否正确
3. **函数部署失败:** 检查代码语法，查看错误日志
4. **邮件发送失败:** 检查 Resend API Key 和域名验证
5. **定时任务不执行:** 检查 Cron 表达式和时区设置

**需要帮助时，请提供：**
- 错误信息的截图
- 命令执行的完整输出
- 当前执行到第几步