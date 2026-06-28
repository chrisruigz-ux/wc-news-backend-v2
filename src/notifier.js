// 推送通知模块 - 每次抓取后选择热点推送给用户
const { readDb } = require("./db");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// 选择要推送的热点新闻
function pickHotNews(newsCache, followedTeamsByUser) {
  if (!newsCache || newsCache.length === 0) return null;

  // 先找包含用户关注球队的新闻
  if (followedTeamsByUser && followedTeamsByUser.length > 0) {
    for (const news of newsCache) {
      for (const team of followedTeamsByUser) {
        if (news.title && news.title.includes(team)) {
          return { ...news, reason: "你关注的球队" + team };
        }
      }
    }
  }

  // 没有关注球队相关新闻，取最新的一条
  const top = newsCache[0];
  return top ? { ...top, reason: "世界杯最新消息" } : null;
}

// 向单个用户推送
async function sendExpoPush(pushToken, title, body, data = {}) {
  if (!pushToken || !pushToken.startsWith("ExponentPushToken")) {
    console.log("[Notifier] Invalid push token:", pushToken);
    return false;
  }
  try {
    const resp = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        to: pushToken,
        title: title,
        body: body,
        data: data,
        sound: "default",
        priority: "high",
        badge: 1,
      }),
    });
    const result = await resp.json();
    if (result.errors) {
      console.log("[Notifier] Expo push error:", JSON.stringify(result.errors));
      return false;
    }
    return true;
  } catch (e) {
    console.log("[Notifier] Send error:", e.message);
    return false;
  }
}

// 主函数：遍历所有注册了推送的用户，发送通知
async function sendNotifications() {
  console.log("[Notifier] Checking for notifications...");
  const db = readDb();

  // 获取所有注册了推送token的用户
  const pushRegistrations = db.push_registrations || [];
  if (pushRegistrations.length === 0) {
    console.log("[Notifier] No push tokens registered");
    return;
  }

  const newsCache = db.news_cache || [];
  if (newsCache.length === 0) {
    console.log("[Notifier] No news to send");
    return;
  }

  let sent = 0;
  for (const reg of pushRegistrations) {
    try {
      // 获取该用户的关注球队
      const userFollowedTeams = reg.followed_teams || [];

      // 如果没有关注球队且用户没有开启通知，跳过
      if (!reg.notifications_enabled) continue;

      const hotNews = pickHotNews(newsCache, userFollowedTeams);
      if (!hotNews) continue;

      const title = "⚽ " + hotNews.reason || "世界杯最新消息";
      const body = hotNews.title;
      const newsId = hotNews.id;

      const ok = await sendExpoPush(reg.push_token, title, body, { newsId, url: hotNews.url });
      if (ok) sent++;
    } catch (e) {
      console.log("[Notifier] Error for user:", e.message);
    }
  }

  console.log("[Notifier] Sent " + sent + " notifications");
}

module.exports = { sendNotifications, pickHotNews, sendExpoPush };
