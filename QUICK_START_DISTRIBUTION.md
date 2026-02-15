# 分发快速开始 🚀

## 我该选择哪种方式？

```
┌─────────────────────────────────────────────────────────────┐
│ 选择合适的分发方式                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🎯 目标: 个人使用或内部测试                                │
│     → 使用方式 A (免费，5 分钟)                             │
│                                                             │
│  🎯 目标: 开源项目，分享给技术用户                          │
│     → 使用方式 B (免费，需要 GitHub)                        │
│                                                             │
│  🎯 目标: 正式产品，公开分发                                │
│     → 使用方式 C ($99/年，专业体验)                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 方式 A: 快速分发（免费）

**适合:** 个人使用、内部测试、小范围分享

**时间:** ~5 分钟

### 步骤

```bash
# 1. 构建应用
export CSC_IDENTITY_AUTO_DISCOVERY=false
pnpm package

# 2. 创建包含安装脚本的 ZIP
cp scripts/install.sh dist/mac/
cd dist/mac
zip -r ../xToolbox-with-installer.zip xToolbox.app install.sh
cd ../..

# 3. 分发
# - 直接发送 ZIP 文件
# - 或上传到 GitHub Releases
gh release create v0.1.0 dist/xToolbox-with-installer.zip
```

### 用户安装

```bash
# 用户下载并解压后
cd xToolbox
./install.sh
```

**优点:**
- ✅ 完全免费
- ✅ 快速简单
- ✅ 无需 Apple Developer 账号

**缺点:**
- ❌ 用户需要运行脚本或右键打开
- ❌ 会显示"无法验证开发者"警告

---

## 方式 B: Homebrew（免费 + 最佳开源体验）

**适合:** 开源项目、技术用户

**时间:** ~30 分钟（首次）+ 1-7 天审核

### 快速版本（自建 Tap）

```bash
# 1. 创建 GitHub 仓库: homebrew-tap

# 2. 准备 Cask 文件
mkdir -p Casks
cat > Casks/xtoolbox.rb << 'EOF'
cask "xtoolbox" do
  version "0.1.0"

  if Hardware::CPU.intel?
    sha256 "YOUR_X64_SHA256"
    url "https://github.com/rainx/xplayground/releases/download/v#{version}/xToolbox-#{version}-mac-x64.zip"
  else
    sha256 "YOUR_ARM64_SHA256"
    url "https://github.com/rainx/xplayground/releases/download/v#{version}/xToolbox-#{version}-mac-arm64.zip"
  end

  name "xToolbox"
  desc "Personal Mac toolbox"
  homepage "https://github.com/rainx/xplayground"

  app "xToolbox.app"
end
EOF

# 3. 推送到 GitHub
git add . && git commit -m "Add xToolbox cask" && git push
```

### 用户安装

```bash
brew tap rainx/tap
brew install --cask xtoolbox
```

**优点:**
- ✅ 完全免费
- ✅ 用户体验好（一行命令安装）
- ✅ 自动更新（通过 Homebrew）
- ✅ 适合开源项目

**缺点:**
- ❌ 仍需用户右键打开（首次）
- ❌ 官方 Homebrew 需要审核

---

## 方式 C: 专业分发（Apple 签名 + 公证）

**适合:** 正式产品、大规模分发

**成本:** $99/年

**时间:** ~2 小时（首次设置）

### 首次设置

```bash
# 1. 注册 Apple Developer
# 访问: https://developer.apple.com/programs/

# 2. 创建证书
# 在 https://developer.apple.com/account/resources/certificates/list
# 创建 "Developer ID Application" 证书

# 3. 获取 App-Specific Password
# 访问: https://appleid.apple.com
# Security > App-Specific Passwords > Generate

# 4. 配置环境变量
cat >> ~/.zshrc << 'EOF'
export APPLE_ID="your@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
EOF

source ~/.zshrc
```

### 每次发布

```bash
# 1. 准备发布
./scripts/prepare-release.sh 0.1.0

# 2. 推送 tag（GitHub Actions 自动处理）
git push --follow-tags

# 或手动构建
pnpm package
gh release create v0.1.0 dist/*.dmg
```

### 用户安装

用户直接双击 DMG，无任何警告！

**优点:**
- ✅ 最佳用户体验（无警告）
- ✅ 支持自动更新
- ✅ 可分发到企业和消费者
- ✅ 专业可信

**缺点:**
- ❌ 需要 $99/年
- ❌ 设置相对复杂
- ❌ 公证需要几分钟

---

## 自动化发布（所有方式）

### 使用 GitHub Actions

```bash
# 1. 推送 tag 自动触发
git tag v0.1.0
git push origin v0.1.0

# 2. GitHub Actions 自动:
#    - 运行测试
#    - 构建应用
#    - 创建 Release
#    - 上传 DMG/ZIP

# 3. 在 GitHub Releases 页面下载
# https://github.com/rainx/xplayground/releases
```

配置见: `.github/workflows/release.yml`

---

## 测试发布流程

在正式发布前测试：

```bash
# 1. 使用 package:dir 快速测试
pnpm package:dir

# 2. 手动测试应用
open dist/mac/xToolbox.app

# 3. 测试安装脚本
cd dist/mac
zip -r test.zip xToolbox.app ../../../scripts/install.sh
unzip test.zip -d /tmp/test
cd /tmp/test
./install.sh
```

---

## 常用命令速查

```bash
# 开发
pnpm dev                    # 启动开发服务器

# 构建
pnpm build                  # 完整构建（native + app）
pnpm build:native           # 仅构建 native
pnpm build:app              # 仅构建 app

# 打包
pnpm package                # 打包 DMG + ZIP
pnpm package:dir            # 快速打包（仅目录）
pnpm dist:all               # 打包所有架构

# 发布
./scripts/prepare-release.sh 0.1.1   # 准备发布
git push --follow-tags                # 触发自动发布

# 公证（如有签名）
./scripts/notarize.sh dist/xToolbox-0.1.0-mac-x64.dmg
```

---

## 故障排除

### "应用已损坏"

```bash
# 方案 1: 移除隔离属性
xattr -cr /Applications/xToolbox.app

# 方案 2: 使用安装脚本
./install.sh
```

### "无法验证开发者"

- 没有签名：右键点击应用 > 打开
- 有签名但未公证：检查公证流程
- 已公证：验证票据是否装订

### GitHub Actions 失败

1. 查看 Actions 日志
2. 检查 proto 是否安装成功
3. 确认 native 模块构建成功

---

## 下一步

- **方式 A**: 继续阅读 [scripts/README.md](scripts/README.md)
- **方式 B**: 参考 [DISTRIBUTION.md](DISTRIBUTION.md) 的 Homebrew 章节
- **方式 C**: 完整阅读 [DISTRIBUTION.md](DISTRIBUTION.md)

## 需要帮助？

- 📖 完整文档: [DISTRIBUTION.md](DISTRIBUTION.md)
- 🔨 构建文档: [BUILD.md](BUILD.md)
- 🐛 问题反馈: [GitHub Issues](https://github.com/rainx/xplayground/issues)
