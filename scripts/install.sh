#!/bin/bash
# xToolbox 安装脚本
# 用于未签名版本的安装

set -e

APP_NAME="xToolbox.app"
INSTALL_DIR="/Applications"

echo "🚀 Installing xToolbox..."
echo ""

# 检查应用是否存在
if [ ! -d "$APP_NAME" ]; then
  echo "❌ Error: $APP_NAME not found in current directory"
  echo "Please run this script from the directory containing $APP_NAME"
  exit 1
fi

# 移除隔离属性 (Gatekeeper quarantine)
echo "📝 Removing quarantine attributes..."
xattr -cr "$APP_NAME"

# 复制到 Applications
echo "📦 Installing to $INSTALL_DIR..."
if [ -d "$INSTALL_DIR/$APP_NAME" ]; then
  echo "⚠️  $APP_NAME already exists in $INSTALL_DIR"
  read -p "Overwrite? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 1
  fi
  rm -rf "$INSTALL_DIR/$APP_NAME"
fi

cp -r "$APP_NAME" "$INSTALL_DIR/"

echo ""
echo "✅ xToolbox installed successfully!"
echo ""
echo "You can now:"
echo "  • Open from Applications folder"
echo "  • Search in Spotlight (Cmd+Space)"
echo "  • Add to Dock"
echo ""
echo "Global shortcuts:"
echo "  • Alt+Cmd+V - Clipboard Manager"
echo "  • Alt+Cmd+A - Screenshot Snap"
echo ""
