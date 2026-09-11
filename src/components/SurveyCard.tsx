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

export function SurveyCard({ survey, answer, onAnswerSelect, onSubmit, submitting, submitted, message }: SurveyCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Encuesta</Text>
      <Text style={styles.question}>{survey.question}</Text>
      {survey.options.map((option) => (
        <Pressable
          key={option}
          style={[styles.option, answer === option && styles.optionSelected]}
          onPress={() => onAnswerSelect(option)}
          disabled={submitted}
        >
          <Text style={styles.optionText}>{option}</Text>
        </Pressable>
      ))}
      {!submitted ? (
        <Pressable style={styles.primaryButton} onPress={onSubmit} disabled={submitting || !answer}>
          <Text style={styles.primaryButtonText}>{submitting ? "Enviando..." : "Responder encuesta"}</Text>
        </Pressable>
      ) : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 10,
    backgroundColor: "#eff6ff",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
  },
  question: {
    marginBottom: 14,
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "700",
  },
  option: {
    padding: 13,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  optionSelected: {
    borderColor: "#2563eb",
    backgroundColor: "#dbeafe",
  },
  optionText: {
    color: "#1e3a8a",
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: "#0f172a",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 14,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  message: {
    color: "#15803d",
    textAlign: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});