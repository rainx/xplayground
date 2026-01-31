# xToolbox (xplayground)

## Project Overview
`xToolbox` (currently in the `xplayground` directory) is a personal Mac toolbox application designed to replicate useful features from paid applications. The project leverages AI-assisted development to rapidly prototype and implement specific tools.

### Tech Stack
- **Frontend**: React + TypeScript
- **App Shell**: Electron + Vite (`electron-vite`)
- **Native Layer**: Rust (via `napi-rs`) for macOS system integrations and performance-critical tasks.
- **Testing**: Vitest (Unit), Playwright (E2E), Cargo tests (Native).

## Building and Running
The project uses `pnpm` as the package manager.

- **Install Dependencies**: `pnpm install`
- **Development Mode**: `pnpm dev`
- **Build Native Modules**: `pnpm build:native`
- **Build Production App**: `pnpm build`
- **Package for macOS**: `pnpm package`
- **Type Checking**: `pnpm typecheck`
- **Linting**: `pnpm lint`

## Testing
- **Unit Tests**: `pnpm test` or `pnpm test:unit`
- **E2E Tests**: `pnpm test:e2e`
- **Native Tests**: `cd native && cargo test`

## Project Structure
- `src/main/`: Electron main process.
- `src/renderer/`: React frontend.
- `src/preload/`: Electron preload scripts.
- `native/`: Rust native modules.
- `tests/`: Unit and E2E tests.

## Development Conventions
- **Conventional Commits**: Use `feat:`, `fix:`, `chore:`, etc.
- **Strict TypeScript**: No `any` types.
- **Test-Driven**: New features should include corresponding tests.
- **Native Bindings**: Use `napi-rs` for bridging Node.js and Rust.

Refer to [AGENTS.md](AGENTS.md) and [CLAUDE.md](CLAUDE.md) for more detailed agent-specific instructions and architecture diagrams.
