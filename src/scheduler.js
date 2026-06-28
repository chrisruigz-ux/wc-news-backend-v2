const { refreshAll, scrapeStandings } = require("./scraper");
const { sendNotifications } = require("./notifier");

let timer = null;
let lastRun = null;

function startScheduler() {
  const interval = parseInt(process.env.SCRAPE_INTERVAL || "1800000", 10);
  console.log(`[Scheduler] Starting, interval=${interval}ms (${interval/60000}min)`);
  // 立即执行一次
  runOnce();
  timer = setInterval(runOnce, interval);
}

async function runOnce() {
  console.log(`[Scheduler] Running at ${new Date().toISOString()}`);
  lastRun = new Date().toISOString();
  try {
    await refreshAll();
    // 刷新积分榜缓存
    const { readDb, writeDb } = require("./db");
    try {
      const standings = await scrapeStandings();
      if (standings.length > 0) {
        const db2 = readDb();
        db2.standings_cache = standings;
        writeDb(db2);
        console.log("[Scheduler] Standings cached: " + standings.length + " teams");
      }
    } catch (e) { console.error("[Scheduler] Standings error:", e.message); }
      try { await sendNotifications(); } catch (e) { console.error("[Scheduler] Notifier error:", e.message); }
  } catch (e) {
    console.error("[Scheduler] Error:", e.message);
  }
}

function getStatus() {
  return {
    running: timer !== null,
    lastRun,
    nextRun: timer ? new Date(Date.now() + parseInt(process.env.SCRAPE_INTERVAL || "1800000")).toISOString() : null,
  };
}

function stopScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = { startScheduler, stopScheduler, getStatus };


