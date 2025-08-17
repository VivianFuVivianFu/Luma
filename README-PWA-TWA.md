# Luma AI Companion - PWA & Android TWA 配置

本项目已配置为 Progressive Web App (PWA) 并支持打包为 Android Trusted Web Activity (TWA)。

## 项目配置

- **生产域名**: https://luma-3.vercel.app
- **Android 包名**: ai.luma.app
- **应用展示名**: Luma AI Companion

## 技术栈

- **前端**: Vite + React + TypeScript
- **PWA**: VitePWA plugin + Workbox
- **TWA**: Bubblewrap CLI
- **部署**: Vercel

## 快速开始

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器 (支持 PWA)
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### PWA 功能

#### 特性

- ✅ Service Worker 自动更新
- ✅ 离线支持 (`/offline.html`)
- ✅ Add to Home Screen (A2HS)
- ✅ 更新提示通知
- ✅ 缓存策略优化
- ✅ Manifest 配置

#### 组件使用

```tsx
import { InstallPrompt } from '@/components/InstallPrompt'
import { PWAUpdatePrompt } from '@/components/PWAUpdatePrompt'
import { useInstallPrompt, usePWAUpdate } from '@/components/InstallPrompt'

function App() {
  return (
    <>
      <YourAppContent />
      <InstallPrompt />
      <PWAUpdatePrompt />
    </>
  )
}

// 或使用 Hook
function MyComponent() {
  const { isInstallable, promptInstall } = useInstallPrompt()
  const { updateAvailable, applyUpdate } = usePWAUpdate()
  
  return (
    <div>
      {isInstallable && (
        <button onClick={promptInstall}>Install App</button>
      )}
      {updateAvailable && (
        <button onClick={applyUpdate}>Update App</button>
      )}
    </div>
  )
}
```

### Android TWA 打包

#### 首次设置

```bash
# 1. 初始化 TWA 项目
npm run twa:init

# 按提示输入配置（已在 package.json 中预设）
```

#### 构建发布版本

```bash
# 1. 构建 AAB 文件
npm run twa:bundle

# 2. 输出路径
ls -la ./android/app/build/outputs/bundle/release/app-release.aab
```

#### Digital Asset Links

1. 编辑 `public/.well-known/assetlinks.json`
2. 替换 SHA-256 指纹（见下文）
3. 部署并验证可访问性

```bash
# 验证 assetlinks.json
curl https://luma-3.vercel.app/.well-known/assetlinks.json
```

## 获取应用签名指纹

### Google Play App Signing (推荐)

1. 上传 AAB 到 Play Console
2. 前往 **Setup** > **App integrity**
3. 复制 **App signing key certificate** 的 SHA-256 指纹

### 本地 Keystore

```bash
# 生成 keystore (首次)
keytool -genkey -v -keystore luma-release-key.keystore \
  -alias luma -keyalg RSA -keysize 2048 -validity 10000

# 获取指纹
keytool -list -v -keystore luma-release-key.keystore -alias luma | grep SHA256
```

⚠️ **重要**: 将 keystore 文件保存在安全位置，切勿提交到代码库。

## 脚本说明

### PWA 相关

- `pwa:build` - 构建 PWA（等同于 `npm run build`）
- `pwa:lighthouse` - 显示 Lighthouse 检查命令

### TWA 相关

- `twa:init` - 初始化 TWA 项目配置
- `twa:build` - 构建调试版 APK
- `twa:bundle` - 构建发布版 AAB

### Android 相关

- `android:clean` - 清理 Android 构建文件
- `android:install` - 安装调试版到设备

## 文件结构

```
├── public/
│   ├── manifest.json                 # PWA Manifest
│   ├── offline.html                  # 离线页面
│   ├── icons/                        # 应用图标
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── maskable-512.png
│   └── .well-known/
│       └── assetlinks.json           # Digital Asset Links
├── src/
│   └── components/
│       ├── InstallPrompt.tsx         # A2HS 组件
│       └── PWAUpdatePrompt.tsx       # 更新提示组件
├── android/                          # TWA Android 项目 (构建后生成)
├── docs/
│   └── ANDROID_TWA_PUBLISH.md        # 详细发布指南
└── vite.config.ts                    # PWA 配置
```

## PWA 缓存策略

### API 缓存
- **策略**: NetworkFirst
- **超时**: 3 秒
- **缓存**: API 响应

### 图片缓存
- **策略**: CacheFirst
- **过期**: 7 天
- **最大条目**: 100

### 导航回退
- **回退页面**: `/offline.html`
- **适用**: 所有导航请求（除了 `/__` 开头的系统路径）

## 环境变量

确保以下环境变量已配置：

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
# ... 其他项目变量
```

## 部署检查清单

### PWA 检查

- [ ] Lighthouse PWA 评分 ≥ 90
- [ ] Service Worker 正常注册
- [ ] Manifest 文件可访问
- [ ] 图标文件齐全
- [ ] 离线页面工作正常

### TWA 检查

- [ ] AAB 文件生成成功
- [ ] Digital Asset Links 配置正确
- [ ] SHA-256 指纹已更新
- [ ] assetlinks.json 返回 200

### 部署检查

- [ ] HTTPS 部署
- [ ] 域名解析正确
- [ ] 静态文件可访问
- [ ] 无 CORS 错误

## 故障排除

### PWA 问题

- **Service Worker 未注册**: 检查 `vite.config.ts` 配置
- **A2HS 不可用**: 确保 PWA 要求全部满足
- **更新不生效**: 清除浏览器缓存，检查 SW 更新逻辑

### TWA 问题

- **Digital Asset Links 失败**: 验证 assetlinks.json 语法和可访问性
- **包名不匹配**: 检查 TWA 配置与 Play Console 一致性
- **域名问题**: 确保使用正确的生产域名

### 构建问题

- **依赖冲突**: 删除 `node_modules` 重新安装
- **TypeScript 错误**: 检查类型定义和导入路径
- **构建失败**: 查看构建日志，检查环境变量

## 有用链接

- [PWA 最佳实践](https://web.dev/progressive-web-apps/)
- [TWA 快速入门](https://developers.google.com/web/android/trusted-web-activity/quick-start)
- [Lighthouse PWA 审计](https://developers.google.com/web/tools/lighthouse)
- [Google Play Console](https://play.google.com/console)
- [Digital Asset Links 验证器](https://developers.google.com/digital-asset-links/tools/generator)

## 详细文档

完整的发布流程和故障排除，请查看：
📖 [Android TWA 发布指南](./docs/ANDROID_TWA_PUBLISH.md)

---

如有问题，请查看相关文档或提交 Issue。