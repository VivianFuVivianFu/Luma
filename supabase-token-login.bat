@echo off
echo ==============================================
echo     Supabase Token 登录方式
echo ==============================================
echo.
echo 如果交互式登录失败，您可以使用 Access Token 方式：
echo.
echo 1. 访问 https://supabase.com/dashboard/account/tokens
echo 2. 创建新的 Access Token
echo 3. 复制 token
echo 4. 在此目录下运行：
echo.
echo    set SUPABASE_ACCESS_TOKEN=您的token
echo    npx supabase link --project-ref oyqzljunafjfuwdedjee
echo.
echo 或者一次性运行：
echo    npx supabase link --project-ref oyqzljunafjfuwdedjee --token 您的token
echo.
echo ==============================================
pause