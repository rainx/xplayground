#!/bin/bash
set -e

# 准备发布的辅助脚本
# Usage: ./scripts/prepare-release.sh <version>

if [ -z "$1" ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 0.1.1"
  exit 1
fi

VERSION=$1
echo "📦 Preparing release v$VERSION"

# 1. 检查工作区是否干净
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Working directory is not clean. Commit or stash changes first."
  exit 1
fi

# 2. 更新版本号
echo "📝 Updating version numbers..."
npm version $VERSION --no-git-tag-version
cd native && npm version $VERSION --no-git-tag-version && cd ..

# 3. 更新 package-lock.json (如果存在)
if [ -f "package-lock.json" ]; then
  npm install --package-lock-only
fi

# 4. 运行测试
echo "🧪 Running tests..."
pnpm typecheck
pnpm lint
pnpm test

# 5. 构建
echo "🔨 Building..."
pnpm build

# 6. 提交版本更新
echo "💾 Committing version bump..."
git add package.json native/package.json
git commit -m "chore(release): bump version to $VERSION"

# 7. 创建 tag
echo "🏷️  Creating tag v$VERSION..."
git tag -a "v$VERSION" -m "Release v$VERSION"

echo ""
echo "✅ Release v$VERSION prepared!"
echo ""
echo "Next steps:"
echo "  1. Review the changes: git show"
echo "  2. Push the tag: git push --follow-tags"
echo "  3. GitHub Actions will automatically build and create the release"
echo ""
echo "Or build locally:"
echo "  pnpm package  # Build locally"
echo "  gh release create v$VERSION dist/*.{dmg,zip}"
