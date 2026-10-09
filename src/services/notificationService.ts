import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

export const HEARTBEAT_CATEGORY_ID = "heartbeat_actions";
export const ACTION_ESTOY_BIEN_ID = "action_estoy_bien";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("heartbeat", {
      name: "Avisos de Vida",
      description: "Notificaciones de disponibilidad del botón Estoy Bien",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#16a34a",
      sound: "default",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync("heartbeat_urgent", {
      name: "Alertas Urgentes",
      description: "Alertas cuando está por vencer el plazo para avisar",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: "#dc2626",
      sound: "default",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync("surveys", {
      name: "Encuestas y Novedades",
      description: "Notificaciones cuando hay nuevas encuestas disponibles",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#3b82f6",
      sound: "default",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

export async function setupNotificationCategories(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.setNotificationCategoryAsync(HEARTBEAT_CATEGORY_ID, [
      {
        identifier: ACTION_ESTOY_BIEN_ID,
        buttonTitle: "🟢 Estoy bien",
        options: {
          opensAppToForeground: true,
        },
      },
    ]);
  } catch (error) {
    console.warn("Error setting up notification categories:", error);
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus === "granted") {
      await setupNotificationChannels();
      await setupNotificationCategories();
    }
    return finalStatus === "granted";
  } catch (error) {
    console.warn("Error requesting notification permissions:", error);
    return false;
  }
}

export async function scheduleHeartbeatReminders(lastHeartbeat: string | null): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!lastHeartbeat) {
      return;
    }

    const lastTime = new Date(lastHeartbeat).getTime();
    if (isNaN(lastTime)) {
      return;
    }

    const now = Date.now();
    const elapsedSeconds = (now - lastTime) / 1000;
    const secondsUntil24Hours = Math.round(24 * 3600 - elapsedSeconds);

    if (secondsUntil24Hours > 0) {
      // Programar la notificación para que se active ÚNICAMENTE cuando se cumplan las 24 horas exactas
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "¡Botón 'Estoy bien' disponible! 🟢",
          body: "Han pasado 24 horas desde tu último aviso. Envía tu señal para que tus contactos sepan que estás bien.",
          data: { type: "heartbeat_available" },
          sound: true,
          channelId: "heartbeat",
          categoryIdentifier: HEARTBEAT_CATEGORY_ID,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsUntil24Hours,
          repeats: false,
        },
      });
    }
  } catch (error) {
    console.warn("Error scheduling notification reminders:", error);
  }
}

export async function cancelHeartbeatReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn("Error canceling notifications:", error);
  }
}

export async function sendHeartbeatAvailableNotification(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "¡Botón 'Estoy bien' disponible! 🟢",
        body: "Han pasado 24 horas desde tu último aviso. Envía tu señal para que tus contactos sepan que estás bien.",
        data: { type: "heartbeat_available" },
        sound: true,
        channelId: "heartbeat",
        categoryIdentifier: HEARTBEAT_CATEGORY_ID,
      },
      trigger: null,
    });
    return notificationId;
  } catch (error) {
    console.warn("Error sending heartbeat available notification:", error);
    return null;
  }
}

export async function sendSurveyNotification(
  question: string,
  surveyId: string
): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "¡Nueva encuesta disponible! 📋",
        body: question,
        data: { type: "new_survey", surveyId },
        sound: true,
        channelId: "surveys",
      },
      trigger: null,
    });
    return notificationId;
  } catch (error) {
    console.warn("Error sending survey notification:", error);
    return null;
  }
}

export function registerNotificationResponseListener(
  onHeartbeatRequested: () => void
): () => void {
  if (Platform.OS === "web") return () => {};

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const { actionIdentifier, notification } = response;
    const data = notification.request.content.data;

    const isHeartbeatNotification =
      data?.type === "heartbeat_reminder" ||
      data?.type === "heartbeat_urgent" ||
      data?.type === "heartbeat_available";

    if (isHeartbeatNotification) {
      if (
        actionIdentifier === ACTION_ESTOY_BIEN_ID ||
        actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
      ) {
        onHeartbeatRequested();
      }
    }
  });

  return () => {
    subscription.remove();
  };
}


