@echo off
echo =================================================
echo       Luma 关怀邮件系统 - 自动化部署脚本
echo =================================================
echo.

REM 检查 Node.js 是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

echo ✅ Node.js 已安装
echo.

REM 步骤 1: 登录 Supabase
echo 📋 步骤 1/6: 登录 Supabase CLI
echo 即将打开浏览器，请使用您的 Supabase 账号登录...
echo.
npx supabase login
if errorlevel 1 (
    echo ❌ Supabase 登录失败
    pause
    exit /b 1
)

echo ✅ Supabase 登录成功
echo.

REM 步骤 2: 链接项目
echo 📋 步骤 2/6: 链接到远程项目
echo 项目 ID: oyqzljunafjfuwdedjee
echo 请输入数据库密码（创建项目时设置的密码）...
echo.
npx supabase link --project-ref oyqzljunafjfuwdedjee
if errorlevel 1 (
    echo ❌ 项目链接失败，请检查项目 ID 和密码
    pause
    exit /b 1
)

echo ✅ 项目链接成功
echo.

REM 步骤 3: 推送数据库架构
echo 📋 步骤 3/6: 部署数据库架构
echo 正在创建 nudges 表和相关函数...
echo.
npx supabase db push
if errorlevel 1 (
    echo ⚠️  数据库推送可能失败，请手动在 SQL Editor 中执行 supabase_schema.sql
    echo 继续执行其他步骤...
)

echo ✅ 数据库架构部署完成
echo.

REM 步骤 4: 设置环境变量
echo 📋 步骤 4/6: 设置 Edge Function 环境变量
echo 正在配置 secrets...
echo.
npx supabase secrets set SUPABASE_URL="https://oyqzljunafjfuwdedjee.supabase.co" SUPABASE_SERVICE_ROLE_KEY="%VITE_SUPABASE_SERVICE_ROLE_KEY%" RESEND_API_KEY="re_fyNdBZxk_61v8KRBJ8aTUxJnNp92GBCSr" FROM_EMAIL="Luma <noreply@placeholder-domain.com>" HUGGINGFACE_API_KEY="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" HF_MODEL_ID="klyang/MentaLLaMA-chat-7B" CRON_SECRET="iugftdhuy8756475e5dvhgkdt"
if errorlevel 1 (
    echo ❌ 环境变量设置失败
    pause
    exit /b 1
)

echo ✅ 环境变量设置完成
echo.

REM 步骤 5: 部署 Edge Function
echo 📋 步骤 5/6: 部署 Edge Function
echo 正在部署 nudge-email-24h 函数...
echo.
npx supabase functions deploy nudge-email-24h --no-verify-jwt
if errorlevel 1 (
    echo ❌ Edge Function 部署失败
    pause
    exit /b 1
)

echo ✅ Edge Function 部署成功
echo.

REM 步骤 6: 验证系统
echo 📋 步骤 6/6: 验证系统配置
echo 运行验证脚本...
echo.
node verify-nudge-system.js

echo.
echo =================================================
echo                    部署完成！
echo =================================================
echo.
echo 🎉 自动化步骤已完成！
echo.
echo 📋 还需要手动完成：
echo 1. 在 Supabase Dashboard 设置定时任务 (每天上午10点)
echo 2. 如有自己的域名，请在 Resend 中验证域名
echo.
echo 📖 详细说明请查看: deploy-nudge-system.md
echo 🔍 验证脚本: node verify-nudge-system.js
echo.
pause