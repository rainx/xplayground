# 🚀 部署检查清单

按顺序执行以下步骤，快速完成方案 A 和方案 B 的部署。

## 前置准备 ✅

- [x] 已构建分发包（dist/ 目录）
- [x] 已创建 Homebrew Cask（homebrew-tap/）
- [x] 已计算 SHA256 校验和
- [x] 已创建安装脚本和说明

## 第一步：创建 GitHub Release（方案 A + B 都需要）

### 1.1 确认文件准备就绪

```bash
# 查看分发文件
ls -lh dist/*.{dmg,zip}
```

应该看到：
- ✅ xToolbox-0.1.0-mac-x64.dmg (115MB)
- ✅ xToolbox-0.1.0-mac-arm64.dmg (110MB)
- ✅ xToolbox-0.1.0-mac-x64.zip (111MB)
- ✅ xToolbox-0.1.0-mac-arm64.zip (106MB)

### 1.2 创建 Release

**选项 A：使用 gh CLI（推荐）**

```bash
gh release create v0.1.0 \
  dist/xToolbox-0.1.0-mac-x64.dmg \
  dist/xToolbox-0.1.0-mac-arm64.dmg \
  dist/xToolbox-0.1.0-mac-x64.zip \
  dist/xToolbox-0.1.0-mac-arm64.zip \
  --title "xToolbox v0.1.0" \
  --notes "## xToolbox v0.1.0 首发版本

### 功能特性
- ✨ 剪贴板管理器 - 快捷键 Alt+Cmd+V
- ✨ 截图美化工具 - 快捷键 Alt+Cmd+A

### 安装方法

#### Homebrew（推荐）
\`\`\`bash
brew install --cask rainx/tap/xtoolbox
\`\`\`

#### 直接下载
1. 下载对应架构的文件：
   - Intel Mac：xToolbox-0.1.0-mac-x64.dmg
   - Apple Silicon：xToolbox-0.1.0-mac-arm64.dmg
2. 双击打开 DMG
3. 拖动到 Applications 文件夹
4. 右键点击应用，选择「打开」

### 首次使用
1. 授予必要权限（辅助功能、屏幕录制）
2. 使用快捷键即可快速调用功能

问题反馈：https://github.com/rainx/xplayground/issues"
```

**选项 B：手动创建**

1. 访问：https://github.com/rainx/xplayground/releases/new
2. Tag: `v0.1.0`
3. Title: `xToolbox v0.1.0`
4. 上传文件（从 dist/ 目录）
5. 填写 Release Notes（使用上面的内容）
6. 发布

### 1.3 验证 Release

```bash
# 检查 Release 是否创建成功
gh release view v0.1.0

# 访问链接验证
open https://github.com/rainx/xplayground/releases/latest
```

**检查点：**
- [ ] Release 已创建
- [ ] 所有文件已上传
- [ ] 下载链接可访问

---

## 第二步：部署 Homebrew Tap（方案 B）

### 2.1 创建 GitHub 仓库

1. 访问：https://github.com/new
2. 仓库名：`homebrew-tap`（必须是这个名字）
3. 描述：`Homebrew tap for xToolbox`
4. Public（必须公开）
5. 不要添加 README（我们已经创建了）
6. 创建仓库

### 2.2 推送 Homebrew Tap

```bash
cd homebrew-tap

# 初始化 git
git init
git add .
git commit -m "feat: add xToolbox cask v0.1.0"

# 添加远程仓库（替换成你的用户名）
git remote add origin https://github.com/rainx/homebrew-tap.git

# 推送
git branch -M main
git push -u origin main
```

### 2.3 验证 Homebrew 安装

```bash
# 测试 tap 添加
brew tap rainx/tap

# 测试安装（可选，会真实安装）
brew install --cask xtoolbox

# 验证
ls -la /Applications/xToolbox.app

# 卸载测试
brew uninstall --cask xtoolbox
```

**检查点：**
- [ ] homebrew-tap 仓库已创建并推送
- [ ] `brew tap rainx/tap` 可以成功执行
- [ ] Cask 文件格式正确

---

## 第三步：更新主项目 README

在主项目的 README.md 添加安装说明：

```bash
cd /Users/rainx/OpenSourceProjects/xplayground
```

在 README.md 添加以下内容：

````markdown
## 安装

### 方式 1：Homebrew（推荐）

```bash
brew install --cask rainx/tap/xtoolbox
```

### 方式 2：直接下载

访问 [Releases 页面](https://github.com/rainx/xplayground/releases/latest) 下载最新版本：

- Intel Mac：下载 `xToolbox-*-mac-x64.dmg`
- Apple Silicon：下载 `xToolbox-*-mac-arm64.dmg`

下载后：
1. 双击打开 DMG
2. 拖动到 Applications 文件夹
3. 右键点击应用，选择"打开"

## 功能特性

- **剪贴板管理器** (`Alt+Cmd+V`) - 记录剪贴板历史，支持文本、图片、文件
- **截图美化工具** (`Alt+Cmd+A`) - 为截图添加阴影和圆角效果

## 卸载

### Homebrew
```bash
# 仅卸载应用
brew uninstall --cask xtoolbox

# 彻底删除（包括配置文件）
brew uninstall --cask --zap xtoolbox
```

### 手动卸载
```bash
rm -rf /Applications/xToolbox.app
rm -rf ~/Library/Application\ Support/xtoolbox
rm -rf ~/Library/Preferences/com.rainx.xtoolbox.plist
```
````

提交更改：

```bash
git add README.md
git commit -m "docs: add installation instructions for v0.1.0"
git push
```

**检查点：**
- [ ] README.md 已更新
- [ ] 安装说明清晰
- [ ] 链接正确

---

## 第四步：测试完整流程

### 4.1 测试方案 A（直接下载）

```bash
# 模拟用户下载
cd /tmp
curl -LO https://github.com/rainx/xplayground/releases/download/v0.1.0/xToolbox-0.1.0-mac-x64.dmg

# 挂载 DMG
open xToolbox-0.1.0-mac-x64.dmg

# 验证可以拖动到 Applications
# 清理
hdiutil detach /Volumes/xToolbox*
rm xToolbox-0.1.0-mac-x64.dmg
```

### 4.2 测试方案 B（Homebrew）

```bash
# 如果之前已经 tap，先移除
brew untap rainx/tap

# 重新添加
brew tap rainx/tap

# 安装
brew install --cask xtoolbox

# 启动验证
open /Applications/xToolbox.app

# 清理（可选）
brew uninstall --cask xtoolbox
```

**检查点：**
- [ ] DMG 可以下载并打开
- [ ] Homebrew 可以成功安装
- [ ] 应用可以正常启动
- [ ] 快捷键工作正常

---

## 第五步：宣传和分享（可选）

现在可以分享你的项目了！

### 社交媒体

```markdown
🎉 xToolbox v0.1.0 发布！

一个免费开源的 Mac 工具箱，集成了实用功能：
✨ 剪贴板管理器
✨ 截图美化工具

安装超简单：
brew install --cask rainx/tap/xtoolbox

GitHub: https://github.com/rainx/xplayground

#macOS #OpenSource #Productivity
```

### 可以分享的地方

- [ ] Twitter/X
- [ ] Reddit (r/macapps, r/opensource)
- [ ] V2EX
- [ ] Hacker News (Show HN)
- [ ] Product Hunt
- [ ] GitHub Discussions

---

## 完成检查清单

最终确认所有步骤都已完成：

- [ ] ✅ GitHub Release 已创建（方案 A）
- [ ] ✅ 文件已上传到 Release
- [ ] ✅ homebrew-tap 仓库已创建（方案 B）
- [ ] ✅ Cask 文件已推送
- [ ] ✅ README.md 已更新安装说明
- [ ] ✅ 测试了直接下载安装
- [ ] ✅ 测试了 Homebrew 安装
- [ ] ✅ 应用可以正常运行

---

## 🎉 恭喜！

你已经成功部署了方案 A 和方案 B！

现在用户可以通过以下方式安装：

**Homebrew（推荐）:**
```bash
brew install --cask rainx/tap/xtoolbox
```

**直接下载:**
https://github.com/rainx/xplayground/releases/latest

---

## 下次更新时

使用 `./scripts/prepare-release.sh` 自动化版本更新：

```bash
# 准备新版本
./scripts/prepare-release.sh 0.1.1

# 推送（自动构建）
git push --follow-tags

# 更新 Homebrew Cask
cd homebrew-tap
# 修改 version 和 sha256
git add Casks/xtoolbox.rb
git commit -m "Update to v0.1.1"
git push
```

详见 [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)。
