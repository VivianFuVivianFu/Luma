@echo off
echo 设置 Microsoft Edge 为默认浏览器
echo =======================================

REM 方法 1: 通过注册表设置 (需要管理员权限)
echo 1. 通过注册表设置...
reg add "HKEY_CURRENT_USER\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\http\UserChoice" /v "ProgId" /t REG_SZ /d "MSEdgeHTM" /f
reg add "HKEY_CURRENT_USER\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\https\UserChoice" /v "ProgId" /t REG_SZ /d "MSEdgeHTM" /f

echo.
echo ✅ Edge 已设置为默认浏览器
echo.
echo 如果上述方法无效，请手动设置：
echo 1. Windows设置 → 应用 → 默认应用
echo 2. 找到 "Web浏览器"，选择 Microsoft Edge
echo.
pause