import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import theme from "../theme";
import { apiGetSchedule } from "../services/api";
import { getFollowedTeams } from "../store";

export default function ScheduleScreen() {
  const [matches, setMatches] = useState([]);
  const [byDate, setByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [followedTeams, setFollowed] = useState([]);
  const [filterFollowed, setFilterFollowed] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await apiGetSchedule();
      setMatches(data.matches || []);
      setByDate(data.by_date || {});
      const teams = await getFollowedTeams();
      setFollowed(teams);
    } catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useFocusEffect(useCallback(() => { getFollowedTeams().then(setFollowed); }, []));

  const dates = Object.keys(byDate).sort();
  const filteredDates = dates.filter((d) => {
    if (!filterFollowed) return true;
    return byDate[d].some((m) => followedTeams.some((t) => m.home_team?.includes(t) || m.away_team?.includes(t)));
  });

  if (loading) {
    return <View style={styles.container}><ActivityIndicator size="large" color={theme.colors.secondary} /></View>;
  }

  return (
    <View style={styles.container}>
      {followedTeams.length > 0 && (
        <TouchableOpacity style={styles.filterBar} onPress={() => setFilterFollowed(!filterFollowed)}>
          <Text style={[styles.filterText, filterFollowed && styles.filterTextActive]}>
            {filterFollowed ? "仅看关注球队" : "全部赛程"}
          </Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={filteredDates}
        keyExtractor={(item) => item}
        renderItem={({ item: date }) => {
          const dayMatches = filterFollowed
            ? byDate[date].filter((m) => followedTeams.some((t) => m.home_team?.includes(t) || m.away_team?.includes(t)))
            : byDate[date];
          return (
            <View style={styles.daySection}>
              <Text style={styles.dateHeader}>{date?.slice(5)} 周五</Text>
              {dayMatches.map((m, i) => (
                <View key={m.id || i} style={[styles.matchCard, followedTeams.some((t) => m.home_team?.includes(t) || m.away_team?.includes(t)) && styles.matchCardHighlight]}>
                  <Text style={styles.matchTime}>{m.time}</Text>
                  <View style={styles.matchInfo}>
                    <Text style={styles.league}>{m.league || "世界杯"}</Text>
                    <Text style={styles.teams}>{m.home_team} vs {m.away_team}</Text>
                  </View>
                </View>
              ))}
            </View>
          );
        }}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  filterBar: { padding: 12, alignItems: "center" },
  filterText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 6 },
  filterTextActive: { color: theme.colors.secondary, borderColor: theme.colors.secondary },
  daySection: { marginBottom: 20 },
  dateHeader: { color: theme.colors.secondary, fontSize: theme.fontSize.md, fontWeight: "bold", marginBottom: 8 },
  matchCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: 12, marginBottom: 8, flexDirection: "row", alignItems: "center" },
  matchCardHighlight: { borderLeftWidth: 3, borderLeftColor: theme.colors.secondary },
  matchTime: { color: theme.colors.secondary, fontSize: theme.fontSize.lg, fontWeight: "bold", marginRight: 16, minWidth: 60 },
  matchInfo: { flex: 1 },
  league: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs },
  teams: { color: theme.colors.text, fontSize: theme.fontSize.md, marginTop: 2 },
});
