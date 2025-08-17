# Android TWA (Trusted Web Activity) 发布指南

本文档描述了如何将 Luma AI Companion 打包为 Android TWA 应用并发布到 Google Play Console 内测轨道。

## 项目配置信息

- **生产域名**: https://luma-3.vercel.app
- **Android 包名**: ai.luma.app
- **应用展示名**: Luma AI Companion

## 1. PWA 可安装性检查

### 1.1 本地检查步骤

```bash
# 构建 PWA
npm run pwa:build

# 本地预览
npm run preview

# 在浏览器中检查 PWA 功能
# 1. 访问 http://localhost:4173
# 2. 打开开发者工具 > Application > Manifest
# 3. 检查 Service Workers 是否正常注册
# 4. 查看 "Add to Home Screen" 是否可用
```

### 1.2 线上 Lighthouse 检查

```bash
# 方式1: 使用 Chrome DevTools
# 1. 访问 https://luma-3.vercel.app
# 2. 打开开发者工具 > Lighthouse
# 3. 选择 "Progressive Web App" 检查
# 4. 确保分数 ≥ 90

# 方式2: 使用 CLI
npm run pwa:lighthouse
# 或直接运行
npx lighthouse https://luma-3.vercel.app --preset=pwa
```

### 1.3 PWA 通过标准

✅ **必须通过的检查项**:
- Manifest 文件存在且有效
- Service Worker 注册成功
- 图标齐全 (192x192, 512x512, maskable)
- HTTPS 部署
- 可离线访问（显示 offline.html）
- 响应式设计
- 页面加载速度 < 3s

## 2. TWA 打包流程

### 2.1 初始化 TWA 项目

```bash
# 确保 manifest.json 可访问
curl -I https://luma-3.vercel.app/manifest.json

# 初始化 TWA（首次运行）
npm run twa:init

# 按提示输入信息：
# Package name: ai.luma.app
# App name: Luma AI Companion  
# Host: luma-3.vercel.app
# Start URL: /?source=pwa
# Theme color: #0f172a
# Background color: #ffffff
```

### 2.2 构建 AAB 文件

```bash
# 清理之前的构建
npm run android:clean

# 构建 release AAB
npm run twa:bundle

# 输出路径：
# ./android/app/build/outputs/bundle/release/app-release.aab
```

### 2.3 验证 AAB 文件

```bash
# 检查文件是否生成
ls -la ./android/app/build/outputs/bundle/release/

# 文件大小应该在 1-10MB 之间
du -h ./android/app/build/outputs/bundle/release/app-release.aab
```

## 3. Digital Asset Links 配置

### 3.1 获取应用签名指纹

#### 方式1: 使用 Google Play App Signing (推荐)

1. 上传 AAB 到 Play Console
2. 前往 **Setup** > **App integrity**
3. 复制 **App signing key certificate** 的 SHA-256 指纹
4. 格式示例: `14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5`

#### 方式2: 本地 Keystore (自主签名)

```bash
# 生成 keystore (如果没有)
keytool -genkey -v -keystore luma-release-key.keystore -alias luma -keyalg RSA -keysize 2048 -validity 10000

# 获取 SHA-256 指纹
keytool -list -v -keystore luma-release-key.keystore -alias luma | grep SHA256

# ⚠️ 重要：将 keystore 文件备份到安全位置，切勿提交到代码库
```

### 3.2 更新 assetlinks.json

编辑 `public/.well-known/assetlinks.json`，替换占位符：

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "ai.luma.app",
    "sha256_cert_fingerprints":
    ["YOUR_ACTUAL_SHA256_FINGERPRINT_HERE"]
  }
}]
```

### 3.3 验证 Digital Asset Links

```bash
# 部署后验证
curl https://luma-3.vercel.app/.well-known/assetlinks.json

# 使用 Google 验证工具
# https://developers.google.com/digital-asset-links/tools/generator

# 应该返回有效的 JSON 且状态码为 200
```

## 4. Google Play Console 发布

### 4.1 创建应用

1. 登录 [Google Play Console](https://play.google.com/console)
2. 点击 **Create app**
3. 填写应用信息：
   - **App name**: Luma AI Companion
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free

### 4.2 配置应用信息

#### App information
- **App name**: Luma AI Companion
- **Short description**: Your AI emotional support companion
- **Full description**: 详细描述应用功能和价值

#### Graphics
- **App icon**: 512x512 PNG (使用 `public/icons/icon-512.png`)
- **Feature graphic**: 1024x500 PNG
- **Screenshots**: 至少2张，建议包含不同屏幕尺寸

### 4.3 上传到内测轨道

1. 前往 **Release** > **Testing** > **Internal testing**
2. 点击 **Create new release**
3. 上传 `app-release.aab` 文件
4. 填写 **Release notes**：
   ```
   Initial release of Luma AI Companion TWA
   - PWA-based Android app
   - Emotional support chat interface
   - Offline capability
   ```

### 4.4 配置测试者

1. 在 **Internal testing** 页面点击 **Testers** 标签
2. 创建测试者列表或添加邮箱地址
3. 保存并获取 **opt-in URL**
4. 分享链接给测试者

## 5. 常见问题排查

### 5.1 PWA 问题

❌ **Lighthouse PWA 评分 < 90**
```bash
# 检查 manifest
curl -s https://luma-3.vercel.app/manifest.json | jq .

# 检查 Service Worker
curl -I https://luma-3.vercel.app/sw.js

# 检查图标文件
curl -I https://luma-3.vercel.app/icons/icon-192.png
curl -I https://luma-3.vercel.app/icons/icon-512.png
curl -I https://luma-3.vercel.app/icons/maskable-512.png
```

❌ **Service Worker 未注册**
- 检查 `vite.config.ts` 中的 VitePWA 配置
- 确保 `registerType: 'autoUpdate'` 正确设置
- 在浏览器 DevTools > Application > Service Workers 中检查状态

### 5.2 TWA 问题

❌ **Digital Asset Links 验证失败**
```bash
# 检查 assetlinks.json 可访问性
curl -v https://luma-3.vercel.app/.well-known/assetlinks.json

# 常见问题：
# - 404: 文件路径错误或未部署
# - CORS: 确保 Vercel 正确配置静态文件
# - JSON 格式错误: 使用 jq 验证语法
curl -s https://luma-3.vercel.app/.well-known/assetlinks.json | jq .
```

❌ **包名不一致**
- 检查 `twa-manifest.json` 中的 package name
- 确保与 Play Console 中的应用包名一致
- 重新运行 `npm run twa:init` 如果配置错误

❌ **域名配置问题**
- www vs 非 www: 确保 manifest.json 中的 start_url 与实际部署域名一致
- HTTPS: TWA 只支持 HTTPS 域名
- 子域名: 确保 assetlinks.json 在正确的域名根目录

### 5.3 Play Console 问题

❌ **AAB 上传失败**
- 文件大小 > 150MB: 检查是否包含不必要的资源
- 签名问题: 确保使用了正确的 keystore
- API Level: 检查 `android/app/build.gradle` 中的 targetSdkVersion

❌ **审核被拒**
- 隐私政策: 确保提供有效的隐私政策链接
- 应用权限: 检查 AndroidManifest.xml 中的权限声明
- 内容评级: 完成内容评级问卷

## 6. 部署检查清单

### 预发布检查

- [ ] PWA Lighthouse 评分 ≥ 90
- [ ] manifest.json 可访问且有效
- [ ] Service Worker 正常工作
- [ ] 图标文件齐全 (192px, 512px, maskable)
- [ ] offline.html 可访问
- [ ] HTTPS 部署完成

### TWA 检查

- [ ] Bubblewrap 初始化完成
- [ ] AAB 文件成功生成
- [ ] Digital Asset Links 配置正确
- [ ] SHA-256 指纹已更新
- [ ] assetlinks.json 返回 200 状态码

### Play Console 检查

- [ ] 应用信息完整
- [ ] 图标和截图已上传
- [ ] AAB 上传到内测轨道
- [ ] 测试者列表配置完成
- [ ] opt-in 链接可正常访问

## 7. 有用的命令和链接

### 开发命令
```bash
# PWA 开发
npm run dev              # 本地开发
npm run pwa:build        # PWA 构建
npm run preview          # 预览构建结果

# TWA 开发
npm run twa:init         # 初始化 TWA
npm run twa:build        # 构建 APK (调试)
npm run twa:bundle       # 构建 AAB (发布)

# Android 开发
npm run android:clean    # 清理构建文件
npm run android:install  # 安装调试版本到设备
```

### 验证工具

- [Lighthouse PWA 审计](https://developers.google.com/web/tools/lighthouse)
- [Digital Asset Links 验证器](https://developers.google.com/digital-asset-links/tools/generator)
- [Manifest 验证器](https://manifest-validator.appspot.com/)
- [PWA Builder](https://www.pwabuilder.com/)

### 官方文档

- [TWA 快速入门](https://developers.google.com/web/android/trusted-web-activity/quick-start)
- [Bubblewrap 文档](https://github.com/GoogleChromeLabs/bubblewrap)
- [Google Play Console 帮助](https://support.google.com/googleplay/android-developer/)
- [PWA 最佳实践](https://web.dev/progressive-web-apps/)

---

如遇到其他问题，请查看 [故障排除指南](https://developers.google.com/web/android/trusted-web-activity/troubleshooting) 或在项目 Issues 中提问。