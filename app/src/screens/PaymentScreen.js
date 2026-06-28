import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import theme from "../theme";

export default function PaymentScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>支付功能已在"我的"页面集成</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, alignItems: "center", justifyContent: "center" },
  text: { color: theme.colors.textSecondary },
});
