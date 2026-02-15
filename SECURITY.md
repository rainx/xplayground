# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

如果你发现了安全漏洞，请**不要**公开提交 Issue。

### 报告方式

请通过以下方式私密报告：

1. **GitHub Security Advisories**（推荐）
   - 访问 https://github.com/rainx/xplayground/security/advisories/new
   - 填写漏洞详情

2. **Email**
   - 发送邮件至：i@rainx.cc
   - 主题：[Security] xToolbox 安全漏洞报告

### 报告内容应包括

- 漏洞类型和影响范围
- 重现步骤
- 可能的修复方案（如有）
- 你的联系方式

### 响应时间

- 24 小时内确认收到
- 7 天内初步评估
- 30 天内发布修复（视严重程度）

## Security Measures

### 代码安全

- ✅ 所有依赖定期更新
- ✅ 使用 TypeScript 严格模式
- ✅ ESLint 代码质量检查
- ✅ 无已知的高危漏洞

### 数据安全

- ✅ 剪贴板数据本地存储（`~/Library/Application Support/xtoolbox`）
- ✅ 使用 macOS Keychain 存储加密密钥
- ✅ 不收集用户数据
- ✅ 无网络请求（除自动更新检查）

### 系统权限

应用请求的权限：
- **辅助功能** - 用于全局快捷键
- **屏幕录制** - 用于截图功能
- **文件访问** - 用于保存剪贴板历史

所有权限都有明确用途，不会滥用。

## Known Issues

目前没有已知的安全问题。

## Updates

安全更新将通过以下方式通知：

- GitHub Security Advisories
- Release Notes
- 应用内更新提示（如果已启用）

## Third-Party Dependencies

我们会定期审查和更新第三方依赖：

```bash
# 检查已知漏洞
pnpm audit

# 更新依赖
pnpm update
```

## Transparency

- 所有代码开源可审查
- 构建过程透明（见 BUILD.md）
- 欢迎安全审计

---

感谢帮助改进 xToolbox 的安全性！
