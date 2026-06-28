import AsyncStorage from "@react-native-async-storage/async-storage";

const FOLLOWED_TEAMS_KEY = "@followed_teams";

// 获取关注的球队
export async function getFollowedTeams() {
  const data = await AsyncStorage.getItem(FOLLOWED_TEAMS_KEY);
  return data ? JSON.parse(data) : [];
}

// 保存关注的球队
export async function setFollowedTeams(teams) {
  await AsyncStorage.setItem(FOLLOWED_TEAMS_KEY, JSON.stringify(teams));
}

// 切换关注
export async function toggleTeam(teamName) {
  const teams = await getFollowedTeams();
  const idx = teams.indexOf(teamName);
  if (idx >= 0) teams.splice(idx, 1);
  else teams.push(teamName);
  await setFollowedTeams(teams);
  return teams;
}

// 是否关注
export async function isFollowed(teamName) {
  const teams = await getFollowedTeams();
  return teams.includes(teamName);
}
