import React, { useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";

const { height } = Dimensions.get("window");

interface ToastProps {
  text: string;
  type?: "success" | "error" | "info";
  duration?: number;
}

export function ToastNotification({ text, type = "info", duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const hideTimeout = setTimeout(() => {
      setVisible(false);
    }, duration);

    return () => clearTimeout(hideTimeout);
  }, [visible]);

  // Render null if not visible
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{type === "success" ? "✓" : type === "error" ? "✕" : "ℹ"}</Text>
      </View>
      <Text style={[styles.text, styles[type]]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 80,
    left: 20,
    right: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  iconContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
  },
  icon: {
    color: "#fff",
    fontSize: 16,
  },
  success: {
    color: "#10b981",
  },
  error: {
    color: "#ef4444",
  },
  info: {
    color: "#3b82f6",
  },
  text: {
    color: "#fff",
    fontSize: 14,
  },
});