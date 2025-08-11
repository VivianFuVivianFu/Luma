# update_model_names.py
# 更新所有文件中的模型名称为正确的 Meta Llama 3 70B Instruct Turbo

import os
import glob
import shutil
import re
from datetime import datetime

def backup_files():
    """备份原始文件"""
    backup_dir = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    os.makedirs(backup_dir, exist_ok=True)
    
    # 备份所有相关文件类型
    file_patterns = ["*.py", "*.js", "*.html", "*.json", "*.md"]
    backed_up_files = []
    
    for pattern in file_patterns:
        files = glob.glob(pattern)
        for file in files:
            try:
                shutil.copy2(file, os.path.join(backup_dir, file))
                backed_up_files.append(file)
            except Exception as e:
                print(f"⚠️ 备份 {file} 失败: {e}")
    
    print(f"✅ 已备份 {len(backed_up_files)} 个文件到: {backup_dir}")
    return backup_dir

def get_target_model_name():
    """获取目标模型名称（使用官方文档确认的名称）"""
    
    # 根据官方文档，正确的模型名称
    official_models = [
        "meta-llama/Meta-Llama-3-70B-Instruct-Turbo",  # 推荐
        "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
        "meta-llama/Llama-3.3-70B-Instruct-Turbo", 
        "meta-llama/Llama-3-70b-chat-hf"
    ]
    
    print("🎯 请选择要使用的官方 LLaMA 3 70B 模型:")
    for i, model in enumerate(official_models, 1):
        if i == 1:
            print(f"   {i}. {model} 🌟 (推荐)")
        else:
            print(f"   {i}. {model}")
    
    print("   0. 手动输入其他模型名称")
    print()
    
    while True:
        try:
            choice = input("请选择 (1-4 或 0): ").strip()
            
            if choice == "0":
                custom_model = input("请输入模型名称: ").strip()
                if custom_model:
                    print(f"✅ 将使用自定义模型: {custom_model}")
                    return custom_model
                else:
                    print("❌ 模型名称不能为空")
                    continue
            
            choice_num = int(choice)
            if 1 <= choice_num <= len(official_models):
                selected_model = official_models[choice_num - 1]
                print(f"✅ 将使用官方模型: {selected_model}")
                return selected_model
            else:
                print("❌ 请输入有效的选项")
                
        except ValueError:
            print("❌ 请输入数字")
        except KeyboardInterrupt:
            print("\n❌ 用户取消")
            return None

def create_model_mappings(target_model):
    """创建模型名称映射表"""
    
    # 所有可能的旧模型名称 -> 新的目标模型名称
    model_updates = {
        # LLaMA 2 系列
        "meta-llama/Llama-2-7b-chat-hf": target_model,
        "meta-llama/Llama-2-70b-chat-hf": target_model,
        "meta-llama/llama-2-7b-chat": target_model,
        "meta-llama/llama-2-70b-chat": target_model,
        "Llama-2-7b-chat-hf": target_model,
        "Llama-2-70b-chat-hf": target_model,
        
        # LLaMA 3 系列（各种变体）
        "meta-llama/Llama-3-8b-chat-hf": target_model,
        "meta-llama/Llama-3-70b-chat-hf": target_model,
        "meta-llama/Meta-Llama-3-8B-Instruct": target_model,
        "meta-llama/Meta-Llama-3-70B-Instruct": target_model,
        "meta-llama/Meta-Llama-3.1-8B-Instruct": target_model,
        "meta-llama/Meta-Llama-3.1-70B-Instruct": target_model,
        "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo": target_model,
        
        # 从搜索结果看到的具体名称
        "meta-llama/Llama-3.2-3B-Instruct-Turbo": target_model,
        "Llama-3.2-3B": target_model,
        "Llama-3.2-3B-Instruct-Turbo": target_model,
        
        # 其他可能的变体
        "NousResearch/Meta-Llama-3-70B-Instruct": target_model,
        "togethercomputer/Llama-2-7B-32K-Instruct": target_model,
        
        # 确保不会替换目标模型本身
        target_model: target_model
    }
    
    return model_updates

def update_file_content(file_path, model_updates):
    """更新单个文件的模型名称"""
    try:
        # 尝试不同的编码
        content = None
        for encoding in ['utf-8', 'utf-8-sig', 'gbk', 'latin-1']:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    content = f.read()
                break
            except UnicodeDecodeError:
                continue
        
        if content is None:
            print(f"❌ 无法读取 {file_path}（编码问题）")
            return False, []
        
        original_content = content
        updated_patterns = []
        
        # 使用正则表达式进行更精确的替换
        for old_model, new_model in model_updates.items():
            if old_model == new_model:  # 跳过目标模型
                continue
                
            # 创建多种匹配模式
            patterns = [
                # 引号包围的完整模型名称
                f'"{re.escape(old_model)}"',
                f"'{re.escape(old_model)}'",
                # model= 或 model: 后面的模型名称
                f'model\\s*=\\s*"{re.escape(old_model)}"',
                f'model\\s*=\\s*\'{re.escape(old_model)}\'',
                f'"model"\\s*:\\s*"{re.escape(old_model)}"',
                f"'model'\\s*:\\s*'{re.escape(old_model)}'",
                # 不带引号的模型名称（在某些上下文中）
                f'\\b{re.escape(old_model)}\\b'
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                if matches:
                    # 替换时保持原有的引号风格
                    if '=' in pattern:
                        if '"' in pattern:
                            replacement = f'model="{new_model}"'
                        else:
                            replacement = f"model='{new_model}'"
                        content = re.sub(f'model\\s*=\\s*["\'][^"\']*{re.escape(old_model)}[^"\']*["\']', 
                                       replacement, content, flags=re.IGNORECASE)
                    elif ':' in pattern:
                        if '"model"' in pattern:
                            replacement = f'"model": "{new_model}"'
                        else:
                            replacement = f"'model': '{new_model}'"
                        content = re.sub(f'["\']model["\']\\s*:\\s*["\'][^"\']*{re.escape(old_model)}[^"\']*["\']', 
                                       replacement, content, flags=re.IGNORECASE)
                    else:
                        # 简单替换，保持原有引号
                        content = re.sub(f'"{re.escape(old_model)}"', f'"{new_model}"', content)
                        content = re.sub(f"'{re.escape(old_model)}'", f"'{new_model}'", content)
                    
                    updated_patterns.append(f"{old_model} → {new_model}")
        
        # 如果有更改，写入文件
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, updated_patterns
        else:
            return False, []
            
    except Exception as e:
        print(f"❌ 更新 {file_path} 失败: {e}")
        return False, []

def show_current_models():
    """显示当前文件中使用的模型"""
    file_patterns = ["*.py", "*.js", "*.html", "*.json"]
    
    print("🔍 当前文件中的模型名称:")
    print("-" * 60)
    
    model_locations = {}
    
    for pattern in file_patterns:
        files = glob.glob(pattern)
        for file in files:
            try:
                with open(file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # 查找模型相关的行
                lines = content.split('\n')
                for i, line in enumerate(lines, 1):
                    # 更全面的模型名称检测
                    if any(keyword in line.lower() for keyword in [
                        'model=', 'model":', 'model\':', 'llama', 'meta-llama', 
                        '"model"', "'model'", 'ask_llama', 'llama_model'
                    ]):
                        if 'meta-llama' in line.lower() or 'llama' in line.lower():
                            location = f"{file}:{i}"
                            if file not in model_locations:
                                model_locations[file] = []
                            model_locations[file].append(f"  第{i}行: {line.strip()}")
                            
            except Exception as e:
                print(f"⚠️ 读取 {file} 失败: {e}")
    
    # 显示结果
    for file, lines in model_locations.items():
        print(f"\n📁 {file}:")
        for line in lines:
            print(line)
    
    if not model_locations:
        print("✅ 没有找到包含模型名称的文件")

def update_all_files(target_model):
    """更新所有文件中的模型名称"""
    
    model_updates = create_model_mappings(target_model)
    file_patterns = ["*.py", "*.js", "*.html", "*.json"]
    
    updated_files = []
    total_updates = 0
    
    print(f"\n🔄 开始更新所有文件为目标模型: {target_model}")
    print("-" * 60)
    
    for pattern in file_patterns:
        files = glob.glob(pattern)
        for file in files:
            updated, patterns = update_file_content(file, model_updates)
            if updated:
                updated_files.append(file)
                total_updates += len(patterns)
                print(f"✅ {file}:")
                for pattern in patterns:
                    print(f"    {pattern}")
    
    return updated_files, total_updates

def main():
    print("🔧 模型名称批量更新工具")
    print("="*60)
    
    # 显示当前模型
    show_current_models()
    
    # 获取目标模型名称
    target_model = get_target_model_name()
    
    # 询问是否继续
    print(f"\n❓ 确认要将所有模型名称更新为:")
    print(f"   {target_model}")
    print(f"   这将影响所有 .py, .js, .html, .json 文件")
    
    choice = input("\n输入 'yes' 继续，其他任意键取消: ").strip().lower()
    
    if choice in ['yes', 'y', '是']:
        # 备份文件
        backup_dir = backup_files()
        
        # 更新所有文件
        updated_files, total_updates = update_all_files(target_model)
        
        # 显示结果
        print(f"\n🎉 更新完成!")
        print("-" * 60)
        print(f"✅ 更新了 {len(updated_files)} 个文件")
        print(f"✅ 总共进行了 {total_updates} 处更新")
        print(f"💾 原始文件已备份到: {backup_dir}")
        
        if updated_files:
            print(f"\n📋 更新的文件列表:")
            for file in updated_files:
                print(f"   • {file}")
        
        print(f"\n🎯 现在所有文件都使用: {target_model}")
        print(f"💡 接下来可以运行测试脚本验证更新效果")
        
    else:
        print("\n❌ 取消更新")

if __name__ == "__main__":
    main()
