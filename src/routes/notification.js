const express = require("express");
const { readDb, writeDb } = require("../db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// 注册推送token
router.post("/register", authMiddleware, (req, res) => {
  const { push_token, device_info } = req.body;
  if (!push_token) {
    return res.status(400).json({ error: "push_token is required" });
  }
  const db = readDb();
  if (!db.push_registrations) db.push_registrations = [];
  const existing = db.push_registrations.findIndex((r) => r.user_id === req.user.id);
  const entry = {
    user_id: req.user.id,
    push_token,
    device_info: device_info || {},
    notifications_enabled: true,
    updated_at: new Date().toISOString(),
  };
  if (existing >= 0) {
    db.push_registrations[existing] = { ...db.push_registrations[existing], ...entry };
  } else {
    db.push_registrations.push(entry);
  }
  writeDb(db);
  res.json({ success: true, message: "推送注册成功" });
});

// 获取推送设置
router.get("/settings", authMiddleware, (req, res) => {
  const db = readDb();
  const reg = (db.push_registrations || []).find((r) => r.user_id === req.user.id);
  res.json({
    registered: !!reg,
    push_token: reg ? reg.push_token : null,
    notifications_enabled: reg ? reg.notifications_enabled : false,
  });
});

// 更新推送设置（开/关）
router.put("/settings", authMiddleware, (req, res) => {
  const { notifications_enabled } = req.body;
  const db = readDb();
  const reg = (db.push_registrations || []).find((r) => r.user_id === req.user.id);
  if (!reg) {
    return res.status(404).json({ error: "未注册推送，请先注册" });
  }
  reg.notifications_enabled = notifications_enabled !== false;
  writeDb(db);
  res.json({ success: true, notifications_enabled: reg.notifications_enabled });
});

// 取消注册
router.delete("/register", authMiddleware, (req, res) => {
  const db = readDb();
  if (db.push_registrations) {
    db.push_registrations = db.push_registrations.filter((r) => r.user_id !== req.user.id);
  }
  writeDb(db);
  res.json({ success: true });
});

module.exports = router;
