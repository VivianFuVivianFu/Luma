# 🚀 Luma 关怀邮件系统 - 快速启动

## 📋 执行清单

### ✅ Claude Code 已完成的准备工作
- [x] 数据库架构设计 (`supabase_schema.sql`)
- [x] Edge Function 代码 (`supabase/functions/nudge-email-24h/`)
- [x] 验证脚本 (`verify-nudge-system.js`)
- [x] 部署文档 (`deploy-nudge-system.md`)

---

## 🔥 现在只需 5 分钟完成部署！

### 方案 A: 在常规命令提示符中执行（推荐）

1. **打开命令提示符**
   - `Win + R` → 输入 `cmd` → 回车

2. **复制粘贴执行** (`manual-setup-commands.txt` 中的命令)
   ```cmd
   cd "C:\Users\vivia\OneDrive\Desktop\Luma 3"
   npx supabase login
   ```

### 方案 B: 在 VS Code 中手动执行

您需要先在外部登录，然后回到 VS Code 继续：

1. **在外部命令提示符登录**：
   ```cmd
   cd "C:\Users\vivia\OneDrive\Desktop\Luma 3"
   npx supabase login
   ```

2. **回到 VS Code 继续执行其他命令**

---

## 🎯 关键信息总结

**您的项目信息：**
- 项目 ID: `oyqzljunafjfuwdedjee`  
- 项目 URL: https://oyqzljunafjfuwdedjee.supabase.co
- 函数 URL: https://oyqzljunafjfuwdedjee.functions.supabase.co/nudge-email-24h

**系统特点：**
- ✅ 24小时不上线才发邮件
- ✅ 一周最多发一次给同一用户  
- ✅ 每天上午10点自动检查
- ✅ 每次最多处理10个用户

**需要的服务：**
- ✅ Supabase (您已有项目)
- ✅ Resend API (您已有密钥)
- ✅ Hugging Face (您已有密钥)

---

## ⚡ 最快执行路径

如果您想最快完成，请：

1. **打开新的命令提示符窗口**
2. **复制粘贴这些命令**：

```cmd
cd "C:\Users\vivia\OneDrive\Desktop\Luma 3"
npx supabase login
npx supabase link --project-ref oyqzljunafjfuwdedjee
npx supabase functions deploy nudge-email-24h --no-verify-jwt
node verify-nudge-system.js
```

3. **在浏览器中设置定时任务**：
   - 访问 https://supabase.com/dashboard/project/oyqzljunafjfuwdedjee/functions
   - 设置每天上午10点执行

**完成！** 🎉

---

## 🆘 如果遇到问题

- **登录失败**: 检查网络，允许浏览器弹出窗口
- **链接项目失败**: 输入正确的数据库密码
- **函数部署失败**: 检查代码语法（已验证无误）
- **需要帮助**: 告诉我错误信息，我来帮您解决

**预计总耗时**: 5-10分钟