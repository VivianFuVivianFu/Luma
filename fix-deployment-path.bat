@echo off
echo 🔧 修复LUMA部署路径问题
echo ============================

echo.
echo 📋 问题分析:
echo - 当前路径包含空格: "Luma 3"
echo - 这导致Git和Vercel部署出现问题
echo - 需要移动到不含空格的新路径

echo.
echo 💡 解决方案:
echo 1. 创建新的项目目录 (不含空格)
echo 2. 复制所有项目文件
echo 3. 重新初始化Git和Vercel连接

echo.
set /p confirm="继续执行修复? (y/n): "
if /i "%confirm%" neq "y" (
    echo 取消操作
    pause
    exit /b
)

echo.
echo 🚀 开始修复...

echo.
echo 1. 创建新目录...
mkdir "C:\Users\vivia\OneDrive\Desktop\Luma-3" 2>nul
if %errorlevel% neq 0 (
    echo ❌ 目录创建失败，可能已存在
) else (
    echo ✅ 新目录创建成功
)

echo.
echo 2. 复制项目文件...
echo    请手动复制文件，或运行:
echo    robocopy "C:\Users\vivia\OneDrive\Desktop\Luma 3" "C:\Users\vivia\OneDrive\Desktop\Luma-3" /E /XD node_modules .git

echo.
echo 3. 后续步骤:
echo    a) 进入新目录: cd "C:\Users\vivia\OneDrive\Desktop\Luma-3"
echo    b) 重新初始化Git: git init
echo    c) 添加远程仓库: git remote add origin https://github.com/VivianFuVivianFu/Luma-3.git
echo    d) 推送代码: git add . && git commit -m "Fix deployment path issue" && git push -u origin main
echo    e) 重新连接Vercel: npx vercel --prod

echo.
echo ✅ 修复脚本准备完成！
echo 📖 请按照上述步骤操作，或使用PowerShell版本的自动脚本

pause