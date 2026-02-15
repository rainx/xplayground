# Build & Package Guide

This document describes how to build and package xToolbox.

## Prerequisites

- Node.js 20+ (managed by proto)
- pnpm 9+ (managed by proto)
- Rust stable (managed by proto)
- Xcode Command Line Tools (for macOS)

## Quick Start

```bash
# Install proto-managed tools
proto use

# Install dependencies
pnpm install

# Build everything (native + electron app)
pnpm build

# Package for distribution
pnpm package
```

## Build Commands

### Development

```bash
# Start dev server with hot reload
pnpm dev

# Run type checking
pnpm typecheck

# Run linter
pnpm lint

# Run tests
pnpm test
```

### Production Build

```bash
# Build native Rust modules only
pnpm build:native

# Build Electron app only (without native)
pnpm build:app

# Build everything (recommended)
pnpm build
```

### Packaging

```bash
# Package for current platform (macOS)
pnpm package

# Build to directory (without DMG/ZIP, faster for testing)
pnpm package:dir

# Package for all architectures (Intel + Apple Silicon)
pnpm dist:all
```

## Build Output

### Development Build (`pnpm build`)

```
out/
├── main/           # Electron main process
├── preload/        # Preload scripts
└── renderer/       # React frontend

native/
└── xtoolbox-native.darwin-x64.node  # Native module (x64)
└── xtoolbox-native.darwin-arm64.node  # Native module (arm64, if built)
```

### Package Output (`pnpm package`)

```
dist/
├── xToolbox-0.1.0-mac-x64.dmg       # Installer for Intel Macs
├── xToolbox-0.1.0-mac-arm64.dmg     # Installer for Apple Silicon
├── xToolbox-0.1.0-mac-x64.zip       # Portable for Intel Macs
└── xToolbox-0.1.0-mac-arm64.zip     # Portable for Apple Silicon
```

## Native Module Build

The native module is written in Rust and uses napi-rs for Node.js bindings.

### Architecture Support

By default, the build creates a universal binary supporting:
- `x86_64-apple-darwin` (Intel Macs)
- `aarch64-apple-darwin` (Apple Silicon)

### Troubleshooting Native Build

If native build fails:

```bash
# Clean native build
cd native && cargo clean && cd ..

# Rebuild
pnpm build:native

# Check Rust toolchain
rustc --version
cargo --version
```

## Code Signing (macOS)

### Development (No Signing)

For local development and testing, no code signing is needed:

```bash
pnpm package:dir
```

This creates an unsigned app in `dist/mac/xToolbox.app`.

### Distribution (Signing Required)

For distribution outside the Mac App Store, you need:

1. **Apple Developer Account**
2. **Developer ID Application Certificate**
3. **Developer ID Installer Certificate** (for PKG)

Set environment variables:

```bash
export APPLE_ID="your@apple.com"
export APPLE_ID_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="TEAM_ID"
```

Then package:

```bash
pnpm package
```

electron-builder will automatically:
- Sign the app with Developer ID
- Notarize with Apple
- Create signed DMG/ZIP

### Entitlements

Entitlements are defined in `build/entitlements.mac.plist`:

- JIT compilation (for V8)
- Automation (for global shortcuts)
- Camera/Microphone (for future tools)
- File access
- Network access

## Continuous Integration

### GitHub Actions Example

```yaml
name: Build

on: [push, pull_request]

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install proto
        run: curl -fsSL https://moonrepo.dev/install/proto.sh | bash

      - name: Setup tools
        run: proto use

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm build

      - name: Test
        run: pnpm test

      - name: Package
        run: pnpm package
        env:
          # Add signing credentials in CI secrets
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/*.{dmg,zip}
```

## Build Performance

### Incremental Builds

- **Native module**: ~10-30s (Rust compilation)
- **Electron app**: ~5-10s (TypeScript + Vite)
- **Package DMG**: ~20-60s (depends on signing/notarization)

### Tips for Faster Builds

1. **Skip native rebuild** if Rust code unchanged:
   ```bash
   pnpm build:app
   ```

2. **Use package:dir** for testing:
   ```bash
   pnpm package:dir  # Skip DMG/ZIP creation
   ```

3. **Disable signing** in development:
   ```bash
   export CSC_IDENTITY_AUTO_DISCOVERY=false
   pnpm package
   ```

## Troubleshooting

### "No provisioning profile found"

This is normal for unsigned builds. Use `pnpm package:dir` for local testing.

### "Native module not found"

Make sure to run `pnpm build:native` before `pnpm build:app`.

### "Application is damaged"

This happens with unsigned DMGs on macOS Gatekeeper. Solutions:
- Sign the app (for distribution)
- Use `xattr -cr /Applications/xToolbox.app` (for testing)
- Use `package:dir` and run directly

### Proto not found

```bash
# Install proto
curl -fsSL https://moonrepo.dev/install/proto.sh | bash

# Add to PATH (if not already)
export PATH="$HOME/.proto/shims:$HOME/.proto/bin:$PATH"

# Install tools
proto use
```

## Release Checklist

Before releasing a new version:

- [ ] Update version in `package.json`
- [ ] Update version in `native/Cargo.toml`
- [ ] Update version in `native/package.json`
- [ ] Run `pnpm typecheck`
- [ ] Run `pnpm lint`
- [ ] Run `pnpm test`
- [ ] Test build: `pnpm build`
- [ ] Test package: `pnpm package:dir`
- [ ] Create git tag: `git tag v0.1.0`
- [ ] Push tag: `git push origin v0.1.0`
- [ ] Create signed release: `pnpm package`
- [ ] Upload to GitHub Releases

## Further Reading

- [electron-builder Documentation](https://www.electron.build/)
- [napi-rs Documentation](https://napi.rs/)
- [Code Signing Guide](https://www.electron.build/code-signing)
- [Notarization Guide](https://www.electron.build/configuration/mac#notarization)
