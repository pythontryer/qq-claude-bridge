# QQ Bot ↔ Claude Bridge

桥接 **QQ 开放平台机器人** 到 **Anthropic 兼容 API** (DeepSeek / Claude) 的服务。

> 收到 QQ 私聊或群聊 @消息后，调用 AI API 获取回复，再将回复发回给 QQ 用户。

---

## 功能特性

- **私聊 & 群聊双支持** — 同时处理 QQ 私聊和群聊 @消息
- **Anthropic 兼容 API** — 默认接入 DeepSeek，也可切换任意 Anthropic 兼容端点
- **超长消息自动分段** — QQ 消息长度限制约 4000 字符，超长时自动拆分发送
- **每用户速率限制** — 同一用户 3 秒内仅处理一条消息，防止刷屏
- **沙箱模式** — 支持 QQ 开放平台沙箱环境调试
- **群聊引用回复** — 群聊时自动附带引用原文
- **PM2 就绪** — 内置 pm2 启动脚本，生产环境部署友好

## 架构示意

```
┌─────────┐    WebSocket     ┌──────────────┐    HTTP/HTTPS    ┌───────────────┐
│  QQ Bot  │ ◄─────────────► │ qq-claude-   │ ◄─────────────► │ Anthropic 兼容 │
│ 开放平台 │                  │ bridge       │                  │ API (DeepSeek) │
└─────────┘                  └──────────────┘                  └───────────────┘
                                   │
                                   │ 读取配置
                                   ▼
                              ┌──────────┐
                              │  .env    │
                              └──────────┘
```

## 快速开始

### 前置要求

- **Node.js >= 18**
- **QQ 机器人** — 在 [QQ 开放平台](https://q.qq.com) 注册并创建机器人，获取 AppID 和 AppSecret
- **API Key** — 注册 [DeepSeek](https://platform.deepseek.com) 并创建 API Key（或使用其他 Anthropic 兼容 API）

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/你的用户名/qq-claude-bridge.git
cd qq-claude-bridge

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的凭据（见下方配置说明）

# 4. 启动服务
npm start
```

### PM2 生产部署

```bash
npm install -g pm2
npm run pm2
pm2 save
pm2 startup
```

## 配置说明

所有配置通过环境变量进行，编辑 `.env` 文件：

| 变量 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| `QQ_APP_ID` | 是 | QQ 开放平台机器人的 AppID | — |
| `QQ_APP_SECRET` | 是 | QQ 开放平台机器人的 AppSecret | — |
| `ANTHROPIC_API_KEY` | 是 | DeepSeek 或 Claude 的 API Key | — |
| `ANTHROPIC_BASE_URL` | 否 | Anthropic 兼容 API 端点地址 | `https://api.deepseek.com/anthropic` |
| `SANDBOX` | 否 | QQ 沙箱模式（审核通过后设为 `false`） | `true` |
| `SYSTEM_PROMPT` | 否 | AI 助手的系统提示词 | `你是一个运行在QQ上的AI助手，请用中文回复...` |
| `MODEL` | 否 | 使用的模型名称 | `deepseek-v4-pro` |

### 使用 Claude 官方 API

如要切换为 Anthropic 官方 Claude API，修改 `.env`：

```env
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_API_KEY=sk-ant-你的ClaudeKey
MODEL=claude-sonnet-4-20250514
```

## 项目文件结构

```
qq-claude-bridge/
├── index.js          # 主程序入口
├── package.json      # 依赖与脚本
├── .env.example      # 环境变量模板
├── .gitignore        # Git 忽略规则
├── LICENSE           # MIT 许可证
├── README.md         # 本文件
└── CONTRIBUTING.md   # 贡献指南
```

## 技术栈

- [qq-official-bot](https://www.npmjs.com/package/qq-official-bot) — QQ 开放平台官方机器人 SDK
- [@anthropic-ai/sdk](https://www.npmjs.com/package/@anthropic-ai/sdk) — Anthropic API 客户端
- [dotenv](https://www.npmjs.com/package/dotenv) — 环境变量加载
- [pm2](https://pm2.keymetrics.io/) — 进程管理（可选）

## 许可证

[MIT](LICENSE)
