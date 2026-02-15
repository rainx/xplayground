# 应用分发指南

本文档说明如何分发 xToolbox 应用，包括签名、公证和不同的分发方式。

## 分发方案对比

| 方案 | 成本 | 用户体验 | 适用场景 |
|------|------|----------|----------|
| **Apple 签名 + 公证** | $99/年 | ⭐⭐⭐⭐⭐ 无警告，直接安装 | 公开分发、正式产品 |
| **仅签名（无公证）** | $99/年 | ⭐⭐⭐ 用户需右键打开 | 小范围分发 |
| **自签名** | 免费 | ⭐⭐ 用户需禁用 Gatekeeper | 个人使用、开发测试 |
| **开源方式** | 免费 | ⭐⭐⭐⭐ 用户自行编译或使用 Homebrew | 开源项目 |

## 方案一：正式分发（推荐）

### 前提条件

1. **Apple Developer 账号** ($99/年)
   - 注册地址: https://developer.apple.com/programs/
   - 需要 Apple ID 和支付方式

2. **开发者证书**
   ```bash
   # 在 Keychain Access 中申请证书
   # 1. Keychain Access > Certificate Assistant > Request a Certificate from a Certificate Authority
   # 2. 输入邮箱，选择 "Saved to disk"
   # 3. 上传到 Apple Developer 网站
   # 4. 下载并双击安装证书
   ```

### 步骤 1: 获取证书

登录 [Apple Developer](https://developer.apple.com/account/resources/certificates/list) 创建证书：

1. **Developer ID Application** - 用于签名应用
2. **Developer ID Installer** - 用于签名 PKG（可选）

证书类型说明：
- **Developer ID Application**: 在 App Store 外分发的应用
- **Mac App Distribution**: App Store 内分发的应用（需要额外审核）

### 步骤 2: 配置环境变量

```bash
# 在 ~/.zshrc 或 ~/.bashrc 中添加
export APPLE_ID="your@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"

# 重新加载配置
source ~/.zshrc
```

**获取 App-Specific Password:**
1. 访问 https://appleid.apple.com/account/manage
2. 登录你的 Apple ID
3. Security > App-Specific Passwords > Generate Password
4. 保存生成的密码（格式：xxxx-xxxx-xxxx-xxxx）

**查找 Team ID:**
```bash
# 方法 1: 在 Apple Developer 网站
# 登录后在右上角点击账号 > Membership > Team ID

# 方法 2: 使用命令行
security find-identity -v -p codesigning
# 输出示例：
# 1) 1234567890ABCDEF "Developer ID Application: Your Name (TEAM_ID)"
```

### 步骤 3: 配置签名

更新 `package.json`：

```json
{
  "build": {
    "mac": {
      "identity": "Developer ID Application: Your Name (TEAM_ID)",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "notarize": {
        "teamId": "TEAM_ID"
      }
    }
  }
}
```

### 步骤 4: 构建和签名

```bash
# 方法 1: 使用环境变量（推荐）
export CSC_NAME="Developer ID Application: Your Name (TEAM_ID)"
pnpm package

# 方法 2: 使用 electron-builder 配置
# 已在 package.json 中配置，直接运行
pnpm package
```

### 步骤 5: 公证（Notarization）

electron-builder 会自动处理公证流程（如果配置了 `notarize`）。手动公证：

```bash
# 提交公证
xcrun notarytool submit dist/xToolbox-0.1.0-mac-x64.dmg \
  --apple-id "your@email.com" \
  --password "xxxx-xxxx-xxxx-xxxx" \
  --team-id "TEAM_ID" \
  --wait

# 查看公证状态
xcrun notarytool log <submission-id> \
  --apple-id "your@email.com" \
  --password "xxxx-xxxx-xxxx-xxxx" \
  --team-id "TEAM_ID"

# 装订公证票据到 DMG（electron-builder 自动完成）
xcrun stapler staple dist/xToolbox-0.1.0-mac-x64.dmg

# 验证
spctl -a -vvv -t install dist/xToolbox-0.1.0-mac-x64.dmg
# 应显示: accepted
```

### 步骤 6: 分发

签名并公证后，可以通过以下方式分发：

1. **GitHub Releases**
   ```bash
   gh release create v0.1.0 \
     dist/xToolbox-0.1.0-mac-x64.dmg \
     dist/xToolbox-0.1.0-mac-arm64.dmg \
     --title "xToolbox v0.1.0" \
     --notes "Release notes here"
   ```

2. **自建下载服务器**
   - 上传 DMG 到服务器
   - 提供 HTTPS 下载链接

3. **自动更新**（可选）
   - 使用 electron-updater
   - 配置更新服务器（如 GitHub Releases）

## 方案二：自签名分发（免费）

如果没有 Apple Developer 账号，可以使用自签名证书。

### 创建自签名证书

```bash
# 使用 Keychain Access 创建证书
# 1. Keychain Access > Certificate Assistant > Create a Certificate
# 2. Name: "xToolbox Certificate"
# 3. Identity Type: Self Signed Root
# 4. Certificate Type: Code Signing
# 5. 点击 Create

# 或使用命令行
security create-keychain -p "" build.keychain
security unlock-keychain -p "" build.keychain
security set-keychain-settings build.keychain

# 生成自签名证书
security import cert.p12 -k build.keychain -P "" -T /usr/bin/codesign
```

### 使用自签名证书打包

```bash
# 禁用自动发现证书
export CSC_IDENTITY_AUTO_DISCOVERY=false

# 指定自签名证书
export CSC_NAME="xToolbox Certificate"

# 打包
pnpm package
```

### 用户安装步骤

用户下载后需要执行以下步骤：

```bash
# 方法 1: 右键打开
# 1. 右键点击应用
# 2. 选择 "打开"
# 3. 点击 "打开" 确认

# 方法 2: 移除隔离属性
xattr -cr /Applications/xToolbox.app

# 方法 3: 允许任何来源（不推荐）
sudo spctl --master-disable
```

### 提供安装脚本

创建 `install.sh` 方便用户安装：

```bash
#!/bin/bash
set -e

echo "Installing xToolbox..."

# 移除隔离属性
xattr -cr xToolbox.app

# 移动到 Applications
cp -r xToolbox.app /Applications/

echo "✅ xToolbox installed to /Applications"
echo "You can now open xToolbox from Launchpad or Applications folder"
```

## 方案三：开源分发（免费 + 最佳用户体验）

### Homebrew Cask

这是开源 macOS 应用最流行的分发方式。

#### 步骤 1: 准备发布

```bash
# 1. 打包未签名版本
export CSC_IDENTITY_AUTO_DISCOVERY=false
pnpm package

# 2. 上传到 GitHub Releases
gh release create v0.1.0 \
  dist/xToolbox-0.1.0-mac-x64.zip \
  dist/xToolbox-0.1.0-mac-arm64.zip

# 3. 计算 SHA256
shasum -a 256 dist/xToolbox-0.1.0-mac-x64.zip
shasum -a 256 dist/xToolbox-0.1.0-mac-arm64.zip
```

#### 步骤 2: 创建 Homebrew Cask

Fork https://github.com/Homebrew/homebrew-cask 然后创建 Cask 文件：

```ruby
# Casks/xtoolbox.rb
cask "xtoolbox" do
  version "0.1.0"

  if Hardware::CPU.intel?
    sha256 "计算出的 x64 SHA256"
    url "https://github.com/rainx/xplayground/releases/download/v#{version}/xToolbox-#{version}-mac-x64.zip"
  else
    sha256 "计算出的 arm64 SHA256"
    url "https://github.com/rainx/xplayground/releases/download/v#{version}/xToolbox-#{version}-mac-arm64.zip"
  end

  name "xToolbox"
  desc "Personal Mac toolbox - clone useful features from paid apps"
  homepage "https://github.com/rainx/xplayground"

  app "xToolbox.app"

  zap trash: [
    "~/Library/Application Support/xtoolbox",
    "~/Library/Preferences/com.rainx.xtoolbox.plist",
  ]
end
```

#### 步骤 3: 提交 PR

```bash
# Fork homebrew-cask 后
git clone https://github.com/YOUR_USERNAME/homebrew-cask
cd homebrew-cask
git checkout -b add-xtoolbox

# 添加 Cask 文件
cp xtoolbox.rb Casks/xtoolbox.rb

# 测试
brew install --cask xtoolbox --force

# 提交
git add Casks/xtoolbox.rb
git commit -m "Add xToolbox v0.1.0"
git push origin add-xtoolbox

# 在 GitHub 上创建 PR
```

用户安装：
```bash
brew install --cask xtoolbox
```

### 自建 Homebrew Tap（更灵活）

如果不想提交到官方 Homebrew，可以创建自己的 Tap：

```bash
# 1. 创建 GitHub 仓库: homebrew-tap

# 2. 创建 Cask 文件
mkdir -p Casks
cat > Casks/xtoolbox.rb << 'EOF'
cask "xtoolbox" do
  version "0.1.0"
  # ... (同上)
end
EOF

# 3. 推送到 GitHub
git add .
git commit -m "Add xToolbox cask"
git push
```

用户安装：
```bash
brew tap rainx/tap
brew install --cask xtoolbox
```

## 方案四：直接分发（最简单，免费）

### ZIP 直接下载

1. **打包为 ZIP**
   ```bash
   export CSC_IDENTITY_AUTO_DISCOVERY=false
   pnpm package

   # 或手动创建 ZIP
   cd dist/mac
   zip -r xToolbox-0.1.0-mac.zip xToolbox.app
   ```

2. **提供安装说明**

   创建 `README.txt` 放在 ZIP 中：
   ```
   xToolbox v0.1.0 安装说明
   ========================

   1. 解压 ZIP 文件
   2. 将 xToolbox.app 拖到 Applications 文件夹
   3. 首次打开时，右键点击 xToolbox.app，选择"打开"
   4. 或者在终端执行: xattr -cr /Applications/xToolbox.app

   如有问题，请访问: https://github.com/rainx/xplayground/issues
   ```

3. **上传到 GitHub Releases**
   ```bash
   gh release create v0.1.0 \
     dist/xToolbox-0.1.0-mac-x64.zip \
     --title "xToolbox v0.1.0" \
     --notes "$(cat CHANGELOG.md)"
   ```

## 自动化发布流程

创建 GitHub Actions 自动化构建和发布：

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: macos-latest

    steps:
      - uses: actions/checkout@v4

      - name: Install proto
        run: curl -fsSL https://moonrepo.dev/install/proto.sh | bash

      - name: Setup tools
        run: proto use

      - name: Install dependencies
        run: pnpm install

      - name: Build and package
        env:
          # 如果有 Apple Developer 账号，在 GitHub Secrets 中配置
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          CSC_LINK: ${{ secrets.CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
        run: |
          # 如果没有签名证书，禁用自动发现
          if [ -z "$CSC_LINK" ]; then
            export CSC_IDENTITY_AUTO_DISCOVERY=false
          fi
          pnpm package

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            dist/*.dmg
            dist/*.zip
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 更新和版本管理

### 语义化版本控制

```bash
# 更新版本号
npm version patch   # 0.1.0 -> 0.1.1 (bug 修复)
npm version minor   # 0.1.0 -> 0.2.0 (新功能)
npm version major   # 0.1.0 -> 1.0.0 (破坏性更新)

# 同步 native 模块版本
cd native && npm version <version> && cd ..

# 创建 tag 并推送
git push --follow-tags
```

### 应用内自动更新

使用 `electron-updater` 配置自动更新：

```typescript
// src/main/updater.ts
import { autoUpdater } from 'electron-updater'

autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'rainx',
  repo: 'xplayground'
})

autoUpdater.checkForUpdatesAndNotify()
```

在 `package.json` 中添加：
```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "rainx",
      "repo": "xplayground"
    }
  }
}
```

## 推荐方案总结

### 个人使用或内部分发
→ **方案二（自签名）**
- 成本：免费
- 用户需要右键打开或运行脚本

### 小范围分发给技术用户
→ **方案三（Homebrew）**
- 成本：免费
- 用户体验好（`brew install`）
- 适合开源项目

### 正式产品或大规模公开分发
→ **方案一（Apple 签名 + 公证）**
- 成本：$99/年
- 最佳用户体验
- 支持自动更新

## 常见问题

### Q: 签名后仍然提示"无法验证开发者"？
A: 确保已完成公证（notarization）流程。

### Q: 如何在 CI/CD 中使用签名证书？
A: 导出证书为 base64：
```bash
# 导出证书
security find-identity -v -p codesigning
security export -t identities -f p12 -o cert.p12 -P ""

# 转换为 base64
base64 cert.p12 > cert.base64

# 在 GitHub Secrets 中设置 CSC_LINK
# 内容为 cert.base64 的内容
```

### Q: 能否同时支持 Intel 和 Apple Silicon？
A: 可以，使用 `pnpm dist:all` 构建通用版本，或分别构建两个版本。

### Q: Homebrew 审核需要多久？
A: 通常 1-7 天，取决于 PR 质量和维护者响应速度。

## 资源链接

- [Apple Developer Program](https://developer.apple.com/programs/)
- [electron-builder 签名文档](https://www.electron.build/code-signing)
- [Homebrew Cask 文档](https://docs.brew.sh/Cask-Cookbook)
- [Notarization 指南](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
