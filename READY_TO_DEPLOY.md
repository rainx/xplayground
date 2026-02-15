# ✅ 准备就绪 - 立即部署

所有文件已打包完成，现在就可以开始分发！

## 📦 分发包状态

| 文件 | 大小 | 用途 | 状态 |
|------|------|------|------|
| xToolbox-0.1.0-mac-x64.dmg | 115MB | Intel Mac 安装包 | ✅ 已就绪 |
| xToolbox-0.1.0-mac-arm64.dmg | 110MB | Apple Silicon 安装包 | ✅ 已就绪 |
| xToolbox-0.1.0-mac-x64.zip | 111MB | Intel Mac ZIP | ✅ 已就绪 |
| xToolbox-0.1.0-mac-arm64.zip | 106MB | Apple Silicon ZIP | ✅ 已就绪 |
| xToolbox-0.1.0-installer-x64.zip | 337MB | 带安装脚本完整包 | ✅ 已就绪 |

**Homebrew Cask**: ✅ 已创建，SHA256 已配置

---

## 🚀 开始部署（复制粘贴即可）

### 1️⃣ 创建 GitHub Release

```bash
gh release create v0.1.0 \
  dist/xToolbox-0.1.0-mac-x64.dmg \
  dist/xToolbox-0.1.0-mac-arm64.dmg \
  dist/xToolbox-0.1.0-mac-x64.zip \
  dist/xToolbox-0.1.0-mac-arm64.zip \
  --title "xToolbox v0.1.0 - 首个公开版本" \
  --notes "## 🎉 xToolbox v0.1.0

首个公开版本，包含实用工具：

### ✨ 功能特性
- **剪贴板管理器** - 快捷键 \`Alt+Cmd+V\`
  - 记录剪贴板历史（文本、图片、文件）
  - 分类管理和搜索
  - 键盘快速导航

- **截图美化工具** - 快捷键 \`Alt+Cmd+A\`
  - 添加阴影和圆角效果
  - 自定义背景和边距
  - 导出优化的截图

### 📦 安装方法

#### Homebrew（推荐）
\`\`\`bash
brew install --cask rainx/tap/xtoolbox
\`\`\`

#### 直接下载
1. 下载对应架构的 DMG：
   - **Intel Mac**: \`xToolbox-0.1.0-mac-x64.dmg\`
   - **Apple Silicon**: \`xToolbox-0.1.0-mac-arm64.dmg\`
2. 双击打开 DMG
3. 拖动到 Applications 文件夹
4. 右键点击应用，选择「打开」

### 🛠️ 首次使用
1. 授予必要权限（系统偏好设置 > 安全性与隐私）
   - 辅助功能
   - 屏幕录制
2. 使用全局快捷键即可调用功能

### 📝 常见问题

**Q: 为什么显示"无法验证开发者"？**
A: 这是未签名应用的安全提示。右键点击应用选择「打开」即可。

**Q: Homebrew 安装后快捷键不工作？**
A: 需要在系统偏好设置中授予辅助功能权限。

### 🐛 问题反馈
https://github.com/rainx/xplayground/issues

### 📄 许可证
MIT License

---

感谢使用 xToolbox！"
```

**或者手动创建：**
1. 访问 https://github.com/rainx/xplayground/releases/new
2. Tag: `v0.1.0`
3. 上传 `dist/` 目录下的 DMG 和 ZIP 文件

---

### 2️⃣ 部署 Homebrew Tap

在 GitHub 创建新仓库：

- 仓库名：`homebrew-tap`（必须是这个名字）
- 可见性：Public
- 不要添加 README（我们已经创建了）

然后执行：

```bash
cd homebrew-tap
git init
git add .
git commit -m "feat: add xToolbox cask v0.1.0

- Support both x64 and arm64 architectures
- Auto-detect CPU architecture
- Post-install script removes quarantine attribute
- SHA256 checksums included"

git branch -M main
git remote add origin https://github.com/rainx/homebrew-tap.git
git push -u origin main
```

---

### 3️⃣ 测试安装

```bash
# 添加 tap
brew tap rainx/tap

# 安装
brew install --cask xtoolbox

# 验证
open /Applications/xToolbox.app

# 测试完成后可以卸载
brew uninstall --cask xtoolbox
```

---

## ✅ 完成检查

部署完成后确认：

- [ ] GitHub Release 已创建
- [ ] 4-5 个文件已上传
- [ ] homebrew-tap 仓库已创建并推送
- [ ] `brew tap rainx/tap` 可以成功
- [ ] `brew install --cask xtoolbox` 可以安装
- [ ] 应用可以正常启动

---

## 📢 宣传（可选）

部署完成后可以分享：

**社交媒体文案：**

```
🎉 开源项目发布：xToolbox v0.1.0

免费的 macOS 工具箱，集成了实用功能：
✨ 剪贴板管理器 (Alt+Cmd+V)
✨ 截图美化工具 (Alt+Cmd+A)

一键安装：
brew install --cask rainx/tap/xtoolbox

GitHub: https://github.com/rainx/xplayground

#macOS #OpenSource #Productivity
```

**可以发布到：**
- Twitter/X
- Reddit: r/macapps, r/opensource
- V2EX: macOS 节点
- Hacker News (Show HN)
- Product Hunt

---

## 🔄 下次更新

使用自动化脚本：

```bash
# 准备新版本
./scripts/prepare-release.sh 0.1.1

# 推送 tag（GitHub Actions 自动构建）
git push --follow-tags

# 或手动构建
export CSC_IDENTITY_AUTO_DISCOVERY=false
pnpm package

# 创建 Release
gh release create v0.1.1 dist/*.{dmg,zip}

# 更新 Homebrew Cask
cd homebrew-tap
# 编辑 Casks/xtoolbox.rb：更新 version 和 sha256
git add Casks/xtoolbox.rb
git commit -m "Update xToolbox to v0.1.1"
git push
```

---

## 📚 相关文档

- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - 详细的部署步骤
- **[DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)** - 完整部署指南
- **[DISTRIBUTION.md](DISTRIBUTION.md)** - 分发策略文档

---

## 🎯 现在就开始

复制上面的命令，按顺序执行即可！

预计耗时：**10 分钟**

祝部署顺利！🚀
