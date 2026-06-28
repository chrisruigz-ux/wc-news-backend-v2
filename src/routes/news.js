const express = require("express");
const { readDb, writeDb } = require("../db");
const { scrapeArticle } = require("../scraper");
const { optionalAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", optionalAuth, (req, res) => {
  const db = readDb();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const news = db.news_cache.slice(offset, offset + limit).map((n) => ({
    id: n.id, title: n.title, summary: n.summary, source: n.source, author: n.author,
    image_url: n.image_url, published_at: n.published_at, url: n.url, labels: n.labels,
  }));
  res.json({ news, total: db.news_cache.length, page, limit });
});

router.get("/:id", optionalAuth, async (req, res) => {
  const db = readDb();
  let item = db.news_cache.find((n) => n.id === req.params.id);
  if (!item) item = db.news_cache.find((n) => n.url && n.url.includes(req.params.id));
  if (!item) return res.status(404).json({ error: "新闻不存在" });
  try {
    const article = await scrapeArticle(item.url);
    item.content = article.contentHtml;
    item.author = article.author || item.author;
    item.summary = article.summary;
    item.image_url = article.images[0] || item.image_url;
    writeDb(db);
    res.json({ article: { ...item, contentHtml: article.contentHtml, images: article.images, time: article.time } });
  } catch (e) {
    console.error("Scrape article error:", e.message);
    res.json({ article: { ...item, contentHtml: "", images: [] } });
  }
});

module.exports = router;
