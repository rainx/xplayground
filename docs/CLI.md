# xToolbox CLI 使用说明

xToolbox 提供命令行接口 (CLI)，方便大语言模型和脚本程序化管理应用数据。所有输出均为 JSON 格式，便于解析。

## 基本用法

```bash
pnpm cli <scope> <command> [subcommand] [options]
```

## 可用 Scope

| Scope | 说明 |
|-------|------|
| `clipboard` | 剪贴板管理器 - 管理剪贴板历史和分类 |
| `help` | 显示帮助信息 |

## Clipboard Scope

### Category 命令

管理剪贴板分类。

| 命令 | 说明 |
|------|------|
| `category list` | 列出所有分类 |
| `category get <id>` | 获取指定分类 |
| `category create <name> [options]` | 创建分类 |
| `category update <id> [options]` | 更新分类 |
| `category delete <id>` | 删除分类 |
| `category reorder <id1> <id2> ...` | 重排分类顺序 |

#### Category 选项

| 选项 | 说明 |
|------|------|
| `--name <name>` | 分类名称 |
| `--icon <icon>` | 分类图标 |
| `--color <color>` | 分类颜色 (如 `#ff0000`) |
| `--order <n>` | 排序序号 |

#### Category 示例

```bash
# 列出所有分类
pnpm cli clipboard category list

# 创建分类
pnpm cli clipboard category create "工作" --color "#4285f4"

# 更新分类
pnpm cli clipboard category update cat-xxx --name "新名称" --color "#ea4335"

# 删除分类
pnpm cli clipboard category delete cat-xxx
```

### Item 命令

管理剪贴板项目。

| 命令 | 说明 |
|------|------|
| `item list [options]` | 列出剪贴板项目 |
| `item get <id>` | 获取指定项目 |
| `item delete <id>` | 删除项目 |
| `item search <query> [options]` | 搜索项目 |
| `item assign <itemId> <categoryId>` | 分配项目到分类 |
| `item unassign <itemId> <categoryId>` | 从分类移除项目 |
| `item clear-categories <itemId>` | 清除项目的所有分类 |
| `item list-by-category <categoryId> [options]` | 列出分类中的项目 |
| `item duplicate <itemId>` | 复制项目 |

#### Item 选项

| 选项 | 说明 |
|------|------|
| `--limit <n>` | 返回数量限制 (默认: 50) |
| `--offset <n>` | 分页偏移量 (默认: 0) |
| `--types <types>` | 内容类型过滤 (逗号分隔: `text,image,link,file`) |

#### Item 示例

```bash
# 列出最近 10 条记录
pnpm cli clipboard item list --limit 10

# 搜索包含 "hello" 的项目
pnpm cli clipboard item search "hello"

# 搜索文本和链接类型
pnpm cli clipboard item search "example" --types text,link

# 获取项目详情
pnpm cli clipboard item get 1769914019503-kn7nknd13

# 将项目分配到分类
pnpm cli clipboard item assign 1769914019503-kn7nknd13 cat-1769871784130-hmrf21

# 列出分类中的项目
pnpm cli clipboard item list-by-category cat-1769871784130-hmrf21 --limit 20

# 删除项目
pnpm cli clipboard item delete 1769914019503-kn7nknd13
```

## 输出格式

所有命令输出统一的 JSON 格式：

### 成功响应

```json
{
  "success": true,
  "data": { ... }
}
```

### 错误响应

```json
{
  "success": false,
  "error": "错误信息"
}
```

## 数据结构

### Category

```typescript
interface Category {
  id: string;           // 格式: cat-{timestamp}-{random}
  name: string;         // 分类名称
  icon?: string;        // 可选图标
  color: string;        // 颜色值 (如 '#4285f4')
  order: number;        // 排序序号
  createdAt: string;    // ISO 8601 时间戳
  updatedAt: string;    // 最后修改时间
}
```

### ClipboardItem

```typescript
interface ClipboardItem {
  id: string;                    // 项目 ID
  type: 'text' | 'rich_text' | 'image' | 'file' | 'link' | 'color';
  createdAt: string;             // 创建时间 (ISO 8601)
  sourceApp: {                   // 来源应用 (可能为 null)
    bundleId: string;
    name: string;
  } | null;
  textContent?: { ... };         // 文本内容
  imageContent?: { ... };        // 图片内容
  fileContent?: { ... };         // 文件内容
  linkContent?: { ... };         // 链接内容
  searchableText: string;        // 可搜索文本
  isPinned: boolean;             // 是否固定
  pinboardIds: string[];         // 所属分类 ID 数组
}
```

## 注意事项

1. **环境要求**: CLI 通过 Electron 运行，需要先构建项目 (`pnpm build`)
2. **数据加密**: 所有数据使用 AES-256-GCM 加密存储，CLI 会自动处理解密
3. **环境变量**: 如遇到 `Cannot read properties of undefined (reading 'whenReady')` 错误，请检查并取消 `ELECTRON_RUN_AS_NODE` 环境变量：
   ```bash
   unset ELECTRON_RUN_AS_NODE
   ```

## 扩展

未来新增工具时，将添加新的 scope。例如：

```bash
# 当前 clipboard scope
pnpm cli clipboard category list

# 未来可能的其他 scope
pnpm cli notes list
pnpm cli snippets search "function"
```
