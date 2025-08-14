// GitHub和Vercel部署问题诊断脚本
// Diagnosis script for GitHub and Vercel deployment issues

console.log("🔍 LUMA部署问题诊断 (LUMA Deployment Issue Diagnosis)");
console.log("=" * 60);

// 检查基本信息
console.log("\n📋 基本信息检查 (Basic Information Check)");
console.log("-".repeat(40));

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function runCommand(command, description) {
    try {
        console.log(`\n🔧 ${description}`);
        const output = execSync(command, { encoding: 'utf8', cwd: process.cwd() });
        console.log(output.trim());
        return output.trim();
    } catch (error) {
        console.log(`❌ 错误: ${error.message}`);
        return null;
    }
}

// 1. 检查当前Git配置
console.log("\n1️⃣ Git配置检查 (Git Configuration Check)");
runCommand('git remote -v', 'Git远程仓库配置');
runCommand('git branch -a', 'Git分支信息');
runCommand('git status --porcelain', 'Git状态简要');

// 2. 检查最近提交
console.log("\n2️⃣ 最近提交分析 (Recent Commits Analysis)");
runCommand('git log --oneline -5', '最近5次提交');
runCommand('git log --since="24 hours ago" --oneline', '24小时内提交');

// 3. 检查项目结构变化
console.log("\n3️⃣ 项目结构检查 (Project Structure Check)");
const packageJsonPath = './package.json';
if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log(`项目名称: ${packageJson.name}`);
    console.log(`版本: ${packageJson.version}`);
    console.log(`构建脚本: ${packageJson.scripts?.build || '未设置'}`);
} else {
    console.log("❌ package.json 未找到");
}

// 4. 检查Vercel配置
console.log("\n4️⃣ Vercel配置检查 (Vercel Configuration Check)");
const vercelConfigExists = fs.existsSync('./vercel.json');
const vercelFolderExists = fs.existsSync('./.vercel');

console.log(`vercel.json 存在: ${vercelConfigExists ? '✅' : '❌'}`);
console.log(`/.vercel 文件夹存在: ${vercelFolderExists ? '✅' : '❌'}`);

if (vercelFolderExists) {
    try {
        const vercelProject = fs.readFileSync('./.vercel/project.json', 'utf8');
        const projectInfo = JSON.parse(vercelProject);
        console.log(`Vercel项目ID: ${projectInfo.projectId}`);
        console.log(`Vercel组织ID: ${projectInfo.orgId}`);
    } catch (error) {
        console.log("⚠️ 无法读取Vercel项目配置");
    }
}

// 5. 检查可能的路径问题
console.log("\n5️⃣ 路径问题分析 (Path Issue Analysis)");
const currentDir = process.cwd();
console.log(`当前工作目录: ${currentDir}`);

// 检查目录名是否包含空格
if (currentDir.includes(' ')) {
    console.log("⚠️ 警告: 目录路径包含空格，这可能导致部署问题");
    console.log("建议: 将项目移动到不含空格的路径");
}

// 6. 检查依赖和构建
console.log("\n6️⃣ 依赖和构建检查 (Dependencies and Build Check)");
if (fs.existsSync('./node_modules')) {
    console.log("✅ node_modules 存在");
} else {
    console.log("❌ node_modules 不存在，需要运行 npm install");
}

// 检查构建文件
if (fs.existsSync('./dist')) {
    console.log("✅ dist 构建目录存在");
    runCommand('ls -la dist', 'dist目录内容');
} else {
    console.log("❌ dist 构建目录不存在");
}

// 7. 诊断结论和建议
console.log("\n🎯 诊断结论和建议 (Diagnosis and Recommendations)");
console.log("=".repeat(50));

console.log("\n🔍 可能的问题原因 (Possible Issues):");
console.log("1. 目录路径包含空格 -> 可能影响CI/CD部署");
console.log("2. Vercel项目配置丢失 -> 需要重新连接");
console.log("3. 依赖版本变化 -> 可能导致构建失败");
console.log("4. 环境变量配置 -> 可能在新环境中缺失");

console.log("\n💡 解决建议 (Solutions):");
console.log("1. 检查Vercel项目连接状态");
console.log("2. 重新构建和部署");
console.log("3. 验证环境变量配置");
console.log("4. 检查package.json中的构建脚本");

console.log("\n🚀 立即行动步骤 (Immediate Actions):");
console.log("1. 运行 npm run build 测试本地构建");
console.log("2. 检查 Vercel Dashboard 中的项目状态");
console.log("3. 如需要，重新连接 Vercel 项目");
console.log("4. 推送新的提交触发重新部署");

console.log("\n✅ 诊断完成！请查看上述分析结果。");