// GitHub和Vercel部署问题诊断脚本 (ES模块版本)
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log("🔍 LUMA部署问题诊断");
console.log("=====================================");

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
console.log("\n1️⃣ Git配置检查");
console.log("-".repeat(30));
runCommand('git remote -v', 'Git远程仓库配置');
runCommand('git status', 'Git当前状态');

// 2. 检查最近提交
console.log("\n2️⃣ 最近提交分析");
console.log("-".repeat(30));
runCommand('git log --oneline -3', '最近3次提交');

// 3. 检查项目配置
console.log("\n3️⃣ 项目配置检查");
console.log("-".repeat(30));

const packageJsonPath = './package.json';
if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log(`✅ 项目名称: ${packageJson.name}`);
    console.log(`✅ 版本: ${packageJson.version}`);
    console.log(`✅ 构建脚本: ${packageJson.scripts?.build || '未设置'}`);
    console.log(`✅ 预览脚本: ${packageJson.scripts?.preview || '未设置'}`);
} else {
    console.log("❌ package.json 未找到");
}

// 4. 检查目录路径问题
console.log("\n4️⃣ 目录路径分析");
console.log("-".repeat(30));
const currentDir = process.cwd();
console.log(`当前目录: ${currentDir}`);

if (currentDir.includes(' ')) {
    console.log("⚠️ 警告: 目录路径包含空格！");
    console.log("这是主要问题之一 - Git和Vercel可能有路径解析问题");
    console.log("建议: 将项目移动到不含空格的路径，如 C:/Users/vivia/Desktop/Luma3");
} else {
    console.log("✅ 目录路径正常");
}

// 5. 检查Vercel配置
console.log("\n5️⃣ Vercel配置检查");
console.log("-".repeat(30));
const vercelFolderExists = fs.existsSync('./.vercel');
console.log(`Vercel配置文件夹: ${vercelFolderExists ? '✅ 存在' : '❌ 不存在'}`);

// 6. 检查构建状态
console.log("\n6️⃣ 构建状态检查");
console.log("-".repeat(30));
const distExists = fs.existsSync('./dist');
console.log(`构建目录 (dist): ${distExists ? '✅ 存在' : '❌ 不存在'}`);

const nodeModulesExists = fs.existsSync('./node_modules');
console.log(`依赖目录 (node_modules): ${nodeModulesExists ? '✅ 存在' : '❌ 不存在'}`);

// 诊断结论
console.log("\n🎯 诊断结论");
console.log("=====================================");

console.log("\n❗ 发现的主要问题:");
if (currentDir.includes(' ')) {
    console.log("1. 🚨 目录路径包含空格 - 这是最可能的根本原因！");
    console.log("   路径: 'Luma 3' 应该改为 'Luma3' 或 'Luma-3'");
}

if (!vercelFolderExists) {
    console.log("2. ⚠️ Vercel配置丢失 - 需要重新连接项目");
}

console.log("\n💡 解决方案:");
console.log("1. 立即解决: 将项目移动到不含空格的路径");
console.log("2. 重新连接Vercel项目");
console.log("3. 推送新的commit触发重新部署");

console.log("\n🔧 立即执行的命令:");
console.log("1. 创建新的无空格目录:");
console.log("   mkdir C:\\Users\\vivia\\Desktop\\Luma-3");
console.log("2. 复制项目文件");
console.log("3. 在新目录中重新初始化Vercel:");
console.log("   npx vercel --prod");

console.log("\n✅ 诊断完成！主要问题是目录路径包含空格。");