# 部署指南 - 方案 A & B

本指南将帮助你完成**方案 A（快速分发）**和**方案 B（Homebrew）**的实际部署。

## ✅ 已完成的准备工作

我已经帮你完成了以下准备：

1. **构建了分发包**
   - ✅ `dist/xToolbox-0.1.0-mac-x64.dmg` (115MB) - Intel Mac DMG
   - ✅ `dist/xToolbox-0.1.0-mac-arm64.dmg` (110MB) - Apple Silicon DMG
   - ✅ `dist/xToolbox-0.1.0-mac-x64.zip` (116MB) - Intel Mac ZIP
   - ✅ `dist/xToolbox-0.1.0-mac-arm64.zip` (111MB) - Apple Silicon ZIP
   - ✅ `dist/xToolbox-0.1.0-installer-x64.zip` (337MB) - 带安装脚本的完整包

2. **创建了 Homebrew Cask**
   - ✅ `homebrew-tap/Casks/xtoolbox.rb` - Homebrew Cask 定义
   - ✅ `homebrew-tap/README.md` - Tap 使用说明
   - ✅ 已计算 SHA256 校验和

3. **准备了安装说明**
   - ✅ `dist/README.txt` - 用户安装指南
   - ✅ `scripts/install.sh` - 自动安装脚本

---

## 📦 方案 A: 快速分发（适合个人分享）

### 步骤 1: 上传到 GitHub Releases

```bash
# 方法 1: 使用 gh CLI（推荐）
gh release create v0.1.0 \
  dist/xToolbox-0.1.0-mac-x64.dmg \
  dist/xToolbox-0.1.0-mac-arm64.dmg \
  dist/xToolbox-0.1.0-mac-x64.zip \
  dist/xToolbox-0.1.0-mac-arm64.zip \
  dist/xToolbox-0.1.0-installer-x64.zip \
  --title "xToolbox v0.1.0" \
  --notes "首个公开版本

## 功能特性
- 剪贴板管理器 (Alt+Cmd+V)
- 截图美化工具 (Alt+Cmd+A)

## 安装方法
### 方式 1: 直接下载 DMG（推荐）
1. 下载对应架构的 DMG 文件
2. 双击打开，拖动到 Applications
3. 右键点击应用选择\"打开\"

### 方式 2: 使用安装脚本
1. 下载 \`xToolbox-0.1.0-installer-x64.zip\`
2. 解压后运行 \`./install.sh\`

详细说明见 [README.txt](https://github.com/rainx/xplayground/releases/download/v0.1.0/xToolbox-0.1.0-installer-x64.zip)"

# 方法 2: 手动上传
# 访问 https://github.com/rainx/xplayground/releases/new
# 创建 tag: v0.1.0
# 上传 dist 目录下的文件
```

### 步骤 2: 分享给用户

创建发布后，用户可以：

**下载 DMG（最简单）:**
```
1. 访问 https://github.com/rainx/xplayground/releases/latest
2. 下载对应架构的 DMG
3. 双击打开，拖到 Applications
4. 右键点击应用 > 打开
```

**使用安装脚本:**
```bash
# 用户下载 installer ZIP 后
unzip xToolbox-0.1.0-installer-x64.zip
cd xToolbox-0.1.0-installer-x64
./install.sh
```

### 测试方案 A

在发布前，可以先测试：

```bash
# 1. 本地测试 installer
cd dist
unzip xToolbox-0.1.0-installer-x64.zip
./install.sh

# 2. 验证应用可以打开
open /Applications/xToolbox.app

# 3. 如果一切正常，删除测试安装
rm -rf /Applications/xToolbox.app
```

---

## 🍺 方案 B: Homebrew（适合开源项目）

### 步骤 1: 创建 GitHub 仓库

```bash
# 在 GitHub 上创建新仓库: homebrew-tap
# 仓库名必须是 homebrew-开头

# 然后在本地
cd homebrew-tap
git init
git add .
git commit -m "Add xToolbox cask"
git branch -M main
git remote add origin https://github.com/rainx/homebrew-tap.git
git push -u origin main
```

### 步骤 2: 发布到 GitHub Releases（必须先做这一步）

```bash
# Homebrew 需要从 GitHub Releases 下载，所以必须先创建 release
gh release create v0.1.0 \
  dist/xToolbox-0.1.0-mac-x64.zip \
  dist/xToolbox-0.1.0-mac-arm64.zip \
  --title "xToolbox v0.1.0"
```

### 步骤 3: 用户安装

发布后，用户可以这样安装：

```bash
# 添加你的 tap
brew tap rainx/tap

# 安装
brew install --cask xtoolbox

# 或一行命令
brew install --cask rainx/tap/xtoolbox
```

### 步骤 4: 更新版本（未来）

当你发布新版本时：

```bash
# 1. 更新 Cask 文件
cd homebrew-tap/Casks

# 2. 修改 xtoolbox.rb
# - 更新 version
# - 更新 sha256（运行 shasum -a 256 新文件）

# 3. 提交并推送
git add Casks/xtoolbox.rb
git commit -m "Update xToolbox to v0.1.1"
git push

# 4. 用户更新
brew upgrade --cask xtoolbox
```

### 测试方案 B

在推送前本地测试：

```bash
# 1. 安装本地 Cask
brew install --cask homebrew-tap/Casks/xtoolbox.rb

# 2. 验证
ls -la /Applications/xToolbox.app

# 3. 测试卸载
brew uninstall --cask xtoolbox
```

---

## 🎯 推荐部署流程

建议**同时使用方案 A 和 B**：

```bash
# 步骤 1: 发布到 GitHub Releases（方案 A）
gh release create v0.1.0 \
  dist/xToolbox-0.1.0-mac-x64.dmg \
  dist/xToolbox-0.1.0-mac-arm64.dmg \
  dist/xToolbox-0.1.0-mac-x64.zip \
  dist/xToolbox-0.1.0-mac-arm64.zip \
  --title "xToolbox v0.1.0"

# 步骤 2: 创建 Homebrew Tap（方案 B）
cd homebrew-tap
git init
git add .
git commit -m "Add xToolbox cask v0.1.0"
git remote add origin https://github.com/rainx/homebrew-tap.git
git push -u origin main

# 步骤 3: 更新主项目 README
# 添加安装说明
```

然后在主项目的 README.md 中添加：

```markdown
## 安装

### Homebrew（推荐）
\`\`\`bash
brew install --cask rainx/tap/xtoolbox
\`\`\`

### 直接下载
访问 [Releases 页面](https://github.com/rainx/xplayground/releases/latest)下载最新版本。
\`\`\`

---

## 📊 部署检查清单

部署前确认：

- [ ] 已测试本地打包的应用可以运行
- [ ] 已创建 GitHub Release
- [ ] DMG/ZIP 文件已上传
- [ ] SHA256 已更新到 Cask 文件
- [ ] 创建了 homebrew-tap 仓库
- [ ] 本地测试过 Homebrew 安装
- [ ] 更新了主项目 README 的安装说明

---

## 🔄 更新版本流程

未来发布新版本时：

```bash
# 1. 使用准备脚本
./scripts/prepare-release.sh 0.1.1

# 2. 推送 tag（自动构建）
git push --follow-tags

# 3. 手动构建（可选）
export CSC_IDENTITY_AUTO_DISCOVERY=false
pnpm package

# 4. 创建 Release
gh release create v0.1.1 \
  dist/xToolbox-0.1.1-mac-x64.zip \
  dist/xToolbox-0.1.1-mac-arm64.zip

# 5. 更新 Homebrew Cask
cd homebrew-tap
# 修改 Casks/xtoolbox.rb 的 version 和 sha256
git add Casks/xtoolbox.rb
git commit -m "Update xToolbox to v0.1.1"
git push
```

---

## 💡 提示

### 减小分发包大小

如果觉得 DMG 太大（110-115MB），可以：

1. **仅分发 ZIP**（稍小一些）
2. **使用 Homebrew**（用户按需下载）
3. **优化构建**（未来考虑）:
   - 移除未使用的 Electron 组件
   - 压缩资源文件
   - 使用 ASAR 加密

### 用户反馈

添加遥测或反馈渠道：

```markdown
## 问题反馈

遇到问题？欢迎在 [GitHub Issues](https://github.com/rainx/xplayground/issues) 反馈。
```

### 宣传渠道

发布后可以在以下地方分享：

- [ ] GitHub Discussions
- [ ] Twitter/X
- [ ] Reddit (r/macapps)
- [ ] Product Hunt
- [ ] Hacker News (Show HN)
- [ ] V2EX

---

## 📞 需要帮助？

如果在部署过程中遇到问题：

1. 检查 [DISTRIBUTION.md](DISTRIBUTION.md) 完整指南
2. 查看 [BUILD.md](BUILD.md) 构建文档
3. 参考 [scripts/README.md](scripts/README.md)
4. 在 GitHub Issues 提问

祝发布顺利！🎉
