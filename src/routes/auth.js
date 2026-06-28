const express = require("express");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { readDb, writeDb } = require("../db");
const { JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// 存储验证码的临时 Map（生产环境应放 Redis）
const codeStore = new Map();

// 生成6位随机验证码
function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// 阿里云短信配置（替换为真实配置后生效）
const SMS_CONFIG = {
  accessKeyId: process.env.SMS_ACCESS_KEY_ID || "",
  accessKeySecret: process.env.SMS_ACCESS_KEY_SECRET || "",
  signName: process.env.SMS_SIGN_NAME || "世界杯诗圆",
  templateCode: process.env.SMS_TEMPLATE_CODE || "SMS_000000",
};

// 开发模式：验证码固定为 000000
const DEV_MODE = process.env.NODE_ENV !== "production";

// 发送验证码
router.post("/send-code", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^1\d{10}$/.test(phone)) {
      return res.status(400).json({ error: "请输入正确的手机号" });
    }

    const code = genCode();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5分钟有效

    // 存储验证码
    codeStore.set(phone, { code, expiresAt });

    // 开发模式：直接返回验证码，不调用短信接口
    if (DEV_MODE) {
      console.log("[SMS] Dev mode - Code for " + phone + ": " + code);
      return res.json({
        success: true,
        message: "验证码已发送",
        dev_code: code, // 开发模式下返回验证码
      });
    }

    // 生产模式：调用阿里云短信 API
    try {
      // 这里集成阿里云短信 SDK
      // 暂时使用模拟发送
      console.log("[SMS] Would send code " + code + " to " + phone);
      res.json({ success: true, message: "验证码已发送" });
    } catch (smsError) {
      console.error("[SMS] Send error:", smsError.message);
      return res.status(500).json({ error: "短信发送失败，请稍后重试" });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 校验验证码
function verifyCode(phone, code) {
  if (!codeStore.has(phone)) return false;
  const stored = codeStore.get(phone);
  if (stored.expiresAt < Date.now()) {
    codeStore.delete(phone);
    return false;
  }
  // 开发模式：000000 或实际验证码都通过
  if (DEV_MODE && code === "000000") return true;
  if (stored.code !== code) return false;
  codeStore.delete(phone);
  return true;
}

// 用验证码注册
router.post("/register", async (req, res) => {
  try {
    const { phone, code, nickname } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: "手机号和验证码不能为空" });
    }
    // 校验验证码
    if (!verifyCode(phone, code)) {
      return res.status(400).json({ error: "验证码错误或已过期" });
    }
    const db = readDb();
    const existing = db.users.find((u) => u.phone === phone);
    if (existing) {
      return res.status(409).json({ error: "该手机号已注册" });
    }
    const id = uuidv4();
    db.users.push({
      id, phone,
      password: "", // 无密码，用验证码登录
      nickname: nickname || phone,
      is_vip: 0,
      vip_expires_at: null,
      created_at: new Date().toISOString(),
    });
    writeDb(db);
    const token = jwt.sign({ id, phone }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, user: { id, phone, nickname: nickname || phone, is_vip: 0 } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 用验证码登录
router.post("/login", async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: "手机号和验证码不能为空" });
    }
    // 校验验证码
    if (!verifyCode(phone, code)) {
      return res.status(400).json({ error: "验证码错误或已过期" });
    }
    const db = readDb();
    const user = db.users.find((u) => u.phone === phone);
    if (!user) {
      return res.status(401).json({ error: "该手机号未注册，请先注册" });
    }
    const token = jwt.sign({ id: user.id, phone: user.phone }, JWT_SECRET, { expiresIn: "30d" });
    res.json({
      token,
      user: { id: user.id, phone: user.phone, nickname: user.nickname, is_vip: user.is_vip },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 获取用户信息
router.get("/me", require("../middleware/auth").authMiddleware, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "用户不存在" });
  res.json({ user: { id: user.id, phone: user.phone, nickname: user.nickname, is_vip: user.is_vip, vip_expires_at: user.vip_expires_at, created_at: user.created_at } });
});

module.exports = router;
