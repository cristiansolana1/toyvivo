import { collection, getDocs, doc, getDoc, runTransaction, setDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { Survey } from "../types";

export interface SurveyWithMeta {
  id: string;
  question: string | undefined;
  options: unknown;
  active?: boolean;
  createdAt?: { toMillis?: () => number };
  startAt?: { toMillis?: () => number };
  endAt?: { toMillis?: () => number };
}

export async function getActiveSurveys(): Promise<SurveyWithMeta[]> {
  const snapshot = await getDocs(collection(db, "surveys"));
  const now = Date.now();
  return snapshot.docs
    .map((surveyDoc) => {
      const data = surveyDoc.data();
      return {
        id: surveyDoc.id,
        active: data.active as boolean | undefined,
        question: data.question as string | undefined,
        options: data.options as unknown,
        createdAt: data.createdAt as { toMillis?: () => number } | undefined,
        startAt: data.startAt as { toMillis?: () => number } | undefined,
        endAt: data.endAt as { toMillis?: () => number } | undefined,
      };
    })
    .filter((item) => {
      if (item.active === false) return false;
      if (typeof item.question !== "string") return false;
      if (!Array.isArray(item.options)) return false;
      const start = item.startAt?.toMillis?.() ?? 0;
      const end = item.endAt?.toMillis?.() ?? 0;
      if (start && now < start) return false;
      if (end && now > end) return false;
      return true;
    })
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
}

export async function getUnansweredSurvey(userId: string): Promise<Survey | null> {
  const activeSurveys = await getActiveSurveys();
  for (const candidate of activeSurveys) {
    const response = await getDoc(doc(db, "surveys", candidate.id, "responses", userId));
    if (!response.exists()) {
      return {
        id: candidate.id,
        question: candidate.question ?? "",
        options: (candidate.options as unknown[])
          .filter((option): option is string => typeof option === "string")
          .slice(0, 4),
      };
    }
  }
  return null;
}

export async function submitSurveyResponse(
  surveyId: string,
  userId: string,
  answer: string
): Promise<void> {
  const responseRef = doc(db, "surveys", surveyId, "responses", userId);
  await runTransaction(db, async (transaction) => {
    const response = await transaction.get(responseRef);
    if (response.exists()) {
      throw new Error("SURVEY_ALREADY_ANSWERED");
    }
    transaction.set(responseRef, {
      answer,
      answeredAt: new Date().toISOString(),
    });
  });
}

export async function hasAnsweredSurvey(surveyId: string, userId: string): Promise<boolean> {
  const response = await getDoc(doc(db, "surveys", surveyId, "responses", userId));
  return response.exists();
}