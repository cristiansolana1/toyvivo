import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Survey } from "../types";

interface SurveyCardProps {
  survey: Survey;
  answer: string | null;
  onAnswerSelect: (option: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitted: boolean;
  message: string | null;
}

function SurveyCardComponent({ survey, answer, onAnswerSelect, onSubmit, submitting, submitted, message }: SurveyCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Encuesta</Text>
      <Text style={styles.question}>{survey.question}</Text>
      {survey.options.map((option) => (
        <Pressable
          key={option}
          style={({ pressed }) => [
            styles.option,
            answer === option && styles.optionSelected,
            pressed && styles.pressed,
          ]}
          onPress={() => onAnswerSelect(option)}
          disabled={submitted}
          accessibilityLabel={`Opción: ${option}`}
          accessibilityRole="button"
          accessibilityState={{ selected: answer === option }}
        >
          <Text style={[styles.optionText, answer === option && styles.optionTextSelected]}>{option}</Text>
        </Pressable>
      ))}
      {!submitted ? (
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={onSubmit}
          disabled={submitting || !answer}
          accessibilityLabel="Responder encuesta"
        >
          <Text style={styles.primaryButtonText}>{submitting ? "Enviando..." : "Responder encuesta"}</Text>
        </Pressable>
      ) : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

export const SurveyCard = memo(SurveyCardComponent);

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#d5dfd8",
    borderRadius: 16,
    backgroundColor: "#fffdf8",
    shadowColor: "#244438",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#15231f",
    marginBottom: 10,
  },
  question: {
    marginBottom: 14,
    color: "#15231f",
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24,
  },
  option: {
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#c8d8cf",
    borderRadius: 12,
    backgroundColor: "#f4f8f5",
  },
  optionSelected: {
    borderColor: "#286052",
    backgroundColor: "#e2ede8",
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  optionText: {
    color: "#15231f",
    fontSize: 16,
    fontWeight: "500",
  },
  optionTextSelected: {
    color: "#1f4c40",
    fontWeight: "700",
  },
  primaryButton: {
    backgroundColor: "#286052",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 8,
    minHeight: 48,
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fffdf8",
    fontSize: 16,
    fontWeight: "700",
  },
  message: {
    color: "#1a6e3a",
    textAlign: "center",
    paddingHorizontal: 12,
    paddingTop: 10,
    fontWeight: "600",
  },
});
