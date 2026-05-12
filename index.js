import "dotenv/config";
import { Bot } from "qq-official-bot";
import Anthropic from "@anthropic-ai/sdk";

// ============================================================
// 配置加载
// ============================================================

const QQ_APP_ID = process.env.QQ_APP_ID;
const QQ_APP_SECRET = process.env.QQ_APP_SECRET;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const BASE_URL = process.env.ANTHROPIC_BASE_URL || "https://api.deepseek.com/anthropic";

if (!QQ_APP_ID || !QQ_APP_SECRET) {
  console.error("错误: 请设置 QQ_APP_ID 和 QQ_APP_SECRET 环境变量");
  console.error("复制 .env.example 为 .env 并填入你的凭据");
  process.exit(1);
}
if (!API_KEY) {
  console.error("错误: 请设置 ANTHROPIC_API_KEY 环境变量");
  process.exit(1);
}

// ============================================================
// Anthropic 客户端 (通过 DeepSeek 端点)
// ============================================================

const anthropic = new Anthropic({
  apiKey: API_KEY,
  baseURL: BASE_URL,
});

// ============================================================
// QQ Bot 初始化
// ============================================================

const bot = new Bot({
  appid: QQ_APP_ID,
  secret: QQ_APP_SECRET,
  mode: "websocket",        // [!] 必须指定接收器模式
  sandbox: process.env.SANDBOX !== "false", // 默认沙箱模式，审核通过后设为 false
  removeAt: true,           // 自动去掉群聊中的 @机器人
  logLevel: "info",
  maxRetry: 10,
  intents: [
    "GROUP_AND_C2C_EVENT",  // [!] 正确的 intent：同时接收私聊和群聊消息
  ],
});

// ============================================================
// 消息处理
// ============================================================

// 简单的每用户速率限制 (防止刷屏)
const userCooldowns = new Map();
const COOLDOWN_MS = 3000; // 3秒内同一用户只处理一条

function isOnCooldown(userId) {
  const last = userCooldowns.get(userId);
  if (last && Date.now() - last < COOLDOWN_MS) return true;
  userCooldowns.set(userId, Date.now());
  return false;
}

// 从消息对象中提取关键信息
function extractInfo(msg) {
  return {
    userId: msg.user_id || msg.author?.user_openid || "unknown",
    userName: msg.sender?.user_name || msg.author?.username || "用户",
    content: msg.content?.trim() || "",
    isGroup: msg.message_type === "group" || !!msg.group_openid,
  };
}

// 调用 Claude API
async function askClaude(userMessage, userName) {
  const systemPrompt = process.env.SYSTEM_PROMPT ||
    "你是一个运行在QQ上的AI助手，请用中文回复。回复简洁友好，适合手机阅读。";

  const response = await anthropic.messages.create({
    model: process.env.MODEL || "deepseek-v4-pro",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  // 提取文本内容
  const textBlocks = response.content.filter((b) => b.type === "text");
  return textBlocks.map((b) => b.text).join("\n");
}

// 给用户发回复 (私聊)
// [!] bot.api.postC2CMessage → bot.sendPrivateMessage
async function sendPrivateReply(msg, text) {
  try {
    await bot.sendPrivateMessage(msg.author.user_openid, text);
  } catch (e) {
    console.error(`回复私聊失败 [${msg.author?.user_openid}]:`, e.message);
  }
}

// 给群聊发回复
// [!] bot.api.postGroupMessage → bot.sendGroupMessage
async function sendGroupReply(msg, text) {
  try {
    // 传入 msg 作为 source 参数，自动带上 msg_id 实现引用回复
    await bot.sendGroupMessage(msg.group_openid, text, msg);
  } catch (e) {
    console.error(`回复群聊失败 [${msg.group_openid}]:`, e.message);
  }
}

// ============================================================
// 事件监听
// [!] 原始 QQ WebSocket 事件名经过库转换，必须使用转换后的事件名
// ============================================================

// 私聊消息 — QQ 原始事件 C2C_MESSAGE_CREATE → 库转换为 "message.private.friend"
bot.on("message.private.friend", async (msg) => {
  const info = extractInfo(msg);
  if (!info.content) return;
  if (isOnCooldown(info.userId)) return;

  console.log(`[私聊] ${info.userName}: ${info.content.slice(0, 50)}`);

  try {
    const reply = await askClaude(info.content, info.userName);
    // QQ 消息长度限制约 4000 字符，超长分段发送
    if (reply.length > 2000) {
      const chunks = reply.match(/[\s\S]{1,1800}/g) || [reply];
      for (const chunk of chunks) {
        await sendPrivateReply(msg, chunk);
      }
    } else {
      await sendPrivateReply(msg, reply);
    }
    console.log(`[私聊] → ${info.userName}: 已回复 (${reply.length} 字符)`);
  } catch (e) {
    console.error(`[私聊] Claude 调用失败:`, e.message);
    await sendPrivateReply(msg, "抱歉，我暂时无法回复，请稍后再试。");
  }
});

// 群聊 @消息 — QQ 原始事件 GROUP_AT_MESSAGE_CREATE → 库转换为 "message.group"
bot.on("message.group", async (msg) => {
  const info = extractInfo(msg);
  if (!info.content) return;
  if (isOnCooldown(info.userId)) return;

  console.log(`[群聊] ${info.userName}: ${info.content.slice(0, 50)}`);

  try {
    const reply = await askClaude(info.content, info.userName);
    if (reply.length > 2000) {
      const chunks = reply.match(/[\s\S]{1,1800}/g) || [reply];
      for (const chunk of chunks) {
        await sendGroupReply(msg, chunk);
      }
    } else {
      await sendGroupReply(msg, reply);
    }
    console.log(`[群聊] → ${info.userName}: 已回复 (${reply.length} 字符)`);
  } catch (e) {
    console.error(`[群聊] Claude 调用失败:`, e.message);
    await sendGroupReply(msg, "抱歉，我暂时无法回复。");
  }
});

// ============================================================
// 启动
// [!] "ready" 事件不会冒泡到 Bot 实例，改为 await bot.start() 后直接打印
// ============================================================

console.log("╔══════════════════════════════════════╗");
console.log("║   QQ Bot ↔ Claude 桥接服务 v1.0     ║");
console.log("╠══════════════════════════════════════╣");
const maskedId = QQ_APP_ID ? `****${QQ_APP_ID.slice(-4)}` : "未设置";
console.log(`║   AppID:  ${maskedId.padEnd(15)}║`);
console.log(`║   模型:   ${process.env.MODEL || "deepseek-v4-pro"}          ║`);
console.log(`║   API:    ${BASE_URL}  ║`);
console.log("╚══════════════════════════════════════╝");
console.log("");

// [!] "ready" 和 "error" 事件不会冒泡到 Bot，因此直接 try-catch
bot.start()
  .then(() => {
    console.log("✅ QQ Bot 已连接，等待消息...");
  })
  .catch((err) => {
    console.error("❌ 启动失败:", err.message);
    console.error("请检查:");
    console.error("  1. QQ_APP_ID 和 QQ_APP_SECRET 是否正确");
    console.error("  2. 网络是否能访问 qq.com");
    console.error("  3. 是否在沙箱模式下运行（sandbox: true）");
    process.exit(1);
  });

// 全局未捕获异常兜底
process.on("uncaughtException", (err) => {
  console.error("未捕获的异常:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("未处理的 Promise 拒绝:", err?.message || err);
});
