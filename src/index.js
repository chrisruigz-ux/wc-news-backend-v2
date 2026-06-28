require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { readDb } = require("./db");
const { startScheduler, getStatus } = require("./scheduler");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use("/api/auth", require("./routes/auth"));
app.use("/api/payment", require("./routes/payment"));
app.use("/api/news", require("./routes/news"));
app.use("/api/schedule", require("./routes/schedule"));
app.use("/api/teams", require("./routes/teams"));
app.use("/api/notifications", require("./routes/notification"));
app.get("/api/standings", async (req, res) => {
  const { scrapeStandings } = require("./scraper");
  try {
    const data = await scrapeStandings();
    res.json({ standings: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 状态
app.get("/api/status", (req, res) => {
  const db = readDb();
  res.json({
    server: "running",
    ...getStatus(),
    stats: { news: db.news_cache.length, matches: db.match_schedule.length, users: db.users.length },
  });
});

// 手动触发抓取
app.post("/api/scrape", async (req, res) => {
  try {
    const { refreshAll } = require("./scraper");
    await refreshAll();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use("/api/version", require("./routes/version"));
app.listen(PORT, () => {
  console.log(`[Server] 世界杯诗圆专享 API 运行在 http://localhost:${PORT}`);
  startScheduler();
});





