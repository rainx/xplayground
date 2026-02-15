# 分发脚本

这个目录包含用于应用分发的辅助脚本。

## 脚本说明

### prepare-release.sh

准备新版本发布，自动化版本更新和 tag 创建。

```bash
./scripts/prepare-release.sh 0.1.1
```

功能：
1. 检查工作区是否干净
2. 更新 package.json 版本号
3. 运行测试（typecheck + lint + test）
4. 构建应用
5. 提交版本更新
6. 创建 git tag

### install.sh

用户安装脚本，用于未签名的 DMG/ZIP 分发。

```bash
# 解压 ZIP 后
cd xToolbox
./install.sh
```

功能：
1. 移除 macOS 隔离属性
2. 复制应用到 /Applications
3. 显示使用说明

**在分发时包含此脚本：**
```bash
# 创建包含安装脚本的 ZIP
cp scripts/install.sh dist/mac/
cd dist/mac
zip -r ../xToolbox-0.1.0-mac-with-installer.zip xToolbox.app install.sh
```

### notarize.sh

Apple 公证脚本，用于已签名的应用。

```bash
# 设置环境变量
export APPLE_ID="your@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"

# 公证 DMG
./scripts/notarize.sh dist/xToolbox-0.1.0-mac-x64.dmg
```

功能：
1. 提交到 Apple 公证服务
2. 等待公证完成
3. 装订公证票据到 DMG
4. 验证公证状态

## 完整发布流程

### 方式 1: 自动发布（推荐）

使用 GitHub Actions 自动化：

```bash
# 1. 准备发布
./scripts/prepare-release.sh 0.1.1

# 2. 推送到 GitHub
git push --follow-tags

# 3. GitHub Actions 自动构建并创建 Release
# 访问 https://github.com/rainx/xplayground/releases
```

### 方式 2: 手动发布

```bash
# 1. 准备发布
./scripts/prepare-release.sh 0.1.1

# 2. 本地构建（未签名）
export CSC_IDENTITY_AUTO_DISCOVERY=false
pnpm package

# 3. 创建带安装脚本的 ZIP
cp scripts/install.sh dist/mac/
cd dist/mac
zip -r ../xToolbox-0.1.0-with-installer.zip xToolbox.app install.sh
cd ../..

# 4. 推送 tag
git push --follow-tags

# 5. 创建 GitHub Release
gh release create v0.1.1 \
  dist/xToolbox-0.1.0-mac-x64.dmg \
  dist/xToolbox-0.1.0-with-installer.zip \
  --title "xToolbox v0.1.1" \
  --notes "Release notes here"
```

### 方式 3: 签名 + 公证发布

```bash
# 1. 准备发布
./scripts/prepare-release.sh 0.1.1

# 2. 配置签名环境
export APPLE_ID="your@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
export CSC_NAME="Developer ID Application: Your Name (TEAM_ID)"

# 3. 构建并签名
pnpm package

# 4. 公证（electron-builder 可能已自动完成）
./scripts/notarize.sh dist/xToolbox-0.1.0-mac-x64.dmg

# 5. 创建 Release
gh release create v0.1.1 \
  dist/xToolbox-0.1.0-mac-x64.dmg \
  dist/xToolbox-0.1.0-mac-arm64.dmg \
  --title "xToolbox v0.1.1" \
  --notes "Release notes here"
```

## 配置 GitHub Secrets（签名）

如果要在 GitHub Actions 中使用签名，配置以下 Secrets：

1. 访问 GitHub 仓库 Settings > Secrets and variables > Actions

2. 添加 Secrets：

   - `APPLE_ID`: 你的 Apple ID 邮箱
   - `APPLE_APP_SPECIFIC_PASSWORD`: App-Specific Password
   - `APPLE_TEAM_ID`: Apple Developer Team ID
   - `CSC_LINK`: 证书的 base64 编码
   - `CSC_KEY_PASSWORD`: 证书密码（如果有）

3. 导出证书为 base64：
   ```bash
   # 导出证书
   security find-identity -v -p codesigning
   security export -t identities -f p12 -o cert.p12 -P "证书密码"

   # 转换为 base64
   base64 -i cert.p12 -o cert.base64

   # 复制内容到 CSC_LINK
   cat cert.base64
   ```

4. 在 `.github/workflows/release.yml` 中取消注释签名相关的环境变量。

## 故障排除

### 用户报告"应用已损坏"

原因：macOS Gatekeeper 隔离了未签名的应用。

解决方案：
1. 提供 `install.sh` 脚本
2. 或在分发说明中添加：
   ```bash
   xattr -cr /Applications/xToolbox.app
   ```

### 公证失败

1. 查看详细日志：
   ```bash
   xcrun notarytool log <submission-id> \
     --apple-id "$APPLE_ID" \
     --password "$APPLE_APP_SPECIFIC_PASSWORD" \
     --team-id "$APPLE_TEAM_ID"
   ```

2. 常见问题：
   - 缺少 entitlements
   - 使用了私有 API
   - 未启用 hardened runtime

### GitHub Actions 构建失败

1. 检查 proto 版本是否安装成功
2. 检查 native 模块是否正确构建
3. 查看 Actions 日志获取详细错误

## 参考文档

- [DISTRIBUTION.md](../DISTRIBUTION.md) - 完整分发指南
- [BUILD.md](../BUILD.md) - 构建文档
- [Apple Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
