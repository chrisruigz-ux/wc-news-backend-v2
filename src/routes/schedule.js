const express = require("express");
const { readDb } = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
  const db = readDb();
  const date = req.query.date;
  let matches = db.match_schedule;
  if (date) matches = matches.filter((m) => m.date === date);
  const byDate = {};
  for (const m of matches) {
    if (!byDate[m.date]) byDate[m.date] = [];
    byDate[m.date].push(m);
  }
  res.json({ matches, by_date: byDate });
});

router.get("/teams", (req, res) => {
  const db = readDb();
  const teamSet = new Set();
  const teams = [];
  for (const m of db.match_schedule) {
    if (m.home_team && !teamSet.has(m.home_team)) {
      teamSet.add(m.home_team);
      teams.push({ name: m.home_team, logo: m.home_logo });
    }
    if (m.away_team && !teamSet.has(m.away_team)) {
      teamSet.add(m.away_team);
      teams.push({ name: m.away_team, logo: m.away_logo });
    }
  }
  res.json({ teams: teams.sort((a, b) => a.name.localeCompare(b.name)) });
});

module.exports = router;
