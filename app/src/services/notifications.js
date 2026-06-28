import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { getToken, getApiBase, getFollowedTeams } from "./api";
import { apiGetProfile } from "./api";

// 配置通知行为：App在前台时显示通知
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// 注册推送通知
export async function registerForPushNotifications() {
  try {
    if (!Device.isDevice) {
      console.log("Push notifications only work on physical devices");
      return null;
    }

    // Android需要先创建通知渠道
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "世界杯资讯",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#f5c518",
      });
    }

    // 请求通知权限
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.log("Push notification permission not granted");
      return null;
    }

    // 获取 Expo Push Token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || undefined,
    });
    const pushToken = tokenData.data;
    console.log("Push token:", pushToken);
    return pushToken;
  } catch (e) {
    console.log("Failed to register push notifications:", e.message);
    return null;
  }
}

// 发送推送token到后端
export async function syncPushTokenToServer(pushToken) {
  try {
    const token = await getToken();
    if (!token) {
      console.log("Not logged in, skipping push token sync");
      return false;
    }
    // 使用 fetch 直接调用 API
    const base = getApiBase();
    const resp = await fetch(base + "/api/notifications/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token,
      },
      body: JSON.stringify({
        push_token: pushToken,
        device_info: { platform: Platform.OS, platform_version: Platform.Version },
      }),
    });
    const data = await resp.json();
    return data.success;
  } catch (e) {
    console.log("Failed to sync push token:", e.message);
    return false;
  }
}

// 更新推送设置
export async function updateNotificationSetting(enabled) {
  try {
    const token = await getToken();
    if (!token) return false;
    const base = getApiBase();
    const resp = await fetch(base + "/api/notifications/settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token,
      },
      body: JSON.stringify({ notifications_enabled: enabled }),
    });
    const data = await resp.json();
    return data.success;
  } catch (e) {
    console.log("Failed to update notification settings:", e.message);
    return false;
  }
}

// 获取推送设置
export async function getNotificationSettings() {
  try {
    const token = await getToken();
    if (!token) return { registered: false, notifications_enabled: false };
    const base = getApiBase();
    const resp = await fetch(base + "/api/notifications/settings", {
      headers: { "Authorization": "Bearer " + token },
    });
    return await resp.json();
  } catch (e) {
    return { registered: false, notifications_enabled: false };
  }
}

// 添加通知点击监听器，返回移除函数
export function addNotificationResponseListener(handler) {
  // 处理点击通知时的响应
  const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    if (data && data.newsId && handler) {
      handler(data);
    }
  });
  return () => responseListener.remove();
}
