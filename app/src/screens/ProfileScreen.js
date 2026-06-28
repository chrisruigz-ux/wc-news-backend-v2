import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Switch, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import theme from "../theme";
import { apiSendCode, apiRegisterWithCode, apiLoginWithCode, apiGetProfile, apiCreatePayment, apiSimulatePayment, getToken, setToken } from "../services/api";
import { registerForPushNotifications, syncPushTokenToServer, updateNotificationSetting, getNotificationSettings } from "../services/notifications";

export default function ProfileScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifLoaded, setNotifLoaded] = useState(false);

  const checkAuth = useCallback(async () => {
    const token = await getToken();
    if (token) {
      try {
        const data = await apiGetProfile();
        setUser(data.user);
        setIsLoggedIn(true);
        try {
          const settings = await getNotificationSettings();
          if (settings.registered) {
            setNotifEnabled(settings.notifications_enabled !== false);
          } else {
            setNotifEnabled(true);
            const pushToken = await registerForPushNotifications();
            if (pushToken) await syncPushTokenToServer(pushToken);
          }
        } catch (_) {}
        setNotifLoaded(true);
      } catch (e) {
        await setToken(null);
      }
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);
  useFocusEffect(useCallback(() => { checkAuth(); }, []));

  // 倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    if (!phone || !/^1\d{10}$/.test(phone)) {
      Alert.alert("提示", "请输入正确的11位手机号");
      return;
    }
    setCodeLoading(true);
    try {
      const result = await apiSendCode(phone);
      if (result.success || result.message) {
        Alert.alert("提示", result.message || "验证码已发送");
        setCountdown(60);
        // 开发模式下显示验证码
        if (result.dev_code) {
          Alert.alert("开发模式", "验证码: " + result.dev_code);
        }
      }
    } catch (e) {
      Alert.alert("错误", e.message || "发送失败");
    } finally {
      setCodeLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!phone || !code) {
      Alert.alert("提示", "请填写手机号和验证码");
      return;
    }
    setLoading(true);
    try {
      // 先尝试登录，如果未注册会返回错误
      try {
        const data = await apiLoginWithCode(phone, code);
        setUser(data.user);
        setIsLoggedIn(true);
        // 注册推送
        try {
          const pushToken = await registerForPushNotifications();
          if (pushToken) await syncPushTokenToServer(pushToken);
        } catch (_) {}
        return;
      } catch (loginErr) {
        // 未注册，自动注册
        if (loginErr.message.includes("未注册")) {
          const data = await apiRegisterWithCode(phone, code, nickname || phone);
          setUser(data.user);
          setIsLoggedIn(true);
          try { const pt = await registerForPushNotifications(); if (pt) await syncPushTokenToServer(pt); } catch (_) {}
          return;
        }
        throw loginErr;
      }
    } catch (e) {
      Alert.alert("错误", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    try {
      const token = await getToken();
      if (!token) { Alert.alert("提示", "请先登录"); return; }
      const resp = await fetch(getApiBase() + "/api/payment/activate", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
      });
      const data = await resp.json();
      if (data.status === "activated") {
        Alert.alert("成功", "会员已开通！");
        checkAuth();
      }
    } catch (e) { Alert.alert("错误", e.message); }
  };

  const handleToggleNotif = async (value) => {
    try {
      if (value) {
        const pushToken = await registerForPushNotifications();
        if (pushToken) { await syncPushTokenToServer(pushToken); await updateNotificationSetting(true); setNotifEnabled(true); }
        else { Alert.alert("提示", "请在系统设置中允许通知权限"); }
      } else { await updateNotificationSetting(false); setNotifEnabled(false); }
    } catch (e) { Alert.alert("错误", e.message); }
  };

  const handleLogout = async () => { await setToken(null); setIsLoggedIn(false); setUser(null); };

  if (isLoggedIn && user) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{user.nickname?.charAt(0) || "?"}</Text></View>
          <Text style={styles.nickname}>{user.nickname}</Text>
          <Text style={styles.phone}>{user.phone}</Text>
          {user.is_vip ? (
            <View style={styles.vipBadge}><Text style={styles.vipText}>VIP 会员</Text></View>
          ) : (
            <View style={styles.notVipBadge}><Text style={styles.notVipText}>未开通会员</Text></View>
          )}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>会员服务</Text>
          <TouchableOpacity style={styles.payBtn} onPress={handlePay}>
            <Text style={styles.payBtnText}>{user.is_vip ? "已开通会员" : "免费开通会员"}</Text>
          </TouchableOpacity>
          {user.is_vip && user.vip_expires_at && (
            <Text style={styles.expireText}>有效期至: {user.vip_expires_at.slice(0, 10)}</Text>
          )}
        </View>
        <View style={styles.section}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>推送通知</Text>
              <Text style={styles.notifDesc}>每30分钟推送世界杯热点资讯</Text>
            </View>
            <Switch value={notifEnabled} onValueChange={handleToggleNotif}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={notifEnabled ? theme.colors.secondary : "#666"} />
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>退出登录</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, justifyContent: "center", flexGrow: 1 }}>
      <Text style={styles.authTitle}>手机验证码登录</Text>
      <Text style={styles.authSubtitle}>输入手机号获取验证码</Text>

      <TextInput style={styles.input} placeholder="手机号" placeholderTextColor={theme.colors.textMuted}
        value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={11} />

      <View style={styles.codeRow}>
        <TextInput style={[styles.input, styles.codeInput]} placeholder="验证码" placeholderTextColor={theme.colors.textMuted}
          value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
        <TouchableOpacity style={[styles.codeBtn, countdown > 0 && styles.codeBtnDisabled]} onPress={handleSendCode} disabled={codeLoading || countdown > 0}>
          {codeLoading ? (
            <ActivityIndicator size="small" color={theme.colors.text} />
          ) : (
            <Text style={[styles.codeBtnText, countdown > 0 && styles.codeBtnTextDisabled]}>
              {countdown > 0 ? countdown + "秒" : "获取验证码"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <TextInput style={styles.input} placeholder="昵称（选填）" placeholderTextColor={theme.colors.textMuted}
        value={nickname} onChangeText={setNickname} maxLength={12} />

      <TouchableOpacity style={styles.authBtn} onPress={handleAuth} disabled={loading}>
        <Text style={styles.authBtnText}>{loading ? "处理中..." : "登录 / 注册"}</Text>
      </TouchableOpacity>

      <Text style={styles.tipText}>首次登录自动注册，无需密码</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  profileHeader: { alignItems: "center", paddingVertical: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { color: theme.colors.text, fontSize: 28, fontWeight: "bold" },
  nickname: { color: theme.colors.text, fontSize: theme.fontSize.lg, fontWeight: "bold" },
  phone: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm, marginTop: 4 },
  vipBadge: { backgroundColor: "#f5c51822", borderWidth: 1, borderColor: theme.colors.secondary, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4, marginTop: 10 },
  vipText: { color: theme.colors.secondary, fontSize: theme.fontSize.sm, fontWeight: "bold" },
  notVipBadge: { backgroundColor: "#333", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4, marginTop: 10 },
  notVipText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  section: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: 16, marginTop: 16 },
  sectionTitle: { color: theme.colors.secondary, fontSize: theme.fontSize.md, fontWeight: "bold", marginBottom: 8 },
  notifDesc: { color: theme.colors.textSecondary, fontSize: theme.fontSize.xs, lineHeight: 16 },
  payBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.sm, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  payBtnText: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: "bold" },
  expireText: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, textAlign: "center", marginTop: 8 },
  logoutBtn: { marginTop: 24, alignItems: "center", paddingVertical: 12 },
  logoutText: { color: theme.colors.error, fontSize: theme.fontSize.md },
  authTitle: { color: theme.colors.text, fontSize: theme.fontSize.xxl, fontWeight: "bold", textAlign: "center", marginBottom: 8 },
  authSubtitle: { color: theme.colors.textSecondary, textAlign: "center", marginBottom: 20 },
  input: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.sm, padding: 14, color: theme.colors.text, fontSize: theme.fontSize.md, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  codeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  codeInput: { flex: 1 },
  codeBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.sm, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12, minWidth: 100, alignItems: "center" },
  codeBtnDisabled: { backgroundColor: theme.colors.surfaceLight },
  codeBtnText: { color: theme.colors.text, fontSize: theme.fontSize.sm, fontWeight: "600" },
  codeBtnTextDisabled: { color: theme.colors.textMuted },
  authBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.sm, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  authBtnText: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: "bold" },
  tipText: { color: theme.colors.textMuted, textAlign: "center", marginTop: 12, fontSize: theme.fontSize.xs },
});

