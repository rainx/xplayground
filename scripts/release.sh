#!/bin/bash
set -e

# ─────────────────────────────────────────────────
# xToolbox Release Automation
# Usage: ./scripts/release.sh [patch|minor|major|<version>]
# ─────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# ── Colors ──────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

info()  { echo -e "${BLUE}▸${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }
step()  { echo -e "\n${CYAN}${BOLD}[$1/$TOTAL_STEPS]${NC} ${BOLD}$2${NC}"; }

# ── Parse arguments ─────────────────────────────
SKIP_CHECKS=false
DRY_RUN=false
BUMP_TYPE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-checks) SKIP_CHECKS=true; shift ;;
    --dry-run)     DRY_RUN=true; shift ;;
    -h|--help)
      echo "Usage: $0 [options] <patch|minor|major|version>"
      echo ""
      echo "Arguments:"
      echo "  patch          Bump patch version (0.1.0 -> 0.1.1)"
      echo "  minor          Bump minor version (0.1.0 -> 0.2.0)"
      echo "  major          Bump major version (0.1.0 -> 1.0.0)"
      echo "  <version>      Set explicit version (e.g., 0.2.0)"
      echo ""
      echo "Options:"
      echo "  --skip-checks  Skip typecheck, lint, and test"
      echo "  --dry-run      Show what would happen without making changes"
      echo "  -h, --help     Show this help"
      exit 0
      ;;
    *)
      if [ -z "$BUMP_TYPE" ]; then
        BUMP_TYPE="$1"
      else
        error "Unexpected argument: $1"
      fi
      shift
      ;;
  esac
done

if [ -z "$BUMP_TYPE" ]; then
  echo "Usage: $0 [options] <patch|minor|major|version>"
  echo "Run '$0 --help' for details."
  exit 1
fi

# ── Helpers ─────────────────────────────────────

# Calculate next version based on bump type
calc_version() {
  local current=$1
  local bump=$2
  local major minor patch

  IFS='.' read -r major minor patch <<< "$current"

  case $bump in
    patch) echo "$major.$minor.$((patch + 1))" ;;
    minor) echo "$major.$((minor + 1)).0" ;;
    major) echo "$((major + 1)).0.0" ;;
    *)
      # Validate explicit version format
      if [[ ! "$bump" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        error "Invalid version format: $bump (expected X.Y.Z)"
      fi
      echo "$bump"
      ;;
  esac
}

# Update version in a JSON file using sed (no jq dependency)
update_json_version() {
  local file=$1
  local version=$2
  sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$version\"/" "$file"
}

# Update version in Cargo.toml
update_cargo_version() {
  local file=$1
  local version=$2
  # Only replace the first occurrence (the [package] version)
  sed -i '' "0,/^version = \"[^\"]*\"/{s/^version = \"[^\"]*\"/version = \"$version\"/}" "$file"
}

# ── Read current version ────────────────────────
CURRENT_VERSION=$(node -p "require('./package.json').version")
NEW_VERSION=$(calc_version "$CURRENT_VERSION" "$BUMP_TYPE")

if [ "$CURRENT_VERSION" = "$NEW_VERSION" ]; then
  error "New version ($NEW_VERSION) is the same as current ($CURRENT_VERSION)"
fi

TOTAL_STEPS=6
if [ "$SKIP_CHECKS" = true ]; then
  TOTAL_STEPS=4
fi

echo ""
echo -e "${BOLD}xToolbox Release${NC}"
echo -e "  ${CURRENT_VERSION} → ${GREEN}${BOLD}${NEW_VERSION}${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
  warn "DRY RUN - no changes will be made"
  echo ""
fi

# ── Step 1: Pre-flight checks ──────────────────
step 1 "Pre-flight checks"

# Check working directory
if [ -n "$(git status --porcelain)" ]; then
  error "Working directory is not clean. Commit or stash changes first.\n       Run: git status"
fi

# Check we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  warn "Not on main branch (on '$CURRENT_BRANCH'). Continue? [y/N]"
  read -r response
  if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
fi

# Check tag doesn't exist
if git tag -l "v$NEW_VERSION" | grep -q "v$NEW_VERSION"; then
  error "Tag v$NEW_VERSION already exists"
fi

# Check gh CLI
if ! command -v gh &> /dev/null; then
  warn "gh CLI not found. You'll need to push manually."
fi

# Check remote is reachable
if ! git ls-remote --exit-code origin &> /dev/null; then
  error "Cannot reach remote 'origin'"
fi

ok "All pre-flight checks passed"

if [ "$DRY_RUN" = true ]; then
  echo ""
  info "Would update versions in:"
  info "  - package.json"
  info "  - native/package.json"
  info "  - native/Cargo.toml"
  info "Would create commit: chore(release): v$NEW_VERSION"
  info "Would create tag: v$NEW_VERSION"
  info "Would push to origin with tag"
  echo ""
  ok "Dry run complete"
  exit 0
fi

# ── Step 2: Update version numbers ─────────────
step 2 "Updating version numbers"

update_json_version "package.json" "$NEW_VERSION"
ok "package.json → $NEW_VERSION"

update_json_version "native/package.json" "$NEW_VERSION"
ok "native/package.json → $NEW_VERSION"

update_cargo_version "native/Cargo.toml" "$NEW_VERSION"
ok "native/Cargo.toml → $NEW_VERSION"

# ── Step 3-4: Quality checks (optional) ────────
STEP_OFFSET=2
if [ "$SKIP_CHECKS" = false ]; then
  step 3 "Running quality checks"

  info "Type checking..."
  pnpm typecheck
  ok "Typecheck passed"

  info "Linting..."
  pnpm lint
  ok "Lint passed"

  info "Testing..."
  pnpm test
  ok "Tests passed"

  step 4 "Building"
  pnpm build
  ok "Build successful"

  STEP_OFFSET=4
else
  warn "Skipping quality checks (--skip-checks)"
fi

# ── Generate release notes from git log ─────────
generate_release_notes() {
  local last_tag
  last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

  local log_range
  if [ -n "$last_tag" ]; then
    log_range="${last_tag}..HEAD"
  else
    log_range="HEAD"
  fi

  # Categorize commits
  local feats="" fixes="" others=""

  while IFS= read -r line; do
    if [[ "$line" =~ ^feat ]]; then
      feats+="- ${line#*: }"$'\n'
    elif [[ "$line" =~ ^fix ]]; then
      fixes+="- ${line#*: }"$'\n'
    elif [[ "$line" =~ ^(chore\(release\)|Merge) ]]; then
      continue  # skip release commits and merges
    else
      others+="- ${line}"$'\n'
    fi
  done <<< "$(git log "$log_range" --pretty=format:"%s" --no-merges 2>/dev/null)"

  echo "## xToolbox v${NEW_VERSION}"
  echo ""

  if [ -n "$feats" ]; then
    echo "### New Features"
    echo "$feats"
  fi

  if [ -n "$fixes" ]; then
    echo "### Bug Fixes"
    echo "$fixes"
  fi

  if [ -n "$others" ]; then
    echo "### Other Changes"
    echo "$others"
  fi

  echo "---"
  echo ""
  echo "**Full Changelog**: https://github.com/rainx/xplayground/compare/${last_tag}...v${NEW_VERSION}"
}

# ── Step N-1: Commit and tag ────────────────────
step $((STEP_OFFSET + 1)) "Committing and tagging"

RELEASE_NOTES=$(generate_release_notes)

git add package.json native/package.json native/Cargo.toml
git commit -m "chore(release): v$NEW_VERSION"
ok "Committed version bump"

git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
ok "Created tag v$NEW_VERSION"

# ── Step N: Push ────────────────────────────────
step $((STEP_OFFSET + 2)) "Pushing to remote"

git push origin "$CURRENT_BRANCH" --follow-tags
ok "Pushed to origin with tag v$NEW_VERSION"

# ── Done ────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}Release v$NEW_VERSION published!${NC}"
echo ""
echo -e "  ${BOLD}GitHub Actions${NC} will now:"
echo "    1. Run tests"
echo "    2. Build for x64 + arm64"
echo "    3. Create GitHub Release with artifacts"
echo ""
echo -e "  ${BOLD}Monitor:${NC}"
echo "    https://github.com/rainx/xplayground/actions"
echo ""
echo -e "  ${BOLD}Release page:${NC}"
echo "    https://github.com/rainx/xplayground/releases/tag/v$NEW_VERSION"
echo ""
