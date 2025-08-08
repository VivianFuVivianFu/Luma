# 语音聊天功能配置

## 当前实现

该项目现在包含了一个改进的语音聊天功能，使用11Labs的React库直接与他们的API集成。

### 主要特性

1. **直接11Labs集成**：使用11Labs React库的`useConversation` hook
2. **API密钥配置**：在ChatSection组件中直接配置
3. **状态管理**：实时显示语音连接状态
4. **错误处理**：用户友好的错误消息
5. **视觉反馈**：按钮状态变化和加载指示器

### 配置说明

#### 环境变量
项目包含一个`.env`文件，包含以下配置：
```
VITE_ELEVENLABS_API_KEY=sk_415684fdf9ebc8dc4aaeca3706625ab0b496276d0a69f74e
```

#### Agent ID
当前配置的Agent ID为：`agent_6901k1fgqzszfq89cxndsfs69z7m`

### 文件结构

```
src/
├── components/
│   └── ChatSection.tsx      # 主要的聊天和语音功能组件
├── lib/
│   └── supabase.ts         # Supabase配置（可选，用于高级功能）
└── .env                    # 环境变量配置
```

### 使用方法

1. **文本聊天**：在输入框中输入消息并按Enter或点击发送按钮
2. **语音聊天**：点击麦克风按钮开始语音对话
3. **结束语音**：再次点击麦克风按钮结束语音对话

### 故障排除

如果语音功能不工作：

1. 检查浏览器是否支持麦克风访问
2. 确保11Labs API密钥有效
3. 检查网络连接
4. 查看浏览器控制台是否有错误消息

### Supabase集成（可选）

如果您想使用Supabase Edge Functions来管理API密钥和签名URL，可以：

1. 设置Supabase项目
2. 配置环境变量中的Supabase URL和匿名密钥
3. 创建Edge Function来处理11Labs API调用
4. 取消注释ChatSection.tsx中的Supabase相关代码

### 技术栈

- **React 18**：用户界面框架
- **TypeScript**：类型安全
- **11Labs React**：语音AI集成
- **Tailwind CSS**：样式
- **Supabase**：后端服务（可选）
