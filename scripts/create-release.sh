#!/bin/bash
# 使用 GitHub API 创建 Release
set -e

VERSION="0.1.0"
TAG="v${VERSION}"
REPO="rainx/xplayground"

echo "🚀 Creating GitHub Release ${TAG}..."

# 检查是否已登录 gh CLI
if command -v gh &> /dev/null; then
  echo "✅ gh CLI found, using gh CLI..."

  gh release create ${TAG} \
    dist/xToolbox-${VERSION}-mac-x64.dmg \
    dist/xToolbox-${VERSION}-mac-arm64.dmg \
    dist/xToolbox-${VERSION}-mac-x64.zip \
    dist/xToolbox-${VERSION}-mac-arm64.zip \
    --title "xToolbox v${VERSION} - 首个公开版本" \
    --notes "$(cat <<'EOF'
## 🎉 xToolbox v0.1.0

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

感谢使用 xToolbox！
EOF
)"

else
  echo "❌ gh CLI not found."
  echo ""
  echo "请手动创建 Release："
  echo "1. 访问 https://github.com/${REPO}/releases/new"
  echo "2. Tag: ${TAG}"
  echo "3. Title: xToolbox v${VERSION} - 首个公开版本"
  echo "4. 上传文件："
  echo "   - dist/xToolbox-${VERSION}-mac-x64.dmg"
  echo "   - dist/xToolbox-${VERSION}-mac-arm64.dmg"
  echo "   - dist/xToolbox-${VERSION}-mac-x64.zip"
  echo "   - dist/xToolbox-${VERSION}-mac-arm64.zip"
  echo ""
  echo "Release notes 已保存到 /tmp/release-notes.md"
  exit 1
fi

echo ""
echo "✅ Release created successfully!"
echo "View at: https://github.com/${REPO}/releases/tag/${TAG}"
