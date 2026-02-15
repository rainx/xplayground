#!/bin/bash
# macOS 公证脚本
# 需要配置环境变量: APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <path-to-dmg>"
  echo "Example: $0 dist/xToolbox-0.1.0-mac-x64.dmg"
  exit 1
fi

DMG_PATH="$1"

# 检查环境变量
if [ -z "$APPLE_ID" ] || [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ] || [ -z "$APPLE_TEAM_ID" ]; then
  echo "❌ Error: Missing required environment variables"
  echo ""
  echo "Please set the following:"
  echo "  export APPLE_ID='your@email.com'"
  echo "  export APPLE_APP_SPECIFIC_PASSWORD='xxxx-xxxx-xxxx-xxxx'"
  echo "  export APPLE_TEAM_ID='XXXXXXXXXX'"
  echo ""
  echo "Get App-Specific Password:"
  echo "  https://appleid.apple.com/account/manage"
  exit 1
fi

echo "📝 Notarizing $DMG_PATH..."
echo ""

# 提交公证
echo "Submitting to Apple notary service..."
SUBMISSION_OUTPUT=$(xcrun notarytool submit "$DMG_PATH" \
  --apple-id "$APPLE_ID" \
  --password "$APPLE_APP_SPECIFIC_PASSWORD" \
  --team-id "$APPLE_TEAM_ID" \
  --wait)

echo "$SUBMISSION_OUTPUT"

# 检查是否成功
if echo "$SUBMISSION_OUTPUT" | grep -q "status: Accepted"; then
  echo ""
  echo "✅ Notarization successful!"

  # 装订公证票据
  echo "📎 Stapling notarization ticket..."
  xcrun stapler staple "$DMG_PATH"

  echo ""
  echo "🎉 Done! DMG is now notarized and stapled."
  echo ""
  echo "Verify with:"
  echo "  spctl -a -vvv -t install $DMG_PATH"
else
  echo ""
  echo "❌ Notarization failed!"
  echo ""
  echo "Check the logs above for details."
  exit 1
fi
