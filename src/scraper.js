const cheerio = require("cheerio");
const { readDb, writeDb } = require("./db");

const BASE = "https://news.zhibo8.com";
const HOMEPAGE = "https://www.zhibo8.com";

async function fetchHtml(url) {
  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  });
  return resp.text();
}

async function scrapeNewsList() {
  const html = await fetchHtml(BASE + "/zuqiu/more.htm");
  const $ = cheerio.load(html);
  const results = [];
  $(".articleList li").each((i, el) => {
    const label = $(el).attr("data-label") || "";
    if (!label.includes("世界杯")) return;
    const link = $(el).find(".articleTitle a");
    const href = link.attr("href") || "";
    const title = link.text().trim();
    const source = $(el).find(".source").text().trim();
    const time = $(el).find(".postTime").text().trim();
    if (title) {
      results.push({
        id: href.split("/").pop().replace(".htm", ""),
        url: href.startsWith("http") ? href : "https:" + href,
        title, source, published_at: time, labels: label,
      });
    }
  });
  return results;
}

async function scrapeArticle(url) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const title = $("h1").text().trim();
  const timeText = $(".title-footer span").first().text().trim();
  const timeMatch = timeText.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
  const time = timeMatch ? timeMatch[1] : timeText;
  const author = $(".author-name").text().trim();
  const contentHtml = $("#signals").html() || "";
  const images = [];
  $("#signals img").each((i, el) => {
    const src = $(el).attr("src");
    if (src) images.push(src.startsWith("http") ? src : "https:" + src);
  });
  const text = $("#signals").text().trim();
  return { title, time, author, summary: text.substring(0, 200), contentHtml, images };
}

async function scrapeSchedule() {
  const html = await fetchHtml(HOMEPAGE);
  const match = html.match(/var\s+schedule\s*=\s*(\[[\s\S]*?\])\s*;/);
  if (!match) { console.log("[Scraper] No schedule data"); return []; }
  try {
    const data = JSON.parse(match[1]);
    const results = [];
    for (const day of data) {
      const date = day.date;
      for (const liHtml of day.list) {
        const $ = cheerio.load(liHtml);
        const $li = $("li");
        const time = $li.find("time").text().trim();
        const league = $li.find("._league").text().trim();
        const label = $li.attr("label") || "";
        if (!label.includes("世界杯") && !league.includes("世界杯")) continue;
        // 提取队伍名: 去掉所有子标签, 取纯文本
        const $teams = $li.find("._teams").clone();
        $teams.find("img, a, span, time, b").remove();
        const teamParts = $teams.text().trim().split(/\s+/).filter(Boolean);
        const homeTeam = teamParts[0] || "";
        const awayTeam = teamParts[teamParts.length - 1] || "";
        const imgs = $li.find("._teams img");
        const homeLogo = $(imgs[0]).attr("src") || "";
        const awayLogo = $(imgs[1]).attr("src") || "";
        results.push({
          id: $li.attr("id") || (date + "-" + time),
          date, time, league,
          home_team: homeTeam,
          away_team: awayTeam,
          home_logo: homeLogo ? (homeLogo.startsWith("http") ? homeLogo : "https:" + homeLogo) : "",
          away_logo: awayLogo ? (awayLogo.startsWith("http") ? awayLogo : "https:" + awayLogo) : "",
        });
      }
    }
    return results;
  } catch (e) {
    console.error("[Scraper] Parse schedule error:", e.message);
    return [];
  }
}

async function refreshAll() {
  console.log("[Scraper] Starting refresh...");
  const db = readDb();
  try {
    const news = await scrapeNewsList();
    const existingUrls = new Set(db.news_cache.map((n) => n.url));
    for (const item of news) {
      if (!existingUrls.has(item.url)) {
        db.news_cache.push(item);
        existingUrls.add(item.url);
      }
    }
    db.news_cache.sort((a, b) => (b.published_at || "").localeCompare(a.published_at || ""));
    if (db.news_cache.length > 500) db.news_cache = db.news_cache.slice(0, 500);
    console.log("[Scraper] News: " + news.length + " new (" + db.news_cache.length + " total)");
  } catch (e) {
    console.error("[Scraper] News error:", e.message);
  }
  try {
    const matches = await scrapeSchedule();
    const existingIds = new Set(db.match_schedule.map((m) => m.id));
    for (const m of matches) {
      if (!existingIds.has(m.id)) {
        db.match_schedule.push(m);
        existingIds.add(m.id);
      }
    }
    console.log("[Scraper] Matches: " + matches.length + " total");
  } catch (e) {
    console.error("[Scraper] Schedule error:", e.message);
  }
  writeDb(db);
  console.log("[Scraper] Refresh complete");
}

async function scrapeStandings() {
  // 数据源1：CCTV（优先）
  try {
    const url = "https://cbs-u.sports.cctv.com/statistics/football/team/rankings?leagueId=3400&season=2026";
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.results && data.results[0] && data.results[0].rankings) {
      const rankings = data.results[0].rankings;
      const result = [];
      for (const group of rankings) {
        for (const team of group.ranking) {
          result.push({
            group: group.group || "", rank: team.ranking ? parseInt(team.ranking) : (result.filter(r => r.group === group.group).length + 1),
            team: team.teamName || "", badge: team.logoUrl || "",
            played: team.games || 0, win: team.wins || 0, draw: team.draws || 0, loss: team.losses || 0,
            goals_for: team.goalsFor || 0, goals_against: team.goalsAgainst || 0,
            gd: team.goalDifference || 0, pts: team.points || 0, form: "",
          });
        }
      }
      console.log("[Standings] CCTV: " + result.length + " teams");
      return result;
    }
  } catch (e) { console.log("[Standings] CCTV failed:", e.message); }
  // 数据源2：TheSportsDB（备用）
  try {
    const key = process.env.SPORTSDB_API_KEY || "123";
    const resp = await fetch("https://www.thesportsdb.com/api/v1/json/" + key + "/lookuptable.php?l=4429");
    const data = await resp.json();
    if (data.table) {
      const result = data.table.map((t) => ({
        group: t.strGroup || "", rank: parseInt(t.intRank) || 0, team: t.strTeam || "",
        badge: (t.strBadge || "").replace(/\\/g, ""), played: parseInt(t.intPlayed) || 0,
        win: parseInt(t.intWin) || 0, draw: parseInt(t.intDraw) || 0, loss: parseInt(t.intLoss) || 0,
        goals_for: parseInt(t.intGoalsFor) || 0, goals_against: parseInt(t.intGoalsAgainst) || 0,
        gd: parseInt(t.intGoalDifference) || 0, pts: parseInt(t.intPoints) || 0, form: t.strForm || "",
      }));
      console.log("[Standings] TheSportsDB: " + result.length + " teams");
      return result;
    }
  } catch (e) { console.log("[Standings] TheSportsDB failed:", e.message); }
  return [];
}

module.exports = { scrapeNewsList, scrapeArticle, scrapeSchedule, scrapeStandings, refreshAll };




