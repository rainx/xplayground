# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Gemini, Copilot, Cursor, etc.) when working with this repository.

## Project Vision

**xToolbox** - A personal Mac toolbox application that replicates useful features from paid apps. The goal is to avoid purchasing multiple apps by cloning only the features actually needed, with AI assistance enabling rapid development.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Electron (UI Layer)                  │
│  - React + TypeScript frontend                          │
│  - Modular tool components                              │
│  - IPC communication with native layer                  │
├─────────────────────────────────────────────────────────┤
│                  Node.js (Bridge Layer)                 │
│  - electron-builder for packaging                       │
│  - napi-rs for Rust bindings                            │
├─────────────────────────────────────────────────────────┤
│               Native Layer (Rust / Swift)               │
│  - Performance-critical operations                      │
│  - macOS system integrations                            │
│  - File system operations                               │
└─────────────────────────────────────────────────────────┘
```

### Directory Structure

```
xplayground/
├── src/
│   ├── main/           # Electron main process
│   ├── renderer/       # React frontend
│   │   ├── components/ # Reusable UI components
│   │   ├── tools/      # Individual tool modules
│   │   └── shared/     # Shared utilities
│   └── preload/        # Electron preload scripts
├── native/
│   └── src/            # Rust native modules (napi-rs)
├── tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── e2e/            # End-to-end tests (Playwright)
└── tools/              # Build and development scripts
```

## Development Commands

```bash
# Install dependencies
pnpm install

# Development mode with hot reload
pnpm dev

# Build native Rust modules only
pnpm build:native

# Build Electron app only (without native)
pnpm build:app

# Build everything (native + Electron, recommended for production)
pnpm build

# Run all tests
pnpm test

# Run specific test file
pnpm test -- <test-file-pattern>

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Package for distribution (creates DMG + ZIP)
pnpm package

# Package to directory only (faster, for testing)
pnpm package:dir

# Package for all architectures (Intel + Apple Silicon)
pnpm dist:all
```

> **Note**: See [BUILD.md](BUILD.md) for detailed build and packaging documentation.

## Adding New Tools

Each tool is a self-contained module in `src/renderer/tools/`. To add a new tool:

1. Create a new directory: `src/renderer/tools/<tool-name>/`
2. Implement the required files:
   - `index.tsx` - Main component
   - `types.ts` - TypeScript interfaces
   - `<tool-name>.test.tsx` - Unit tests
3. Register the tool in `src/renderer/tools/registry.ts`
4. If native functionality needed, add Rust module in `native/src/`

### Tool Template

```typescript
// src/renderer/tools/<tool-name>/index.tsx
import { ToolComponent } from '@/shared/types';

export const metadata = {
  id: '<tool-name>',
  name: 'Tool Display Name',
  description: 'What this tool does',
  icon: 'IconName',
};

export const Component: ToolComponent = () => {
  // Implementation
};
```

## Testing Strategy

- **Unit Tests**: Jest + React Testing Library for components
- **Native Tests**: Rust's built-in test framework (`cargo test`)
- **Integration Tests**: Test IPC between Electron and native layer
- **E2E Tests**: Playwright for full application testing

### Test Commands

```bash
# Unit tests with coverage
pnpm test:unit --coverage

# Native module tests
cd native && cargo test

# E2E tests
pnpm test:e2e

# Watch mode for development
pnpm test:watch
```

## Native Module Development (Rust)

Using napi-rs for Node.js bindings:

```rust
// native/src/lib.rs
use napi_derive::napi;

#[napi]
pub fn example_function(input: String) -> String {
    // Native implementation
    input.to_uppercase()
}
```

Build and test native modules:
```bash
cd native
cargo build
cargo test
```

## Code Conventions

- **TypeScript**: Strict mode, no `any` types
- **React**: Functional components with hooks
- **Rust**: Follow standard Rust idioms, use `clippy`
- **Naming Conventions**:
  - Files: `kebab-case.ts`, `kebab-case.tsx` (e.g., `tool-container.tsx`, `clipboard-manager.tsx`)
  - Components: PascalCase (e.g., `ToolContainer`)
  - Folders: `kebab-case`
- **Testing**: Every new feature requires tests before merging
- **Commits**: Conventional commits format (`feat:`, `fix:`, `chore:`)

## AI Agent Guidelines

### For Rapid Iteration
1. Always run tests after making changes: `pnpm test`
2. Use type checking to catch errors early: `pnpm typecheck`
3. Keep changes small and focused
4. Each tool should be independently testable

### When Adding Features
1. Check existing tools for patterns to follow
2. Write tests alongside implementation
3. Update this file if adding new development commands or patterns

### Self-Validation Checklist
Before completing any task:
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] New code has corresponding tests

## Implemented Tools

### Clipboard Manager (v0.2)

**Status**: ✅ 核心功能完成，支持快捷键呼出和粘贴

**功能特性**:
- 剪贴板历史记录 - 自动捕获文本、图片、链接、文件
- 分类管理 - 支持拖拽分配分类，分类过滤
- 全局快捷键 - `Option+Command+V` 呼出弹窗
- 非抢焦点弹窗 - 不会让原应用失去焦点（类似 Paste App）
- 键盘导航 - 方向键选择，Enter 粘贴，Escape 关闭
- 右键菜单 - 粘贴、复制、删除、分类管理等操作
- 搜索过滤 - 按内容类型和关键词搜索

**架构**:
```
┌─────────────────────────────────────────────────────────────┐
│  Renderer (React)                                           │
│  ├── clipboard-manager.tsx (主窗口完整界面)                  │
│  └── clipboard-popup.tsx (快捷键弹窗，精简界面)              │
│       ├── clipboard-strip.tsx (横向历史条)                   │
│       ├── category-tabs.tsx (分类标签)                       │
│       └── context-menu.tsx (右键菜单)                        │
├─────────────────────────────────────────────────────────────┤
│  Main Process                                               │
│  └── services/clipboard/                                    │
│       ├── index.ts (ClipboardService - 监控与事件)          │
│       ├── storage.ts (ClipboardStorage - 历史持久化)        │
│       ├── category-storage.ts (CategoryStorage - 分类持久化)│
│       └── handlers.ts (IPC handlers)                        │
├─────────────────────────────────────────────────────────────┤
│  Native (Rust + napi-rs)                                    │
│  └── clipboard/                                             │
│       ├── monitor.rs (NSPasteboard 监控)                    │
│       └── types.rs (Rust 类型定义)                          │
└─────────────────────────────────────────────────────────────┘
```

**Native 模块能力** (Rust):
- `clipboard_read()` - 读取剪贴板内容，返回结构化数据
- `clipboard_change_count()` - 获取 NSPasteboard changeCount 用于轮询检测
- 支持类型: plain text, RTF, HTML, PNG/TIFF images, file URLs
- 来源应用识别 - 通过 NSWorkspace 获取前台应用信息

---

## Best Practices

### 非抢焦点弹窗 (Non-Focus-Stealing Popup)

在 macOS 上实现类似 Paste App 的弹窗体验，关键是让弹窗出现时不抢夺其他应用的焦点。

**核心配置** (`src/main/index.ts`):
```typescript
popupWindow = new BrowserWindow({
  type: 'panel',           // 使用 NSPanel 而非 NSWindow
  focusable: false,        // 窗口不可获取焦点
  alwaysOnTop: true,
  // ...
});

// 显示时使用 showInactive() 而非 show()
popupWindow.showInactive();
```

**键盘导航**：由于窗口不可聚焦，无法接收键盘事件。解决方案是在弹窗可见时临时注册全局快捷键：
```typescript
function registerPopupKeyboardShortcuts(): void {
  globalShortcut.register('Escape', hidePopup);
  globalShortcut.register('Left', () => send('navigate', 'left'));
  globalShortcut.register('Return', () => send('select'));
  // ...
}

function hidePopup(): void {
  popupWindow.hide();
  unregisterPopupKeyboardShortcuts();  // 隐藏时取消注册
}
```

**IPC 通信**：通过 `webContents.send()` 将键盘事件发送到渲染进程处理。

### 对话框 CSS 样式规范

新增对话框时必须添加完整的 CSS 样式，避免样式不一致：

1. **输入框选择器**：同时覆盖 `input[type="text"]` 和 `input[type="password"]`
2. **对话框尺寸**：为每个对话框类定义 `width`/`max-width`（如 `.edit-dialog`, `.ai-settings-dialog`）
3. **Header 按钮**：新增按钮需添加对应样式（如 `.settings-btn`），参考 `.refresh-btn` 模式
4. **使用 CSS 变量**：`var(--bg-tertiary)`, `var(--border)`, `var(--text-primary)` 等确保主题一致

样式文件位置：`src/renderer/tools/clipboard-manager/styles/clipboard-manager.css`

### 多窗口 IPC 广播

当有多个窗口（主窗口 + 弹窗）时，需要将事件广播到所有窗口：
```typescript
service.on('clipboard-change', (item) => {
  mainWindow.webContents.send('clipboard:item-added', item);
  popupWindow?.webContents.send('clipboard:item-added', item);
});
```

---

## Development Log

### 2025-01-31: 初始化与环境配置

**已完成的配置**:

1. **Proto 版本管理** (`.prototools`)
   ```toml
   node = "lts"
   pnpm = "latest"
   rust = "stable"
   ```

2. **pnpm + Electron 兼容性** (`.npmrc`)
   ```ini
   node-linker=hoisted
   shamefully-hoist=true
   ```
   > ★ 关键: Electron 的 `require('electron')` 必须解析到内置模块，不能是 npm 包

3. **Rust 编译修复**
   - `types.rs`: 修复 `ClipboardContentType` enum 的 `to_string()` 实现
   - `monitor.rs`: 修复 `NSArray` 创建方式，解决类型转换问题

4. **存储路径调整**
   - 原计划: iCloud Drive (`~/Library/Mobile Documents/`)
   - 当前: `app.getPath('userData')` (避免沙盒权限问题)
   - 路径: `~/Library/Application Support/xtoolbox/`

**已知问题与解决方案**:

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `require('electron')` 返回路径字符串 | `ELECTRON_RUN_AS_NODE=1` 环境变量 | 在终端中 `unset ELECTRON_RUN_AS_NODE` 后运行 |
| Rust 编译失败 | 类型不匹配 | 修复 `types.rs` 和 `monitor.rs` |
| pnpm 依赖问题 | 默认隔离的 node_modules 结构 | `.npmrc` 添加 `shamefully-hoist=true` |

**启动命令**:
```bash
# 在单独的终端窗口运行 (避免 Claude Code 环境变量影响)
unset ELECTRON_RUN_AS_NODE && pnpm dev
```

---

## Future Tool Ideas

Track potential tools to clone here:
- [ ] (Add tools as you identify them)

---

> **Note**: Update this file as the project evolves. Keep commands and patterns current.
