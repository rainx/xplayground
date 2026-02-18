#!/bin/bash
set -e

# ─────────────────────────────────────────────────
# Update Homebrew Tap for xToolbox
# Usage: ./scripts/update-homebrew.sh [version]
#
# Downloads release artifacts, computes SHA256,
# and updates the homebrew-tap formula.
# ─────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Colors ──────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${BLUE}▸${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }

# ── Parse arguments ─────────────────────────────
VERSION="${1:-}"

if [ -z "$VERSION" ]; then
  # Default to current version from package.json
  VERSION=$(node -p "require('$ROOT_DIR/package.json').version")
  info "No version specified, using current: $VERSION"
fi

# Strip leading 'v' if present
VERSION="${VERSION#v}"

echo ""
echo -e "${BOLD}Update Homebrew Tap${NC} → v${VERSION}"
echo ""

# ── Check prerequisites ─────────────────────────
if ! command -v gh &> /dev/null; then
  error "gh CLI is required. Install: brew install gh"
fi

# ── Check release exists ────────────────────────
info "Checking release v${VERSION}..."
if ! gh release view "v${VERSION}" --repo rainx/xplayground &> /dev/null; then
  error "Release v${VERSION} not found on GitHub. Wait for CI to finish or create the release first."
fi

# ── Download ZIP artifacts ──────────────────────
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

info "Downloading release artifacts..."
gh release download "v${VERSION}" \
  --repo rainx/xplayground \
  --pattern "*.zip" \
  --dir "$TMPDIR"

ARM64_ZIP="$TMPDIR/xToolbox-${VERSION}-mac-arm64.zip"
X64_ZIP="$TMPDIR/xToolbox-${VERSION}-mac-x64.zip"

if [ ! -f "$ARM64_ZIP" ]; then
  error "ARM64 ZIP not found in release: xToolbox-${VERSION}-mac-arm64.zip"
fi

if [ ! -f "$X64_ZIP" ]; then
  error "x64 ZIP not found in release: xToolbox-${VERSION}-mac-x64.zip"
fi

ok "Downloaded release artifacts"

# ── Compute SHA256 ──────────────────────────────
SHA_ARM64=$(shasum -a 256 "$ARM64_ZIP" | awk '{print $1}')
SHA_X64=$(shasum -a 256 "$X64_ZIP" | awk '{print $1}')

ok "SHA256 (arm64): ${SHA_ARM64}"
ok "SHA256 (x64):   ${SHA_X64}"

# ── Generate formula ───────────────────────────
FORMULA='cask "xtoolbox" do
  version "'"${VERSION}"'"

  if Hardware::CPU.intel?
    sha256 "'"${SHA_X64}"'"
    url "https://github.com/rainx/xplayground/releases/download/v#{version}/xToolbox-#{version}-mac-x64.zip"
  else
    sha256 "'"${SHA_ARM64}"'"
    url "https://github.com/rainx/xplayground/releases/download/v#{version}/xToolbox-#{version}-mac-arm64.zip"
  end

  name "xToolbox"
  desc "Personal Mac toolbox - clone useful features from paid apps"
  homepage "https://github.com/rainx/xplayground"

  livecheck do
    url :url
    strategy :github_latest
  end

  app "xToolbox.app"

  postflight do
    # Remove quarantine attribute to avoid "damaged app" warning
    system_command "/usr/bin/xattr",
                   args: ["-cr", "#{appdir}/xToolbox.app"]
  end

  zap trash: [
    "~/Library/Application Support/xtoolbox",
    "~/Library/Preferences/com.rainx.xtoolbox.plist",
    "~/Library/Logs/xtoolbox",
  ]
end
'

# ── Update local copy ──────────────────────────
LOCAL_FORMULA="$ROOT_DIR/homebrew-tap/Casks/xtoolbox.rb"
echo "$FORMULA" > "$LOCAL_FORMULA"
ok "Updated local formula: homebrew-tap/Casks/xtoolbox.rb"

# ── Push to homebrew-tap repo ───────────────────
info "Pushing to rainx/homebrew-tap..."

TAP_DIR="$TMPDIR/homebrew-tap"
gh repo clone rainx/homebrew-tap "$TAP_DIR" -- --depth 1 2>/dev/null

echo "$FORMULA" > "$TAP_DIR/Casks/xtoolbox.rb"

cd "$TAP_DIR"
git add Casks/xtoolbox.rb

if git diff --cached --quiet; then
  ok "Homebrew formula already up to date"
else
  git commit -m "Update xtoolbox to v${VERSION}"
  git push
  ok "Pushed updated formula to rainx/homebrew-tap"
fi

echo ""
echo -e "${GREEN}${BOLD}Homebrew tap updated!${NC}"
echo ""
echo "  Users can now install/upgrade with:"
echo "    brew install --cask rainx/tap/xtoolbox"
echo "    brew upgrade --cask xtoolbox"
echo ""
