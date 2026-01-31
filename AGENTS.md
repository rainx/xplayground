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

# Build native Rust modules
pnpm build:native

# Run all tests
pnpm test

# Run specific test file
pnpm test -- <test-file-pattern>

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Build production app
pnpm build

# Package for macOS
pnpm package
```

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

### Clipboard Manager (v0.1)

**Status**: ✅ 基础功能已实现，开发服务器可运行

**功能特性**:
- 剪贴板历史记录 - 自动捕获文本、图片、链接
- 内容类型检测 - text, rich_text, link, image, color
- 搜索过滤 - 按内容类型和关键词搜索
- 本地持久化存储 - JSON 格式存储历史记录
- UI 组件 - 横向条形展示、搜索栏、详情预览

**架构**:
```
┌─────────────────────────────────────────────────────────────┐
│  Renderer (React)                                           │
│  └── clipboard-manager.tsx                                  │
│       ├── clipboard-strip.tsx (横向历史条)                   │
│       ├── clipboard-item.tsx (单个项目卡片)                  │
│       └── search-bar.tsx (搜索过滤)                         │
├─────────────────────────────────────────────────────────────┤
│  Main Process                                               │
│  └── services/clipboard/                                    │
│       ├── index.ts (ClipboardService - 监控与事件)          │
│       ├── storage.ts (ClipboardStorage - 持久化)           │
│       ├── handlers.ts (IPC handlers)                        │
│       └── types.ts (TypeScript 类型定义)                    │
├─────────────────────────────────────────────────────────────┤
│  Native (Rust + napi-rs)                                    │
│  └── clipboard/                                             │
│       ├── mod.rs (模块导出)                                 │
│       ├── monitor.rs (NSPasteboard 监控)                    │
│       └── types.rs (Rust 类型定义)                          │
└─────────────────────────────────────────────────────────────┘
```

**Native 模块能力** (Rust):
- `clipboard_read()` - 读取剪贴板内容，返回结构化数据
- `clipboard_change_count()` - 获取 NSPasteboard changeCount 用于轮询检测
- 支持类型: plain text, RTF, HTML, PNG/TIFF images, file URLs
- URL 自动检测 - 使用 regex 提取文本中的链接
- 来源应用识别 - 通过 NSWorkspace 获取前台应用信息

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
