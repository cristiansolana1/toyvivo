import { View, StyleSheet } from "react-native";

interface SkeletonLoaderProps {
  variant?: "text" | "button" | "card" | "input" | "avatar";
  width?: number;
  height?: number;
  animated?: boolean;
}

export function SkeletonLoader({
  variant = "text",
  width = 200,
  height = 16,
  animated = true,
}: SkeletonLoaderProps) {
  const baseOpacity = animated ? 0.4 : 1;

  const styles: Record<string, any> = {
    text: {
      backgroundColor: "#e2e8f0",
      borderRadius: 4,
      width,
      height,
      opacity: baseOpacity,
    },
    button: {
      backgroundColor: "#e2e8f0",
      borderRadius: 12,
      width,
      height: height || 50,
      opacity: baseOpacity,
    },
    card: {
      backgroundColor: "#e2e8f0",
      borderRadius: 12,
      width,
      height: height || 100,
      opacity: baseOpacity,
    },
    input: {
      backgroundColor: "#e2e8f0",
      borderRadius: 10,
      width,
      height: height || 50,
      opacity: baseOpacity,
    },
    avatar: {
      backgroundColor: "#e2e8f0",
      width: width || 60,
      height: width || 60,
      borderRadius: 30,
      opacity: baseOpacity,
    },
  };

  const style = styles[variant];

  return <View style={style} />;
}