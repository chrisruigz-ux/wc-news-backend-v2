import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Image } from "react-native";
import theme from "../theme";
import { apiGetNewsDetail, apiGetProfile, getToken } from "../services/api";

export default function NewsDetailScreen({ route }) {
  const { newsId, newsUrl } = route.params || {};
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const id = newsId || newsUrl?.split("/").pop().replace(".htm", "");
        const data = await apiGetNewsDetail(id);
        setArticle(data.article);
      } catch (e) {
        console.error(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [newsId]);

  // 简单 HTML 转纯文本
  const stripHtml = (html) => {
    if (!html) return "";
    return html
      .replace(/<p[^>]*>/g, "\n\n")
      .replace(/<\/p>/g, "")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<img[^>]*src=["']([^"']*)["'][^>]*>/g, (match, src) => `\n[图片: ${src}]\n`)
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  // 提取图片
  const extractImages = (html) => {
    if (!html) return [];
    const imgs = [];
    const re = /<img[^>]*src=["']([^"']*)["'][^>]*>/g;
    let m;
    while ((m = re.exec(html)) !== null) imgs.push(m[1].startsWith("//") ? "https:" + m[1] : m[1]);
    return imgs;
  };

  if (loading) {
    return <View style={styles.container}><ActivityIndicator size="large" color={theme.colors.secondary} /></View>;
  }

  if (!article) {
    return <View style={styles.container}><Text style={styles.errorText}>加载失败</Text></View>;
  }

  const images = article.images || extractImages(article.contentHtml);
  const plainContent = stripHtml(article.contentHtml);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.title}>{article.title}</Text>
      <View style={styles.meta}>
        <Text style={styles.source}>{article.source || "直播吧"}</Text>
        <Text style={styles.time}>{article.time || article.published_at || ""}</Text>
      </View>
      {images.length > 0 && (
        <Image source={{ uri: images[0].includes("//") && !images[0].startsWith("http") ? "https:" + images[0] : images[0] }} style={styles.mainImage} resizeMode="cover" />
      )}
      <Text style={styles.content}>{plainContent || article.summary || "暂无内容"}</Text>
      <Text style={styles.footer}>原文来自 直播吧(zhibo8.com) | 世界杯诗圆专享</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  errorText: { color: theme.colors.error, textAlign: "center", marginTop: 40 },
  title: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: "bold", lineHeight: 32, marginBottom: 12 },
  meta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  source: { color: theme.colors.secondary, fontSize: theme.fontSize.sm },
  time: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  mainImage: { width: "100%", height: 200, borderRadius: theme.borderRadius.md, marginBottom: 16 },
  content: { color: theme.colors.textSecondary, fontSize: 15, lineHeight: 26, marginTop: 8 },
  footer: { color: theme.colors.textMuted, fontSize: 11, textAlign: "center", marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
});
