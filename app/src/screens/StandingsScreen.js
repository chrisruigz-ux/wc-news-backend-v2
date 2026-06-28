import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Image, ActivityIndicator, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import theme from "../theme";
import { getApiBase, getToken } from "../services/api";
import { getFollowedTeams } from "../store";

const GROUP_NAMES = ["A","B","C","D","E","F","G","H","I","J","K","L"];

export default function StandingsScreen() {
  const [standings, setStandings] = useState([]);
  const [followedTeams, setFollowed] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [teams] = await Promise.all([getFollowedTeams()]);
      setFollowed(teams);
    } catch (_) {}
    try {
      const base = getApiBase();
      const resp = await fetch(base + "/api/standings");
      const data = await resp.json();
      if (data.standings) setStandings(data.standings);
    } catch (e) {
      console.error("Load standings error:", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useFocusEffect(useCallback(() => { loadData(); }, []));

  if (loading) {
    return <View style={styles.container}><ActivityIndicator size="large" color={theme.colors.secondary} /></View>;
  }

  // 按组分组
  const grouped = {};
  for (const s of standings) {
    const g = s.group.replace("Group ", "");
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(s);
  }

  const formDots = (form) => {
    if (!form) return null;
    return form.split("").map((c, i) => {
      const color = c === "W" ? "#2ecc71" : c === "D" ? "#f5c518" : "#e74c3c";
      return <View key={i} style={[styles.formDot, { backgroundColor: color }]} />;
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.title}>小组积分榜</Text>
      <Text style={styles.subtitle}>2026 美加墨世界杯 · 数据来源 TheSportsDB</Text>

      {standings.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>暂未获取到积分数据</Text>
        </View>
      )}

      {GROUP_NAMES.map((g) => {
        const teams = grouped[g] || [];
        const hasFollowed = teams.some((t) => followedTeams.includes(t.team));
        if (teams.length === 0) return null;
        return (
          <View key={g} style={[styles.groupCard, hasFollowed && styles.groupCardFollowed]}>
            <Text style={styles.groupTitle}>
              第{g}组 {hasFollowed ? "⭐" : ""}
            </Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.thTeam]}>球队</Text>
              <Text style={styles.th}>场</Text>
              <Text style={styles.th}>胜</Text>
              <Text style={styles.th}>平</Text>
              <Text style={styles.th}>负</Text>
              <Text style={styles.th}>进/失</Text>
              <Text style={styles.th}>净胜</Text>
              <Text style={[styles.th, styles.thPts]}>分</Text>
            </View>
            {teams.sort((a, b) => a.rank - b.rank).map((t, i) => {
              const isFollowed = followedTeams.includes(t.team);
              return (
                <View key={t.team} style={[styles.teamRow, isFollowed && styles.teamRowFollowed]}>
                  <View style={styles.teamInfo}>
                    <Text style={styles.rank}>{(i === 0 && teams.length > 1) ? "🏆" : t.rank}</Text>
                    {t.badge ? (
                      <Image source={{ uri: t.badge }} style={styles.badge} />
                    ) : (
                      <View style={styles.badgePlaceholder} />
                    )}
                    <Text style={[styles.teamName, isFollowed && styles.teamNameHighlight]}>{t.team}</Text>
                  </View>
                  <Text style={styles.stat}>{t.played}</Text>
                  <Text style={styles.stat}>{t.win}</Text>
                  <Text style={styles.stat}>{t.draw}</Text>
                  <Text style={styles.stat}>{t.loss}</Text>
                  <Text style={styles.stat}>{t.goals_for}:{t.goals_against}</Text>
                  <Text style={[styles.stat, t.gd > 0 && styles.statPos, t.gd < 0 && styles.statNeg]}>{t.gd > 0 ? "+" : ""}{t.gd}</Text>
                  <Text style={[styles.statPts, isFollowed && styles.statPtsHL]}>{t.pts}</Text>
                </View>
              );
            })}
            {teams.length > 0 && teams[0].form && (
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>近期: </Text>
                {formDots(teams[0].form)}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  title: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: "bold", textAlign: "center" },
  subtitle: { color: theme.colors.textSecondary, fontSize: theme.fontSize.xs, textAlign: "center", marginBottom: 16 },
  emptyState: { padding: 40, alignItems: "center" },
  emptyText: { color: theme.colors.textMuted },
  groupCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: 12, marginBottom: 12 },
  groupCardFollowed: { borderLeftWidth: 3, borderLeftColor: theme.colors.secondary },
  groupTitle: { color: theme.colors.secondary, fontSize: theme.fontSize.md, fontWeight: "bold", marginBottom: 8 },
  tableHeader: { flexDirection: "row", alignItems: "center", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.border, marginBottom: 4 },
  th: { color: theme.colors.textMuted, fontSize: 10, width: 24, textAlign: "center" },
  thTeam: { flex: 1, textAlign: "left", paddingLeft: 4 },
  thPts: { fontWeight: "bold", color: theme.colors.secondary },
  teamRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  teamRowFollowed: { backgroundColor: "#f5c51811", borderBottomColor: theme.colors.secondary },
  teamInfo: { flex: 1, flexDirection: "row", alignItems: "center" },
  rank: { color: theme.colors.textMuted, fontSize: 11, width: 22, textAlign: "center" },
  badge: { width: 20, height: 20, borderRadius: 10, marginRight: 6 },
  badgePlaceholder: { width: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.surfaceLight, marginRight: 6 },
  teamName: { color: theme.colors.text, fontSize: 12 },
  teamNameHighlight: { color: theme.colors.secondary, fontWeight: "600" },
  stat: { color: theme.colors.textSecondary, fontSize: 11, width: 24, textAlign: "center" },
  statPos: { color: "#2ecc71" },
  statNeg: { color: "#e74c3c" },
  statPts: { color: theme.colors.secondary, fontSize: 13, fontWeight: "bold", width: 26, textAlign: "center" },
  statPtsHL: { color: "#fff", backgroundColor: theme.colors.secondary, borderRadius: 4, paddingHorizontal: 2, paddingVertical: 1 },
  formRow: { flexDirection: "row", alignItems: "center", marginTop: 6, paddingLeft: 4 },
  formLabel: { color: theme.colors.textMuted, fontSize: 10 },
  formDot: { width: 8, height: 8, borderRadius: 4, marginRight: 3 },
});
