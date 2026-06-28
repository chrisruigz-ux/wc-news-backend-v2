import AsyncStorage from "@react-native-async-storage/async-storage";

// 后端 API 地址（开发时用局域网 IP，发布时改为服务器地址）
import { Platform } from "react-native";
const DEV_API = "http://10.0.2.2:3001";
const PROD_API = "http://121.43.210.164";
let API_BASE = PROD_API;

// 获取 token
let cachedToken = null;

export async function getToken() {
  if (cachedToken) return cachedToken;
  cachedToken = await AsyncStorage.getItem("@auth_token");
  return cachedToken;
}

export async function setToken(token) {
  cachedToken = token;
  if (token) await AsyncStorage.setItem("@auth_token", token);
  else await AsyncStorage.removeItem("@auth_token");
}

async function request(path, options = {}) {
  const token = await getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const resp = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(err.error || "请求失败");
  }
  return resp.json();
}

// 更新 API 地址
export function setApiBase(url) { API_BASE = url; }
export function getApiBase() { return API_BASE; }

// ---- API 方法 ----

// 注册
export async function apiSendCode(phone) {
  return request("/api/auth/send-code", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function apiRegisterWithCode(phone, code, nickname) {
  const data = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ phone, code, nickname }),
  });
  if (data.token) await setToken(data.token);
  return data;
}

// 登录
export async function apiLoginWithCode(phone, code) {
  const data = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });
  if (data.token) await setToken(data.token);
  return data;
}

// 获取用户信息
export async function apiGetProfile() {
  return request("/api/auth/me");
}

// 获取新闻列表
export async function apiGetNews(page = 1, limit = 20) {
  return request(`/api/news?page=${page}&limit=${limit}`);
}

// 获取新闻详情
export async function apiGetNewsDetail(id) {
  return request(`/api/news/${id}`);
}

// 获取赛程
export async function apiGetSchedule(date) {
  const q = date ? `?date=${date}` : "";
  return request(`/api/schedule${q}`);
}

// 获取球队列表
export async function apiGetTeams() {
  return request("/api/teams");
}

// 创建支付订单
export async function apiCreatePayment() {
  return request("/api/payment/create", { method: "POST" });
}

// 模拟支付
export async function apiSimulatePayment(orderId) {
  return request(`/api/payment/simulate/${orderId}`, { method: "POST" });
}

// 检查订单状态
export async function apiGetPaymentStatus(orderId) {
  return request(`/api/payment/status/${orderId}`);
}

// 获取服务器状态
export async function apiGetStatus() {
  return request("/api/status");
}








