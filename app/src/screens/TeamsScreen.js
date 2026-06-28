import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import theme from "../theme";
import { apiGetTeams } from "../services/api";
import { getFollowedTeams, toggleTeam } from "../store";

export default function TeamsScreen({ navigation }) {
  const [groups, setGroups] = useState([]);
  const [followedTeams, setFollowed] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [teamsData, followed] = await Promise.all([apiGetTeams(), getFollowedTeams()]);
      setGroups(teamsData.groups || []);
      setFollowed(followed);
    } catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useFocusEffect(useCallback(() => { loadData(); }, []));

  const handleToggle = async (team) => {
    await toggleTeam(team);
    setFollowed(await getFollowedTeams());
  };

  if (loading) {
    return <View style={styles.container}><ActivityIndicator size="large" color={theme.colors.secondary} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.title}>关注球队</Text>
      <Text style={styles.subtitle}>选择你关注的球队，相关新闻和赛程将优先展示</Text>
      {followedTeams.length > 0 && (
        <View style={styles.followedBar}>
          <Text style={styles.followedText}>已关注 {followedTeams.length} 支球队</Text>
          <Text style={styles.followedNames}>{followedTeams.join(" · ")}</Text>
        </View>
      )}
      {groups.map((g) => (
        <View key={g.group} style={styles.groupCard}>
          <Text style={styles.groupTitle}>第{g.group}组</Text>
          <View style={styles.teamGrid}>
            {g.teams.map((team) => {
              const isFollowed = followedTeams.includes(team);
              return (
                <TouchableOpacity key={team} style={[styles.teamBtn, isFollowed && styles.teamBtnActive]} onPress={() => handleToggle(team)}>
                  <Text style={[styles.teamBtnText, isFollowed && styles.teamBtnTextActive]}>
                    {isFollowed ? "★" : "☆"} {team}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  title: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: "bold", textAlign: "center" },
  subtitle: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, textAlign: "center", marginBottom: 16, paddingHorizontal: 20 },
  followedBar: { backgroundColor: "#1a6b3c22", borderRadius: theme.borderRadius.md, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: theme.colors.secondary },
  followedText: { color: theme.colors.secondary, fontSize: theme.fontSize.sm, fontWeight: "bold" },
  followedNames: { color: theme.colors.textSecondary, fontSize: theme.fontSize.xs, marginTop: 4 },
  groupCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: 14, marginBottom: 12 },
  groupTitle: { color: theme.colors.secondary, fontSize: theme.fontSize.md, fontWeight: "bold", marginBottom: 10 },
  teamGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  teamBtn: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.sm, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 4 },
  teamBtnActive: { borderColor: theme.colors.secondary, backgroundColor: "#f5c51822" },
  teamBtnText: { color: theme.colors.text, fontSize: theme.fontSize.sm },
  teamBtnTextActive: { color: theme.colors.secondary, fontWeight: "600" },
});
