# 🔓 公开仓库前检查清单

在将 xplayground 设为 Public 之前，请确认以下所有项目。

## ✅ 安全检查（已完成）

- [x] **敏感文件** - 无 .env, .key, .pem 等文件
- [x] **硬编码凭据** - 源代码中无密码、API 密钥
- [x] **个人路径** - 无硬编码的 /Users/rainx 路径
- [x] **配置文件** - 所有示例使用占位符
- [x] **.gitignore** - 正确配置，排除敏感文件
- [x] **Git 历史** - 无敏感文件被提交
- [x] **GitHub Actions** - Secrets 正确使用或已注释

## ⚠️ 需要确认的项目

### 1. Git 提交历史中的邮箱

```
当前作者信息：Jing Xu (RainX) <i@rainx.cc>
```

**选项：**

- [ ] **保持现状** - 公开邮箱（推荐，标准做法）
- [ ] **隐藏邮箱** - 使用 GitHub noreply 邮箱

**如果选择隐藏：**
```bash
# 配置 GitHub noreply 邮箱
git config user.email "rainx@users.noreply.github.com"

# 注意：已经提交的历史仍会显示原邮箱
# 重写历史需要 force push，谨慎操作
```

### 2. 文档中的示例信息

以下文档包含示例凭据（已使用占位符，安全）：
- `DISTRIBUTION.md` - Apple ID 示例
- `BUILD.md` - 签名配置示例
- `scripts/` - 部署脚本示例

**确认：** 所有示例都使用 `your@email.com` 或 `XXXXXXXXXX`

## ✅ 必需文件（已添加）

- [x] **README.md** - 项目介绍和使用指南
- [x] **LICENSE** - MIT 许可证
- [x] **SECURITY.md** - 安全策略和漏洞报告
- [x] **.gitattributes** - 跨平台兼容性

## 📝 建议添加的文件（可选）

### 1. CONTRIBUTING.md（贡献指南）

```bash
# 创建贡献指南
cat > CONTRIBUTING.md << 'EOF'
# 贡献指南

感谢考虑为 xToolbox 贡献！

## 开发流程

1. Fork 仓库
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'feat: add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

## 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 编写测试
- 更新文档

详见 [AGENTS.md](AGENTS.md)。
EOF
```

### 2. .github/ISSUE_TEMPLATE（Issue 模板）

```bash
# 创建 Issue 模板
mkdir -p .github/ISSUE_TEMPLATE

cat > .github/ISSUE_TEMPLATE/bug_report.md << 'EOF'
---
name: Bug Report
about: 报告一个 bug
title: '[Bug] '
labels: bug
---

**描述 Bug**
清晰简洁地描述 bug。

**重现步骤**
1. 打开 '...'
2. 点击 '....'
3. 发现错误

**期望行为**
应该发生什么。

**截图**
如有可能，添加截图。

**环境：**
- macOS 版本：[e.g. Sonoma 14.2]
- xToolbox 版本：[e.g. 0.1.0]
- 架构：[Intel / Apple Silicon]

**额外信息**
其他相关信息。
EOF
```

### 3. CODE_OF_CONDUCT.md（行为准则）

```bash
# 使用 Contributor Covenant
curl -o CODE_OF_CONDUCT.md https://www.contributor-covenant.org/version/2/1/code_of_conduct/code_of_conduct.md
```

## 🔍 最终检查

### 检查命令

```bash
# 1. 检查是否有未追踪的敏感文件
git status --ignored

# 2. 检查所有已提交的文件
git ls-files

# 3. 验证 .gitignore 工作正常
echo ".env" > test.env
git status  # 应该被忽略
rm test.env

# 4. 检查远程仓库
git remote -v

# 5. 查看最近的提交
git log --oneline -10
```

### 文档完整性

- [x] README.md 描述清晰
- [x] 安装说明完整
- [x] 使用示例充足
- [x] 开发文档齐全（AGENTS.md, BUILD.md）
- [x] 许可证已添加

### 功能完整性

- [ ] 应用可以正常构建
- [ ] 所有功能正常工作
- [ ] 测试通过
- [ ] 文档与代码一致

### GitHub 仓库设置（公开后）

1. **仓库描述**
   ```
   免费开源的 macOS 工具箱 - 剪贴板管理器、截图美化工具等实用功能
   ```

2. **Topics（标签）**
   ```
   macos, electron, productivity, clipboard-manager, screenshot,
   typescript, rust, open-source, homebrew
   ```

3. **Website（可选）**
   ```
   https://github.com/rainx/xplayground
   ```

4. **Features**
   - [x] Issues
   - [x] Projects（可选）
   - [x] Wiki（可选）
   - [x] Discussions（可选）

5. **Security**
   - [x] Enable Dependabot alerts
   - [x] Enable Dependabot security updates

## 🚀 公开步骤

### 1. 推送所有更改

```bash
# 确保所有更改已提交
git status

# 推送到远程
git push origin main
```

### 2. 在 GitHub 上设为 Public

1. 访问 https://github.com/rainx/xplayground/settings
2. 滚动到最底部「Danger Zone」
3. 点击「Change visibility」
4. 选择「Make public」
5. 输入仓库名确认：`rainx/xplayground`
6. 点击「I understand, change repository visibility」

### 3. 配置仓库设置

- 添加描述和 topics
- 启用 Issues
- 启用 Security alerts
- 设置 Social preview（可选）

### 4. 验证公开访问

```bash
# 在浏览器隐私模式下访问
open https://github.com/rainx/xplayground
```

确认：
- [ ] README 正确显示
- [ ] 文件可以访问
- [ ] Release 可见
- [ ] Homebrew tap 可访问

## ⚡ 公开后立即操作

### 1. 更新 Homebrew Cask（如果 URL 改变）

```bash
cd homebrew-tap
# 确认 URL 仍然正确
cat Casks/xtoolbox.rb | grep "url"
```

### 2. 测试安装流程

```bash
# 测试 Homebrew 安装
brew untap rainx/tap  # 如果之前添加过
brew tap rainx/tap
brew info xtoolbox
brew install --cask xtoolbox
```

### 3. 分享项目

- [ ] 在社交媒体分享
- [ ] 发布到 Product Hunt（可选）
- [ ] 提交到 awesome lists（可选）

## 📊 统计

公开前的仓库状态：

```bash
# 文件数量
git ls-files | wc -l

# 代码行数
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l

# 提交数量
git rev-list --count HEAD

# 分支数量
git branch -a | wc -l
```

---

## ✅ 最终确认

- [ ] 所有安全检查通过
- [ ] 所有必需文件已添加
- [ ] 文档完整且准确
- [ ] 功能正常工作
- [ ] 已测试构建和打包
- [ ] GitHub Release 已创建
- [ ] Homebrew Tap 已部署
- [ ] 准备好接受社区贡献

**确认后即可公开！** 🎉

---

## 🆘 回滚计划

如果公开后发现问题：

1. **立即设为私有**
   - Settings > Danger Zone > Change visibility > Private

2. **修复问题**
   - 删除敏感信息
   - 更新文档
   - 修复 bug

3. **重新公开**
   - 重复上述检查步骤

---

**准备好了就出发吧！Good luck! 🚀**
