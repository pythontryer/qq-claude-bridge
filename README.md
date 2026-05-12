# QQ Bot ↔ Claude Bridge

桥接 **QQ 开放平台机器人** 到 **Anthropic 兼容 API** (DeepSeek / Claude) 的 Node.js 服务。

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

---

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

---

## 部署指南

### 第 1 步：注册 QQ 机器人

1. 打开 [QQ 开放平台](https://q.qq.com)，登录后进入「应用管理」
2. 点击「创建机器人」→ 填写名称、简介等信息
3. 创建完成后，进入「开发设置」页面
4. 记录 **AppID**（机器人 ID）和 **AppSecret**（机器人密钥）

### 第 2 步：获取 AI API Key

1. 注册 [DeepSeek 开放平台](https://platform.deepseek.com)（或其他 Anthropic 兼容 API）
2. 在「API Keys」页面创建一个新 Key
3. 复制保存该 Key

> 也可使用 Anthropic 官方 API，见下方[配置说明](#使用-claude-官方-api)。

### 第 3 步：部署服务

**本地 / 开发机运行：**

```bash
# 克隆仓库
git clone https://github.com/pythontryer/qq-claude-bridge.git
cd qq-claude-bridge

# 安装依赖
npm install

# 创建配置文件
cp .env.example .env

# 编辑 .env，填入你的 AppID、AppSecret 和 API Key
# （用任意文本编辑器打开 .env 文件修改）

# 启动服务（沙箱模式，用于测试）
npm start
```

**服务器生产部署（使用 PM2）：**

```bash
# 安装 PM2
npm install -g pm2

# 克隆并配置（同上）
git clone https://github.com/pythontryer/qq-claude-bridge.git
cd qq-claude-bridge
npm install
cp .env.example .env
# 编辑 .env 填入凭据

# 使用 PM2 启动（自动重启、开机自启）
npm run pm2
pm2 save
pm2 startup
```

### 第 4 步：从沙箱到正式上线

1. 先在 `.env` 中保持 `SANDBOX=true`，在 QQ 开放平台沙箱环境中测试
2. 确认机器人收发消息正常后，在 QQ 开放平台提交审核
3. 审核通过后，将 `.env` 中的 `SANDBOX` 改为 `false`
4. 重启服务：`npm run pm2 && pm2 restart qq-claude-bridge`

---

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

---

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

---

## 常见问题

**启动时提示「请设置 QQ_APP_ID 和 QQ_APP_SECRET 环境变量」**

检查 `.env` 文件是否存在且已正确填写。确保 `.env` 文件与 `index.js` 在同一目录下。

**机器人不回复消息**

- 确认 `.env` 中 `SANDBOX=true`（未审核的机器人必须使用沙箱模式）
- 检查 QQ 开放平台「开发设置」中的 WebSocket 地址是否正确
- 查看终端日志输出排查具体错误

**消息回复超长被截断**

代码已内置分段逻辑（每段不超过 1800 字符），正常情况下不会被截断。如仍有问题，可在 `index.js` 中调整分段大小。

---

## 技术栈

- [qq-official-bot](https://www.npmjs.com/package/qq-official-bot) — QQ 开放平台官方机器人 SDK
- [@anthropic-ai/sdk](https://www.npmjs.com/package/@anthropic-ai/sdk) — Anthropic API 客户端
- [dotenv](https://www.npmjs.com/package/dotenv) — 环境变量加载
- [pm2](https://pm2.keymetrics.io/) — 进程管理（可选）

---

## 许可证

[MIT](LICENSE)
