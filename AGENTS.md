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

## Future Tool Ideas

Track potential tools to clone here:
- [ ] (Add tools as you identify them)

---

> **Note**: Update this file as the project evolves. Keep commands and patterns current.
