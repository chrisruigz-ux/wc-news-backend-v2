const fs = require("fs");
const path = require("path");

const DB_PATH = process.env.DB_PATH || "./data/worldcup.json";

function getDbPath() {
  return path.resolve(DB_PATH);
}

function ensureDir() {
  const dir = path.dirname(getDbPath());
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readDb() {
  ensureDir();
  if (!fs.existsSync(getDbPath())) {
    const initial = { users: [], payment_orders: [], news_cache: [], match_schedule: [] };
    fs.writeFileSync(getDbPath(), JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(fs.readFileSync(getDbPath(), "utf-8"));
}

function writeDb(data) {
  ensureDir();
  fs.writeFileSync(getDbPath(), JSON.stringify(data, null, 2));
}

module.exports = { readDb, writeDb };
