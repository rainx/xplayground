# ✅ Release 创建后验证清单

## 验证 GitHub Release

访问 https://github.com/rainx/xplayground/releases/latest

确认：
- [ ] Release v0.1.0 可见
- [ ] 4 个文件已上传
- [ ] Release notes 显示正确
- [ ] 下载链接可访问

测试下载：
```bash
# 测试下载链接
curl -I https://github.com/rainx/xplayground/releases/download/v0.1.0/xToolbox-0.1.0-mac-x64.dmg
# 应该返回 302 重定向
```

## 验证 Homebrew 安装

```bash
# 1. 清除缓存
brew untap rainx/tap 2>/dev/null || true

# 2. 添加 tap
brew tap rainx/tap

# 3. 查看 cask 信息
brew info xtoolbox

# 4. 测试安装（可选）
brew install --cask xtoolbox

# 5. 验证
ls -la /Applications/xToolbox.app
open /Applications/xToolbox.app

# 6. 测试快捷键
# Alt+Cmd+V - 剪贴板管理器
# Alt+Cmd+A - 截图工具

# 7. 卸载测试（可选）
brew uninstall --cask xtoolbox
```

## 验证文档

访问 https://github.com/rainx/xplayground

确认：
- [ ] README.md 正确显示
- [ ] 安装说明清晰
- [ ] LICENSE 可见
- [ ] SECURITY.md 可见

## 更新主项目 README（如需要）

如果 Release 链接需要更新：

```bash
# 编辑 README.md
# 确保链接指向正确
# - https://github.com/rainx/xplayground/releases/latest

git add README.md
git commit -m "docs: update release links"
git push
```

## 社交媒体分享（可选）

Release 创建成功后可以分享：

### Twitter/X

```
🎉 xToolbox v0.1.0 发布！

免费开源的 macOS 工具箱：
✨ 剪贴板管理器 (Alt+Cmd+V)
✨ 截图美化工具 (Alt+Cmd+A)

一键安装：
brew install --cask rainx/tap/xtoolbox

GitHub: https://github.com/rainx/xplayground

#macOS #OpenSource #Productivity
```

### Reddit (r/macapps)

```
标题：[Release] xToolbox v0.1.0 - Free open-source Mac utilities

正文：
I just released xToolbox v0.1.0, a free and open-source Mac toolbox app.

Features:
- Clipboard Manager (Alt+Cmd+V) - Track history, categories, search
- Screenshot Beautifier (Alt+Cmd+A) - Add shadows and rounded corners

Install via Homebrew:
brew install --cask rainx/tap/xtoolbox

Or download DMG: https://github.com/rainx/xplayground/releases/latest

Built with Electron, React, and Rust for native macOS integration.

Feedback welcome!
```

### V2EX (macOS 节点)

```
标题：xToolbox v0.1.0 - 开源 macOS 工具箱应用

正文：
刚发布了一个开源的 Mac 工具箱应用，集成了一些实用功能。

目前包含：
- 剪贴板管理器（Alt+Cmd+V）- 历史记录、分类、搜索
- 截图美化工具（Alt+Cmd+A）- 阴影、圆角

技术栈：Electron + React + Rust

安装：
brew install --cask rainx/tap/xtoolbox

或下载 DMG：
https://github.com/rainx/xplayground/releases

欢迎反馈和建议！
```

## 监控和反馈

### GitHub Insights

定期查看：
- **Insights > Traffic** - 访问量统计
- **Insights > Clones** - 克隆统计
- **Insights > Stars** - Star 增长
- **Issues** - 用户反馈

### 响应用户

- Issues：24 小时内首次回复
- PR：1 周内 review
- Discussions：及时参与

## 下一个版本

准备 v0.1.1 时：

```bash
# 1. 修复 bug 或添加功能
# 2. 更新版本
./scripts/prepare-release.sh 0.1.1

# 3. 推送 tag（自动构建）
git push --follow-tags

# 4. 创建 Release（手动上传文件）

# 5. 更新 Homebrew Cask
cd homebrew-tap
# 修改 version 和 sha256
git add Casks/xtoolbox.rb
git commit -m "Update xToolbox to v0.1.1"
git push
```

## 🎉 恭喜！

一旦完成验证，你的项目就正式公开发布了！

---

**需要帮助？** 参考：
- [DISTRIBUTION.md](DISTRIBUTION.md) - 完整分发指南
- [BUILD.md](BUILD.md) - 构建文档
- [QUICK_START_DISTRIBUTION.md](QUICK_START_DISTRIBUTION.md) - 快速参考
