const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { readDb, writeDb } = require("../db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

router.post("/activate", authMiddleware, (req, res) => {
  const { readDb, writeDb } = require("../db");
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "用户不存在" });
  user.is_vip = 1;
  user.vip_expires_at = new Date(Date.now() + 365 * 86400000).toISOString();
  writeDb(db);
  res.json({ status: "activated", message: "会员已开通！", vip_expires_at: user.vip_expires_at });
});

router.post("/create", authMiddleware, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "用户不存在" });
  if (user.is_vip) return res.json({ already_vip: true, message: "您已经是会员了" });
  const orderId = uuidv4();
  const amount = 99;
  db.payment_orders.push({ id: orderId, user_id: req.user.id, amount, status: "pending", alipay_trade_no: null, created_at: new Date().toISOString(), paid_at: null });
  writeDb(db);
  res.json({
    order_id: orderId,
    amount,
    pay_url: `https://openapi-sandbox.dl.alipaydev.com/gateway.do?app_id=${process.env.ALIPAY_APP_ID || "sandbox"}&method=alipay.trade.page.pay&out_trade_no=${orderId}&total_amount=99.00&subject=世界杯诗圆专享会员`,
    sandbox_mode: true,
  });
});

router.post("/simulate/:orderId", authMiddleware, (req, res) => {
  const db = readDb();
  const order = db.payment_orders.find((o) => o.id === req.params.orderId && o.user_id === req.user.id);
  if (!order) return res.status(404).json({ error: "订单不存在" });
  if (order.status === "paid") return res.json({ status: "paid", already_vip: true });
  order.status = "paid";
  order.alipay_trade_no = "sim_" + uuidv4().slice(0, 16);
  order.paid_at = new Date().toISOString();
  const user = db.users.find((u) => u.id === req.user.id);
  if (user) { user.is_vip = 1; user.vip_expires_at = new Date(Date.now() + 365 * 86400000).toISOString(); }
  writeDb(db);
  res.json({ status: "paid", message: "支付成功！您现在已是会员" });
});

router.get("/status/:orderId", authMiddleware, (req, res) => {
  const db = readDb();
  const order = db.payment_orders.find((o) => o.id === req.params.orderId && o.user_id === req.user.id);
  if (!order) return res.status(404).json({ error: "订单不存在" });
  res.json({ order });
});

module.exports = router;

