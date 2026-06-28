import React, { useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import AppNavigator from "./src/navigation/AppNavigator";
import { registerForPushNotifications, syncPushTokenToServer, addNotificationResponseListener } from "./src/services/notifications";
import { getToken } from "./src/services/api";
import { checkForUpdates } from "./src/services/update";

export default function App() {
  const navigationRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        // 检查更新
        await checkForUpdates();
        // 注册推送
        const token = await getToken();
        if (token) {
          const pushToken = await registerForPushNotifications();
          if (pushToken) {
            await syncPushTokenToServer(pushToken);
          }
        }
      } catch (e) {
        console.log("Init error:", e.message);
      }
    })();

    // 监听通知点击
    const removeListener = addNotificationResponseListener((data) => {
      console.log("Notification tapped:", data);
    });

    return () => {
      removeListener();
    };
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <AppNavigator />
    </>
  );
}
