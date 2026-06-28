import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Image, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import theme from "../theme";
import { apiGetNews, apiGetSchedule, getApiBase } from "../services/api";
import { getFollowedTeams } from "../store";

const FOOTBALL_EMOJI = "⚽";

export default function HomeScreen({ navigation }) {
  const [news, setNews] = useState([]);
  const [matches, setMatches] = useState([]);
  const [followedTeams, setFollowed] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPrioritized, setShowPrioritized] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [newsData, scheduleData, teams] = await Promise.all([
        apiGetNews(page, 20),
        apiGetSchedule(),
        getFollowedTeams(),
      ]);
      if (page === 1) setNews(newsData.news);
      else setNews((prev) => [...prev, ...newsData.news]);
      setTotal(newsData.total);
      setMatches(scheduleData.matches || []);
      setFollowed(teams);
    } catch (e) {
      console.error("Load data error:", e.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { loadData(); }, [loadData]);
  useFocusEffect(useCallback(() => { getFollowedTeams().then(setFollowed); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    try {
      const [newsData, scheduleData, teams] = await Promise.all([
        apiGetNews(1, 20),
        apiGetSchedule(),
        getFollowedTeams(),
      ]);
      setNews(newsData.news);
      setTotal(newsData.total);
      setMatches(scheduleData.matches || []);
      setFollowed(teams);
    } catch (e) {}
    setRefreshing(false);
  };

  // 将关注球队的新闻优先
  const sortedNews = [...news];
  if (followedTeams.length > 0) {
    sortedNews.sort((a, b) => {
      const aFollowed = followedTeams.some((t) => a.title.includes(t)) ? 1 : 0;
      const bFollowed = followedTeams.some((t) => b.title.includes(t)) ? 1 : 0;
      return bFollowed - aFollowed;
    });
  }

  const todayMatches = matches.filter((m) => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "-");
    return m.date >= today;
  }).slice(0, 5);

  const renderNewsItem = ({ item }) => {
    const isFollowed = followedTeams.some((t) => item.title.includes(t));
    return (
      <TouchableOpacity style={styles.newsCard} onPress={() => navigation.navigate("NewsDetail", { newsId: item.id, newsUrl: item.url })}>
        <View style={styles.newsHeader}>
          <Text style={styles.newsTag}>世界杯</Text>
          {isFollowed && <Text style={styles.starIcon}>⭐</Text>}
          <Text style={styles.newsTime}>{item.published_at?.slice(5, 16) || ""}</Text>
        </View>
        <Text style={[styles.newsTitle, isFollowed && styles.newsTitleFollowed]}>{item.title}</Text>
        <Text style={styles.newsSource}>{item.source || "直播吧"}</Text>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      {/* 赛程卡片 */}
      {todayMatches.length > 0 && (
        <View style={styles.scheduleSection}>
          <Text style={styles.sectionTitle}>近期赛程</Text>
          {todayMatches.map((m, i) => {
            const isFollowedMatch = followedTeams.some((t) => m.home_team.includes(t) || m.away_team.includes(t));
            return (
              <View key={m.id || i} style={[styles.matchCard, isFollowedMatch && styles.matchCardFollowed]}>
                {isFollowedMatch && <Text style={styles.matchStar}>⭐</Text>}
                <Text style={styles.matchLeague}>{m.league || "世界杯"}</Text>
                <View style={styles.matchTeams}>
                  <Text style={[styles.teamName, isFollowedMatch && styles.teamNameHighlight]}>{m.home_team}</Text>
                  <Text style={styles.vsText}>VS</Text>
                  <Text style={[styles.teamName, isFollowedMatch && styles.teamNameHighlight]}>{m.away_team}</Text>
                </View>
                <Text style={styles.matchTime}>{m.date?.slice(5)} {m.time}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* 新闻列表头 */}
      <View style={styles.newsSectionHeader}>
        <Text style={styles.sectionTitle}>世界杯资讯</Text>
        {followedTeams.length > 0 && (
          <TouchableOpacity onPress={() => setShowPrioritized(!showPrioritized)}>
            <Text style={styles.priorityToggle}>
              {showPrioritized ? "全部" : "关注优先"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.secondary} />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  const displayNews = showPrioritized ? sortedNews : news;

  return (
    <View style={styles.container}>
      <FlatList
        data={displayNews}
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={renderNewsItem}
        ListHeaderComponent={renderHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.secondary} />}
        onEndReached={() => { if (news.length < total) setPage((p) => p + 1); }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={news.length >= total ? null : <ActivityIndicator style={{ margin: 20 }} color={theme.colors.secondary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, backgroundColor: theme.colors.background, alignItems: "center", justifyContent: "center" },
  loadingText: { color: theme.colors.textSecondary, marginTop: 12, fontSize: 14 },
  scheduleSection: { padding: 16, paddingBottom: 8 },
  sectionTitle: { color: theme.colors.secondary, fontSize: theme.fontSize.lg, fontWeight: "bold", marginBottom: 12 },
  matchCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: 14, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: theme.colors.primary },
  matchCardFollowed: { borderLeftColor: theme.colors.secondary, backgroundColor: theme.colors.surfaceLight },
  matchLeague: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs },
  matchTeams: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 8 },
  teamName: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: "600", flex: 1, textAlign: "center" },
  teamNameHighlight: { color: theme.colors.secondary },
  vsText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginHorizontal: 8 },
  matchTime: { color: theme.colors.textSecondary, fontSize: theme.fontSize.xs, textAlign: "center" },
  matchStar: { position: "absolute", top: 8, right: 8, fontSize: 14 },
  newsSectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 8 },
  priorityToggle: { color: theme.colors.secondary, fontSize: theme.fontSize.sm, borderWidth: 1, borderColor: theme.colors.secondary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  newsCard: { backgroundColor: theme.colors.surface, marginHorizontal: 16, marginVertical: 5, borderRadius: theme.borderRadius.md, padding: 14 },
  newsHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  newsTag: { color: theme.colors.primary, backgroundColor: "#1a6b3c33", fontSize: theme.fontSize.xs, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginRight: 6 },
  starIcon: { fontSize: 12, marginRight: 6 },
  newsTime: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs },
  newsTitle: { color: theme.colors.text, fontSize: theme.fontSize.md, lineHeight: 22, marginBottom: 6 },
  newsTitleFollowed: { color: theme.colors.secondary },
  newsSource: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs },
});
