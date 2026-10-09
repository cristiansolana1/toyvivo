import { useState, useEffect, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import {
  getUnansweredSurvey,
  submitSurveyResponse,
  subscribeToActiveSurveys,
  surveyMatchesLocation,
} from "../services/surveyService";
import { loadNotifiedSurveyId, saveNotifiedSurveyId } from "../storage";
import { requestNotificationPermissions, sendSurveyNotification } from "../services/notificationService";
import { Survey, UserProfile } from "../types";

interface UseSurveyReturn {
  survey: Survey | null;
  surveyAnswer: string | null;
  setSurveyAnswer: (answer: string | null) => void;
  surveySubmitted: boolean;
  surveyMessage: string | null;
  submittingSurvey: boolean;
  handleSurveySubmit: () => Promise<void>;
  loadSurvey: () => Promise<void>;
}

export function useSurvey(userId: string, userProfile?: UserProfile): UseSurveyReturn {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [surveyAnswer, setSurveyAnswer] = useState<string | null>(null);
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [surveyMessage, setSurveyMessage] = useState<string | null>(null);
  const [submittingSurvey, setSubmittingSurvey] = useState(false);

  const userCountry = userProfile?.country;
  const userProvince = userProfile?.province;

  const loadSurvey = useCallback(async () => {
    try {
      const unansweredSurvey = await getUnansweredSurvey(userId, userCountry, userProvince);
      if (!unansweredSurvey) {
        setSurvey(null);
        return;
      }
      setSurvey(unansweredSurvey);
      setSurveySubmitted(false);

      const notifiedId = await loadNotifiedSurveyId(userId);
      if (notifiedId !== unansweredSurvey.id) {
        const granted = await requestNotificationPermissions();
        if (granted) {
          await sendSurveyNotification(unansweredSurvey.question, unansweredSurvey.id);
          await saveNotifiedSurveyId(userId, unansweredSurvey.id);
        }
      }
    } catch {
      setSurveyMessage("No se pudo cargar la encuesta.");
    }
  }, [userId, userCountry, userProvince]);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToActiveSurveys(async (activeSurveys) => {
      try {
        const matchingSurveys = activeSurveys.filter((item) =>
          surveyMatchesLocation(item, userCountry, userProvince)
        );

        const responses = await Promise.all(
          matchingSurveys.map((candidate) =>
            getDoc(doc(db, "surveys", candidate.id, "responses", userId))
          )
        );
        const unansweredIndex = responses.findIndex((res) => !res.exists());

        if (unansweredIndex < 0) {
          setSurvey(null);
          return;
        }

        const candidate = matchingSurveys[unansweredIndex];
        const unansweredSurvey: Survey = {
          id: candidate.id,
          question: candidate.question ?? "",
          options: (candidate.options as unknown[])
            .filter((opt): opt is string => typeof opt === "string")
            .slice(0, 4),
        };

        setSurvey(unansweredSurvey);

        const notifiedId = await loadNotifiedSurveyId(userId);
        if (notifiedId !== unansweredSurvey.id) {
          const granted = await requestNotificationPermissions();
          if (granted) {
            await sendSurveyNotification(unansweredSurvey.question, unansweredSurvey.id);
            await saveNotifiedSurveyId(userId, unansweredSurvey.id);
          }
        }
      } catch (err) {
        console.warn("Error processing real-time survey update:", err);
      }
    });

    return () => {
      unsubscribe();
    };
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
    loadSurvey,
  };
}
