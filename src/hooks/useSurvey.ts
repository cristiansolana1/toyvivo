import { useState, useEffect, useCallback } from "react";
import { getUnansweredSurvey, submitSurveyResponse } from "../services/surveyService";
import { Survey, UserProfile } from "../types";

interface UseSurveyReturn {
  survey: Survey | null;
  surveyAnswer: string | null;
  setSurveyAnswer: (answer: string | null) => void;
  surveySubmitted: boolean;
  surveyMessage: string | null;
  submittingSurvey: boolean;
  handleSurveySubmit: () => Promise<void>;
}

export function useSurvey(userId: string, userProfile?: UserProfile): UseSurveyReturn {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [surveyAnswer, setSurveyAnswer] = useState<string | null>(null);
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [surveyMessage, setSurveyMessage] = useState<string | null>(null);
  const [submittingSurvey, setSubmittingSurvey] = useState(false);

  const userCountry = userProfile?.country;
  const userProvince = userProfile?.province;

  useEffect(() => {
    loadSurvey();
  }, [userId, userCountry, userProvince]);

  const loadSurvey = useCallback(async () => {
    try {
      const unansweredSurvey = await getUnansweredSurvey(userId, userCountry, userProvince);
      if (!unansweredSurvey) {
        setSurvey(null);
        return;
      }
      setSurvey(unansweredSurvey);
      setSurveySubmitted(false);
      setSurveyAnswer(null);
      setSurveyMessage(null);
    } catch {
      setSurveyMessage("No se pudo cargar la encuesta.");
    }
  }, [userId, userCountry, userProvince]);

  const handleSurveySubmit = useCallback(async () => {
    if (!survey || !surveyAnswer || surveySubmitted) return;

    try {
      setSubmittingSurvey(true);
      await submitSurveyResponse(survey.id, userId, surveyAnswer);
      setSurveySubmitted(true);
      setSurveyMessage("Respuesta registrada correctamente.");
      setSurvey(null);
    } catch (error) {
      setSurveyMessage(
        error instanceof Error && error.message === "SURVEY_ALREADY_ANSWERED"
          ? "Ya respondiste esta encuesta."
          : "No se pudo registrar la respuesta. Inténtalo nuevamente."
      );
    } finally {
      setSubmittingSurvey(false);
    }
  }, [survey, surveyAnswer, surveySubmitted, userId]);

  return {
    survey,
    surveyAnswer,
    setSurveyAnswer,
    surveySubmitted,
    surveyMessage,
    submittingSurvey,
    handleSurveySubmit,
  };
}