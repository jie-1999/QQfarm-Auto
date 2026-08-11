# QQ农场自动化机器人 - 系统架构文档

## 项目概述

QQ农场自动化机器人是一个基于Node.js和Vue.js的全栈Web应用，用于自动化管理QQ农场游戏中的种植、收获、好友互动等操作。系统采用monorepo架构，包含核心后端服务和Web管理面板。

## 系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    用户浏览器                                │
│                    (Vue.js Web面板)                         │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/WebSocket
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 Express HTTP服务器                           │
│                 (端口: 3007)                                │
│                 - REST API                                  │
│                 - WebSocket (Socket.IO)                     │
│                 - 静态文件服务                               │
└─────────────────────┬───────────────────────────────────────┘
                      │ IPC/Worker Threads
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                运行时引擎 (RuntimeEngine)                    │
│                - 进程管理                                    │
│                - 状态同步                                    │
│                - 配置管理                                    │
└─────────────────────┬───────────────────────────────────────┘
                      │ Worker Threads
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                工作线程 (Worker Threads)                     │
│                - 每个账号一个独立线程                        │
│                - WebSocket连接到游戏服务器                   │
│                - 自动化任务执行                              │
└─────────────────────┬───────────────────────────────────────┘
                      │ WebSocket
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              QQ农场游戏服务器                                │
│              wss://gate-obt.nqf.qq.com/prod/ws              │
└─────────────────────────────────────────────────────────────┘
```

### 核心模块

#### 1. 后端核心 (core/)

**目录结构:**
```
core/
├── client.js              # 主程序入口
├── src/
│   ├── config/           # 配置管理
│   ├── controllers/      # HTTP路由控制器
│   ├── core/            # 核心业务逻辑
│   ├── gameConfig/      # 游戏配置数据
│   ├── models/          # 数据模型
│   ├── proto/           # Protocol Buffer定义
│   ├── runtime/         # 运行时引擎
│   ├── services/        # 业务服务层
│   └── utils/           # 工具函数
```

**主要组件:**

- **client.js**: 主程序入口，负责启动Web服务器和管理子进程
- **runtime-engine.js**: 运行时引擎，管理多个Worker线程
- **worker.js**: 工作线程，负责单个账号的自动化任务
- **admin.js**: HTTP服务器，提供REST API和WebSocket服务

#### 2. Web前端 (web/)

**目录结构:**
```
web/
├── src/
│   ├── api/            # API客户端
│   ├── components/     # Vue组件
│   ├── layouts/        # 布局组件
│   ├── router/         # 路由配置
│   ├── stores/         # Pinia状态管理
│   ├── views/          # 页面视图
│   └── main.ts         # 应用入口
├── vite.config.ts      # Vite构建配置
└── package.json        # 依赖配置
```

**主要视图:**
- Dashboard: 主控制面板，显示账号状态和日志
- Friends: 好友管理界面
- Settings: 系统设置
- Analytics: 数据分析
- Personal: 个人中心

## 技术栈

### 后端技术

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 20.x | 运行时环境 |
| Express | 4.21.0 | HTTP服务器 |
| Socket.IO | 4.8.3 | WebSocket通信 |
| WebSocket (ws) | 8.19.0 | 游戏服务器连接 |
| Protobuf.js | 8.0.0 | 协议编解码 |
| Winston | 3.18.3 | 日志记录 |
| Axios | 1.6.0 | HTTP客户端 |
| node-fetch | 2.7.0 | HTTP请求 |
| QRCode | 1.5.4 | 二维码生成 |
| Pushoo | 0.1.11 | 消息推送 |

### 前端技术

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue.js | 3.5.25 | UI框架 |
| TypeScript | 5.9.3 | 类型系统 |
| Vite | 7.3.1 | 构建工具 |
| Pinia | 3.0.4 | 状态管理 |
| Vue Router | 5.0.3 | 路由管理 |
| UnoCSS | 66.5.12 | 原子化CSS |
| Socket.IO Client | 4.8.3 | WebSocket客户端 |
| Axios | 1.13.5 | HTTP客户端 |
| VueUse | 14.2.1 | 工具函数库 |

### 开发工具

| 工具 | 版本 | 用途 |
|------|------|------|
| ESLint | 9.39.1 | 代码检查 |
| pkg | 5.8.1 | 打包为可执行文件 |
| Docker | - | 容器化部署 |
| pnpm | 10.30.2 | 包管理器 |

## 通信协议

### 1. Web管理面板 ↔ 后端服务器

**HTTP REST API:**
- `POST /api/login` - 用户登录
- `GET /api/status` - 获取账号状态
- `POST /api/automation` - 更新自动化设置
- `GET /api/lands` - 获取农田信息
- `GET /api/friends` - 获取好友列表
- 等等...

**WebSocket (Socket.IO):**
- `status:update` - 实时状态更新
- `log:new` - 实时日志推送
- `account-log:new` - 账号特定日志

### 2. 后端服务器 ↔ Worker线程

**IPC通信 (Inter-Process Communication):**
```javascript
// 主进程 → Worker
{ type: 'start', config: { code, platform } }
{ type: 'stop' }
{ type: 'config_sync', config: {...} }
{ type: 'api_call', id, method, args }

// Worker → 主进程
{ type: 'status_sync', data: {...} }
{ type: 'log', data: {...} }
{ type: 'stat_update', data: { gold, exp } }
```

### 3. Worker线程 ↔ 游戏服务器

**WebSocket + Protocol Buffers:**
- 使用Protobuf进行消息编解码
- 自定义加密/解密算法 (crypto-wasm)
- 心跳保活机制 (25秒间隔)

## 数据存储

### 本地JSON文件存储

```
data/
├── store.json           # 运行时配置
├── accounts.json        # 账号列表
├── users.json          # 用户信息
├── cards.json          # 卡密数据
├── login-logs.json     # 登录日志
├── known_friend_gids/  # 好友GID缓存
│   └── {accountId}.json
└── logs/               # 日志文件
    └── *.log
```

### 内存数据结构

- **Worker状态**: 每个账号的实时状态 (金币、经验、等级等)
- **调度器状态**: 定时任务的执行状态
- **网络状态**: WebSocket连接状态

## 安全机制

### 1. 用户认证

- **Token-based认证**: 使用JWT风格的Token
- **密码加密**: SHA256哈希
- **访问控制**: 基于角色的权限管理 (admin/user)
- **登录保护**: 速率限制、账号锁定

### 2. 数据隔离

- **用户隔离**: 普通用户只能访问自己的账号
- **WebSocket房间**: 按账号ID分组推送
- **权限检查**: 每个API请求都验证用户权限

### 3. 网络安全

- **CORS配置**: 限制允许的源
- **输入验证**: 所有API参数都进行验证
- **错误处理**: 统一的错误响应格式

## 自动化功能

### 1. 农场管理

- **自动种植**: 根据策略自动选择种子种植
- **自动收获**: 成熟后自动收获
- **自动施肥**: 智能施肥策略
- **自动除草/除虫**: 定期检查并处理

### 2. 好友互动

- **自动偷菜**: 定期检查好友农场
- **自动帮助**: 帮好友浇水、除草、除虫
- **黑名单管理**: 排除指定好友

### 3. 每日任务

- **邮箱奖励**: 自动领取邮件奖励
- **商城礼包**: 自动购买免费礼包
- **分享奖励**: 自动完成分享任务
- **VIP/月卡礼包**: 自动领取会员奖励

### 4. 仓库管理

- **自动出售**: 收获后自动出售水果
- **物品使用**: 自动使用背包物品
- **化肥管理**: 智能化肥购买策略

## 部署方式

### 1. Docker部署

```bash
# 构建并启动
docker compose -f docker-compose.yml up -d --build

# 查看日志
docker compose logs -f

# 停止服务
docker compose down
```

### 2. 直接运行

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 生产构建
pnpm build
pnpm package:win  # Windows
pnpm package:linux  # Linux
pnpm package:mac  # macOS
```

### 3. 环境变量

```env
PORT=3007              # 服务端口
NODE_ENV=production    # 运行环境
ADMIN_PORT=3007        # 管理面板端口
ADMIN_PASSWORD=***     # 管理员密码
TZ=Asia/Shanghai       # 时区设置
```

## 性能优化

### 1. 并发处理

- **Worker Threads**: 每个账号独立线程，避免阻塞
- **异步IO**: 所有IO操作都是异步的
- **事件驱动**: 使用EventEmitter进行模块间通信

### 2. 缓存策略

- **内存缓存**: 频繁访问的数据缓存在内存
- **文件缓存**: 好友列表等数据缓存到文件
- **状态快照**: 定期保存运行状态

### 3. 资源管理

- **进程隔离**: 崩溃不影响其他账号
- **优雅关闭**: 收到信号后保存状态再退出
- **健康检查**: Docker健康检查确保服务可用

## 扩展性

### 1. 插件化服务

- **服务层架构**: 每个功能都是独立的服务模块
- **可插拔调度器**: 支持自定义调度策略
- **消息推送**: 支持多种推送渠道 (Telegram、钉钉、微信等)

### 2. 多平台支持

- **游戏平台**: 支持QQ、微信等平台
- **操作系统**: 支持Windows、Linux、macOS
- **容器化**: 支持Docker部署

### 3. API扩展

- **RESTful设计**: 标准的REST API
- **WebSocket实时通信**: 支持实时数据推送
- **插件API**: 支持自定义功能扩展

## 开发指南

### 1. 代码规范

- **ESLint**: 使用@antfu/eslint-config
- **TypeScript**: 前端使用TypeScript
- **代码格式**: 使用Prettier格式化

### 2. 测试

- **单元测试**: 使用Jest或Vitest
- **集成测试**: API端点测试
- **E2E测试**: 使用Playwright

### 3. 调试

- **日志系统**: Winston日志记录
- **调试模式**: 支持详细日志输出
- **性能监控**: 内置性能统计

## 故障排查

### 常见问题

1. **连接失败**: 检查网络和游戏服务器状态
2. **登录失败**: 检查账号密码和验证码
3. **任务不执行**: 检查自动化开关和权限
4. **性能问题**: 检查Worker线程状态

### 日志查看

```bash
# 查看实时日志
docker compose logs -f

# 查看特定服务日志
tail -f data/logs/worker-*.log
```

## 版本历史

查看 `Update.log` 文件获取详细的版本更新记录。

## 免责声明

本项目仅供学习与研究用途。使用本工具可能违反游戏服务条款，由此产生的一切后果由使用者自行承担。
