# 设计系统规范 (Design System)

## 视觉tokens（CSS变量）

所有颜色、间距、圆角必须使用 CSS 变量，不要硬编码 Tailwind 颜色（如 `bg-white`、`text-gray-800`、`bg-blue-500`）。

### 表面 (Surfaces)
- `--surface-app`: 主背景（深色: #09090b，浅色: #fafafa）
- `--surface-elevated`: 弹窗/下拉菜单背景
- `--surface-card`: 卡片背景
- `--surface-hover`: 悬停背景
- `--surface-active`: 激活背景

### 文字
- `--text-primary`: 主要文字
- `--text-secondary`: 次要文字
- `--text-muted`: 弱化文字
- `--text-disabled`: 禁用文字

### 边框
- `--border-subtle`: 极淡边框
- `--border-default`: 默认边框
- `--border-strong`: 强调边框

### 强调色（主题色，可随主题切换）
- `--accent`: 主强调色
- `--accent-hover`: 悬停色
- `--accent-muted`: 低饱和度版（10% opacity）
- `--accent-border`: 边框版（20% opacity）

### 状态色
- `--status-success`: #10b981
- `--status-warning`: #f59e0b
- `--status-error`: #ef4444
- `--status-info`: #3b82f6

### 圆角
- `--radius-sm`: 6px
- `--radius-md`: 8px
- `--radius-lg`: 12px
- `--radius-xl`: 16px

## 排版
- 字体: `Geist`（sans），`Geist Mono`（mono/数字）
- 标题: `font-semibold tracking-tight`
- 正文: `text-sm leading-relaxed`
- 标签/辅助: `text-xs text-[var(--text-muted)]`
- 数据/数字: `font-mono`

## 组件规范

### 卡片
```html
<div class="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5">
  <!-- content -->
</div>
```

### 按钮（使用 BaseButton 组件）
- variant: primary / secondary / danger / success / ghost / outline
- size: sm / md / lg
- 不要用 `bg-blue-500`、`bg-gray-100` 等硬编码颜色

### 输入框
```html
<input class="rounded-lg border border-[var(--border-default)] bg-[var(--surface-app)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20">
```

### 弹窗/下拉菜单
```html
<div class="rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] shadow-xl">
```

### 标签/Badge
```html
<span class="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-[var(--accent-muted)] text-[var(--accent)]">
```

## 禁止的 AI Slop 模式

1. **禁止硬编码 Tailwind 颜色**: 不用 `bg-white dark:bg-gray-800`、`text-gray-900 dark:text-gray-100`、`bg-blue-500` 等
2. **禁止三栏等分特征卡片**: 不要三个一模一样横排的卡片
3. **禁止居中 Hero**: 不要大标题居中 + 副标题居中 + 按钮居中
4. **禁止 AI 紫色渐变**: 不要 `from-purple-500 to-blue-500` 渐变
5. **禁止 Inter 字体**: 用 Geist
6. **禁止通用边框+阴影+白底卡片**: 使用 CSS 变量背景色
7. **禁止纯黑 #000 或纯白 #fff**: 使用 zinc 色系
8. **禁止 em-dash (—)**: 不使用破折号字符

## 禁止的 Tailwind 颜色类（必须替换）

| 禁止 | 替换为 |
|------|--------|
| `bg-white` / `dark:bg-gray-800` | `bg-[var(--surface-elevated)]` |
| `bg-gray-50` / `dark:bg-gray-900` | `bg-[var(--surface-app)]` |
| `bg-gray-100` / `dark:bg-gray-700` | `bg-[var(--surface-hover)]` |
| `text-gray-900` / `dark:text-gray-100` | `text-[var(--text-primary)]` |
| `text-gray-700` / `dark:text-gray-300` | `text-[var(--text-secondary)]` |
| `text-gray-500` / `dark:text-gray-400` | `text-[var(--text-muted)]` |
| `border-gray-200` / `dark:border-gray-700` | `border-[var(--border-default)]` |
| `bg-blue-500` / `bg-blue-600` | `bg-[var(--accent)]` |
| `text-blue-500` / `text-blue-600` | `text-[var(--accent)]` |
| `bg-green-500` / `bg-green-600` | `bg-[var(--status-success)]` |
| `bg-red-500` / `bg-red-600` | `bg-[var(--status-error)]` |
| `text-green-500` | `text-[var(--status-success)]` |
| `text-red-500` | `text-[var(--status-error)]` |
| `focus:ring-blue-500` | `focus:ring-[var(--accent)]/20` |
| `shadow-2xl` | `shadow-lg` |

## 布局原则

1. **max-width 容器**: 页面内容区域使用 `mx-auto max-w-7xl` 或 `max-w-5xl`
2. **响应式间距**: 移动端 `p-4`，桌面端 `p-6` 或 `p-8`
3. **Grid 优先于 Flex 计算**: 用 `grid grid-cols-1 md:grid-cols-3 gap-4` 而非 `w-[calc(33%-1rem)]`
4. **统一的 section 间距**: `space-y-6` 或 `space-y-4`
5. **页面标题**: `text-lg font-semibold tracking-tight` + 可选的 `text-sm text-[var(--text-muted)]` 副标题

## 动效

- 过渡: `transition-all duration-200` 或 `transition-colors duration-150`
- 页面切换: 使用 `<Transition name="page">`
- 弹窗: 使用 `<Transition name="scale">`
- 不要用 `transition: all 0.3s ease` 这种通用写法
