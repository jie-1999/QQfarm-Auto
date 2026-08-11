# AGENTS.md

## 项目概览

QQ 农场多账号挂机 + Web 控制面板。全栈自动化机器人，自动执行种植、收获、施肥、偷菜、日常任务、仓库管理等，通过 Web 面板管理多账号。

- **Monorepo**: pnpm workspace（`core` 后端 + `web` 前端）
- **包管理器**: pnpm@10.30.2（必须使用 pnpm，勿用 npm/yarn）
- **Node.js**: v20+（本地验证使用 v22）

## 目录结构

```
├── core/                 # 后端（CommonJS）
│   ├── client.js         # 主入口：启动 admin 服务器 + 管理 worker 进程
│   ├── Dockerfile        # Docker 构建文件
│   └── src/
│       ├── config/       # 配置（config.js, gameConfig.js, runtime-paths.js）
│       ├── controllers/  # HTTP 控制器（admin.js: Express 服务器）
│       ├── core/         # worker 线程逻辑（worker.js）
│       ├── gameConfig/   # 游戏数据（Plant.json, ItemInfo.json, RoleLevel.json, 种子图片）
│       ├── models/       # 数据模型（store.js, user-store.js）
│       ├── proto/        # Protocol Buffer 定义（17 个 .proto 文件）
│       ├── runtime/      # 运行时引擎（runtime-engine.js, worker-manager.js）
│       ├── services/     # 业务服务层（farm, friend, task, warehouse, login 等）
│       └── utils/        # 工具（crypto-wasm.js, network.js, proto.js, tsdk.wasm）
├── web/                  # 前端（ESM，Vue 3 SPA）
│   ├── vite.config.ts
│   ├── uno.config.ts     # UnoCSS 配置
│   └── src/
│       ├── api/          # API 客户端层
│       ├── components/   # 通用组件
│       ├── layouts/      # 布局组件
│       ├── router/       # Vue Router 配置
│       ├── stores/       # Pinia 状态管理
│       └── views/        # 页面视图
├── docker-compose.yml    # Docker 编排
├── docs/                 # 项目文档（ARCHITECTURE.md, Update.log）
├── pnpm-workspace.yaml   # workspace 配置
└── package.json          # 根脚本
```

## 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Node.js + Express + Socket.IO + ws + Protobuf.js + Winston |
| 前端 | Vue 3 (Composition API) + TypeScript + Vite + Pinia + Vue Router + UnoCSS |
| 数据 | 本地 JSON 文件（`core/data/`，无数据库） |
| 通信 | REST API + Socket.IO 实时推送；Worker 线程对接游戏 WebSocket |

## 常用命令

```bash
# 安装依赖（根目录）
pnpm install

# 开发运行：构建前端 + 启动后端（监听 3007 端口）
pnpm dev

# 仅启动后端
pnpm dev:core

# 仅启动前端开发服务器（Vite HMR）
pnpm dev:web

# 构建前端
pnpm build          # 等价于 pnpm build:web

# Lint（自动修复）
pnpm lint           # 前后端都跑
pnpm lint:core
pnpm lint:web

# 打包独立可执行文件（pkg）
pnpm package:win
pnpm package:linux
pnpm package:mac
pnpm package:release

# Docker 部署
docker compose -f docker-compose.yml up -d --build
```

## 关键信息

- **默认端口**: 3007
- **默认登录**: admin / admin（首次部署后务必修改）
- **Web 面板**: 后端 Express 直接托管 `web/dist` 构建产物

## 运行架构

```
浏览器 (Vue) ←HTTP/Socket.IO→ Express (3007) ←IPC→ Runtime Engine ←Worker 线程→ 游戏服务器 (WebSocket + Protobuf)
```

- 每个游戏账号对应一个 Worker Thread，由 `runtime-engine.js` 管理
- `core/client.js` 启动 admin 服务器并管理 worker 进程
- `core/src/controllers/admin.js` 是 Express + Socket.IO 的 HTTP 服务器

## 代码约定

- **后端**: CommonJS（`require`/`module.exports`），无 `"type": "module"`
- **前端**: ESM + TypeScript，`<script setup lang="ts">`，路径别名 `@/` 指向 `web/src`
- **样式**: UnoCSS 原子类 + CSS 变量主题（`--theme-primary`, `--theme-gradient`）
- **图标**: Iconify carbon 图标集（如 `i-carbon-*`）
- **数据持久化**: 修改 `core/data/` 下的 JSON 文件时保持结构稳定，注意读写并发
- **实时通信**: 前端状态通过 Socket.IO 推送更新（stores 层订阅）

## 注意事项

- 勿提交 `core/data/*.json`、日志、`node_modules`、`web/dist`（已在 `.gitignore` 中）
- 游戏协议依赖 Protobuf 定义（`core/src/proto/*.proto`）与 WASM 加密（`tsdk.wasm`），改动需谨慎
- 前端改动后需 `pnpm build:web` 重新构建，后端才能服务最新页面
