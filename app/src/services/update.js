import { Alert, Linking, Platform } from "react-native";
import { getApiBase } from "./api";

const APP_VERSION = "1.0.0";
let lastCheckTime = 0;

// 检查更新
export async function checkForUpdates(showNoUpdateMsg = false) {
  try {
    const base = getApiBase();
    const resp = await fetch(base + "/api/version");
    const data = await resp.json();
    const serverVersion = data.latestVersion || "1.0.0";
    const forceUpdate = data.forceUpdate || false;

    if (compareVersions(serverVersion, APP_VERSION) > 0) {
      // 有新版本
      showUpdateDialog(data);
      return true;
    } else if (showNoUpdateMsg) {
      Alert.alert("检查更新", "当前已是最新版本 " + APP_VERSION);
    }
    return false;
  } catch (e) {
    if (showNoUpdateMsg) {
      Alert.alert("检查失败", "无法连接到更新服务器，请检查网络");
    }
    console.log("Version check error:", e.message);
    return false;
  }
}

// 版本号比较
function compareVersions(v1, v2) {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const a = parts1[i] || 0;
    const b = parts2[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

// 显示更新对话框
function showUpdateDialog(data) {
  const msg = "发现新版本 " + data.latestVersion + "！\n\n"
    + "更新内容：\n" + (data.releaseNotes || "性能优化和bug修复")
    + "\n\n发布日期：" + (data.releaseDate || "");

  const buttons = [
    { text: "稍后再说", style: "cancel" },
  ];

  if (data.apkUrl) {
    buttons.push({
      text: "立即更新",
      onPress: () => {
        Linking.openURL(data.apkUrl);
      },
    });
  }

  // 强制更新时，不能取消
  if (data.forceUpdate) {
    Alert.alert("需要更新", msg, [
      { text: "立即更新", onPress: () => Linking.openURL(data.apkUrl) },
    ], { cancelable: false });
  } else {
    Alert.alert("新版本可用", msg, buttons);
  }
}

export { APP_VERSION };
