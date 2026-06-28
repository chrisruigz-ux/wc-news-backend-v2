const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const VERSION_FILE = path.resolve(process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : "./data", "version.json");

function getVersion() {
  if (fs.existsSync(VERSION_FILE)) {
    return JSON.parse(fs.readFileSync(VERSION_FILE, "utf-8"));
  }
  return { latestVersion: "1.0.0", buildNumber: 1, releaseNotes: "", apkUrl: "", forceUpdate: false };
}

// 获取最新版本信息
router.get("/", (req, res) => {
  res.json(getVersion());
});

// 更新版本信息（管理员用）
router.post("/update", (req, res) => {
  const { latestVersion, releaseNotes, apkUrl, forceUpdate } = req.body;
  const version = getVersion();
  if (latestVersion) version.latestVersion = latestVersion;
  if (releaseNotes) version.releaseNotes = releaseNotes;
  if (apkUrl) version.apkUrl = apkUrl;
  if (forceUpdate !== undefined) version.forceUpdate = forceUpdate;
  version.buildNumber++;
  version.releaseDate = new Date().toISOString().slice(0, 10);
  fs.mkdirSync(path.dirname(VERSION_FILE), { recursive: true });
  fs.writeFileSync(VERSION_FILE, JSON.stringify(version, null, 2));
  res.json({ success: true, version });
});

module.exports = router;
