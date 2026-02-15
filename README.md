# xToolbox

一个免费开源的 macOS 工具箱应用，集成了实用功能。让你无需购买多个付费应用，通过 AI 辅助快速开发需要的功能。

## ✨ 功能特性

- **剪贴板管理器** (`Alt+Cmd+V`)
  - 📋 记录剪贴板历史（文本、图片、文件、链接）
  - 🏷️ 分类管理和标签
  - 🔍 快速搜索过滤
  - ⌨️ 键盘导航和快捷粘贴
  - 🎯 非抢焦点弹窗（类似 Paste App）

- **截图美化工具** (`Alt+Cmd+A`)
  - 🎨 添加阴影和圆角效果
  - 🖼️ 自定义背景颜色和边距
  - 📏 智能边缘检测
  - 💾 导出优化的截图

## 📦 安装

### Homebrew（推荐）

```bash
brew install --cask rainx/tap/xtoolbox
```

### 直接下载

访问 [Releases 页面](https://github.com/rainx/xplayground/releases/latest) 下载最新版本：

- **Intel Mac**: 下载 `xToolbox-*-mac-x64.dmg`
- **Apple Silicon**: 下载 `xToolbox-*-mac-arm64.dmg`

下载后：
1. 双击打开 DMG
2. 拖动到 Applications 文件夹
3. 右键点击应用，选择「打开」

## 🚀 快速开始

1. 安装并打开 xToolbox
2. 授予必要权限（系统偏好设置 > 安全性与隐私）：
   - ✅ 辅助功能
   - ✅ 屏幕录制
3. 使用全局快捷键调用功能：
   - `Alt+Cmd+V` - 剪贴板管理器
   - `Alt+Cmd+A` - 截图美化工具

## 🛠️ 开发

### 前置要求

- Node.js 20+
- pnpm 9+
- Rust stable
- Xcode Command Line Tools

### 快速开始

```bash
# 安装 proto（版本管理工具）
curl -fsSL https://moonrepo.dev/install/proto.sh | bash

# 安装依赖
proto use
pnpm install

# 启动开发服务器
pnpm dev
```

### 构建

```bash
# 构建应用
pnpm build

# 打包为 DMG
pnpm package
```

详见 [BUILD.md](BUILD.md) 和 [AGENTS.md](AGENTS.md)。

## 📚 文档

- **[AGENTS.md](AGENTS.md)** - 项目架构和开发指南
- **[BUILD.md](BUILD.md)** - 构建和打包文档
- **[DISTRIBUTION.md](DISTRIBUTION.md)** - 分发策略完整指南
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - 部署检查清单

## 🏗️ 项目架构

```
xToolbox
├── src/
│   ├── main/          # Electron 主进程
│   ├── renderer/      # React 前端
│   └── preload/       # Electron preload 脚本
├── native/            # Rust 原生模块（napi-rs）
│   └── src/
│       └── clipboard/ # macOS 剪贴板监控
└── scripts/           # 构建和分发脚本
```

**技术栈：**
- Electron + React 19 + TypeScript
- Rust (napi-rs) 用于 macOS 系统集成
- Vite 构建工具

## 🤝 贡献

欢迎贡献！请查看 [AGENTS.md](AGENTS.md) 了解项目结构和开发规范。

## 🐛 问题反馈

遇到问题？请在 [GitHub Issues](https://github.com/rainx/xplayground/issues) 反馈。

## 📝 开发日志

### v0.1.0 (2025-02-15)
- ✨ 初始版本
- ✨ 剪贴板管理器功能
- ✨ 截图美化工具
- 🔧 支持 Intel 和 Apple Silicon

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 💡 项目理念

这个项目的目标是避免购买多个付费应用，只克隆真正需要的功能。通过 AI 辅助开发，可以快速实现想要的工具。

**已实现功能参考：**
- Clipboard Manager → Paste App 的部分功能
- Screenshot Beautifier → CleanShot X 的截图美化

**计划添加：**
- [ ] 窗口管理器
- [ ] 快捷启动器
- [ ] 更多实用工具...

## 🙏 致谢

使用 [Claude Code](https://claude.ai/code) AI 辅助开发。

---

**如果觉得有用，请给个 ⭐️ Star！**
