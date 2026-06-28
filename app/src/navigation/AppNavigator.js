import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text, View, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import theme from "../theme";
import { getToken } from "../services/api";

import HomeScreen from "../screens/HomeScreen";
import NewsDetailScreen from "../screens/NewsDetailScreen";
import ScheduleScreen from "../screens/ScheduleScreen";
import StandingsScreen from "../screens/StandingsScreen";
import TeamsScreen from "../screens/TeamsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import PaymentScreen from "../screens/PaymentScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ name, focused }) {
  const icons = {
    "首页": "🏠", "赛程": "⚽", "积分榜": "📊", "关注": "⭐", "我的": "👤"
  };
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icons[name] || "📄"}</Text>;
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{
      headerStyle: { backgroundColor: theme.colors.surface },
      headerTintColor: theme.colors.text,
      headerTitleStyle: { fontWeight: "bold" },
    }}>
      <Stack.Screen name="HomeFeed" component={HomeScreen} options={{ title: "世界杯诗圆专享" }} />
      <Stack.Screen name="NewsDetail" component={NewsDetailScreen} options={{ title: "新闻详情" }} />
    </Stack.Navigator>
  );
}

function ScheduleStack() {
  return (
    <Stack.Navigator screenOptions={{
      headerStyle: { backgroundColor: theme.colors.surface },
      headerTintColor: theme.colors.text,
      headerTitleStyle: { fontWeight: "bold" },
    }}>
      <Stack.Screen name="ScheduleMain" component={ScheduleScreen} options={{ title: "赛程" }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border, paddingBottom: 4, height: 56 },
          tabBarActiveTintColor: theme.colors.secondary,
          tabBarInactiveTintColor: theme.colors.textMuted,
          tabBarLabelStyle: { fontSize: 11 },
        }}>
          <Tab.Screen name="首页" component={HomeStack} options={{ tabBarIcon: ({ focused }) => <TabIcon name="首页" focused={focused} /> }} />
          <Tab.Screen name="赛程" component={ScheduleStack} options={{ tabBarIcon: ({ focused }) => <TabIcon name="赛程" focused={focused} /> }} />
          <Tab.Screen name="积分榜" component={StandingsScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="积分榜" focused={focused} /> }} />
          <Tab.Screen name="关注" component={TeamsScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="关注" focused={focused} /> }} />
          <Tab.Screen name="我的" component={ProfileScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="我的" focused={focused} /> }} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
