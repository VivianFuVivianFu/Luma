# VS Code 中执行 Supabase 设置的 PowerShell 脚本
# 使用 Access Token 方式绕过交互式登录

Write-Host "=======================================" -ForegroundColor Blue
Write-Host "  Luma Supabase 自动化设置 (VS Code)" -ForegroundColor Blue  
Write-Host "=======================================" -ForegroundColor Blue
Write-Host ""

# 检查是否有 Access Token
if (-not $env:SUPABASE_ACCESS_TOKEN) {
    Write-Host "⚠️  未检测到 SUPABASE_ACCESS_TOKEN 环境变量" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "请按以下步骤获取 Access Token:" -ForegroundColor Green
    Write-Host "1. 访问: https://supabase.com/dashboard/account/tokens" -ForegroundColor White
    Write-Host "2. 点击 'Generate new token'" -ForegroundColor White
    Write-Host "3. 输入名称如 'Luma CLI'" -ForegroundColor White
    Write-Host "4. 复制生成的 token" -ForegroundColor White
    Write-Host ""
    Write-Host "然后在 VS Code 终端中运行:" -ForegroundColor Green
    Write-Host "`$env:SUPABASE_ACCESS_TOKEN = '您的token'" -ForegroundColor White
    Write-Host "然后重新运行此脚本" -ForegroundColor White
    Write-Host ""
    
    # 尝试打开浏览器到 token 页面
    Write-Host "正在为您打开 Supabase tokens 页面..." -ForegroundColor Green
    Start-Process "https://supabase.com/dashboard/account/tokens"
    
    exit 1
}

Write-Host "✅ 检测到 Access Token，继续设置..." -ForegroundColor Green
Write-Host ""

# 设置项目信息
$PROJECT_REF = "oyqzljunafjfuwdedjee"
$PROJECT_URL = "https://oyqzljunafjfuwdedjee.supabase.co"

Write-Host "📋 项目信息:" -ForegroundColor Blue
Write-Host "   项目 ID: $PROJECT_REF" -ForegroundColor White
Write-Host "   项目 URL: $PROJECT_URL" -ForegroundColor White
Write-Host ""

try {
    # 链接项目
    Write-Host "🔗 链接到 Supabase 项目..." -ForegroundColor Blue
    $linkResult = npx supabase link --project-ref $PROJECT_REF 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 项目链接成功" -ForegroundColor Green
    } else {
        Write-Host "❌ 项目链接失败: $linkResult" -ForegroundColor Red
        throw "链接失败"
    }
    
    Write-Host ""
    
    # 设置环境变量
    Write-Host "⚙️  设置 Edge Function 环境变量..." -ForegroundColor Blue
    $secretsCmd = 'npx supabase secrets set SUPABASE_URL="https://oyqzljunafjfuwdedjee.supabase.co" SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95cXpsanVuYWZqZnV3ZGVkamVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY1ODIwNiwiZXhwIjoyMDcwMjM0MjA2fQ.eUbnUfEeXJ7p7SCTBS3-MuUPglnR8ztIiqqsZgHruUg" RESEND_API_KEY="re_fyNdBZxk_61v8KRBJ8aTUxJnNp92GBCSr" FROM_EMAIL="Luma <noreply@placeholder-domain.com>" HUGGINGFACE_API_KEY="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" HF_MODEL_ID="klyang/MentaLLaMA-chat-7B" CRON_SECRET="iugftdhuy8756475e5dvhgkdt"'
    Invoke-Expression $secretsCmd
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 环境变量设置成功" -ForegroundColor Green
    } else {
        Write-Host "❌ 环境变量设置失败" -ForegroundColor Red
    }
    
    Write-Host ""
    
    # 部署 Edge Function
    Write-Host "🚀 部署 Edge Function..." -ForegroundColor Blue
    $deployResult = npx supabase functions deploy nudge-email-24h --no-verify-jwt 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Edge Function 部署成功" -ForegroundColor Green
        Write-Host ""
        Write-Host "📡 函数 URL: https://oyqzljunafjfuwdedjee.functions.supabase.co/nudge-email-24h" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Edge Function 部署失败: $deployResult" -ForegroundColor Red
    }
    
    Write-Host ""
    
    # 运行验证
    Write-Host "🔍 验证系统配置..." -ForegroundColor Blue
    if (Test-Path "verify-nudge-system.js") {
        node verify-nudge-system.js
    } else {
        Write-Host "⚠️  验证脚本不存在，跳过验证" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "=======================================" -ForegroundColor Blue
    Write-Host "          设置完成！" -ForegroundColor Green
    Write-Host "=======================================" -ForegroundColor Blue
    Write-Host ""
    Write-Host "📋 还需要手动完成:" -ForegroundColor Yellow
    Write-Host "1. 在 Supabase SQL Editor 中执行 supabase_schema.sql" -ForegroundColor White
    Write-Host "2. 在 Supabase Dashboard 设置定时任务 (每天上午10点)" -ForegroundColor White
    Write-Host ""
    Write-Host "🌐 访问链接:" -ForegroundColor Green
    Write-Host "   SQL Editor: https://supabase.com/dashboard/project/oyqzljunafjfuwdedjee/sql" -ForegroundColor Cyan
    Write-Host "   Edge Functions: https://supabase.com/dashboard/project/oyqzljunafjfuwdedjee/functions" -ForegroundColor Cyan

} catch {
    Write-Host ""
    Write-Host "❌ 设置过程中出现错误: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "请检查:" -ForegroundColor Yellow
    Write-Host "1. Access Token 是否有效" -ForegroundColor White
    Write-Host "2. 网络连接是否正常" -ForegroundColor White
    Write-Host "3. Supabase 项目是否存在" -ForegroundColor White
}