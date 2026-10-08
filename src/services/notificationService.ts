import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
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
    return finalStatus === "granted";
  } catch (error) {
    console.warn("Error requesting notification permissions:", error);
    return false;
  }
}

export async function scheduleHeartbeatReminder(hoursFromNow = 22): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const triggerSeconds = hoursFromNow * 3600;
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Aviso de vida - Estoy Bien 🟢",
        body: "Recuerda enviar tu aviso diario para que tus contactos sepan que estás bien.",
        data: { type: "heartbeat_reminder" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: triggerSeconds,
        repeats: false,
      },
    });

    return notificationId;
  } catch (error) {
    console.warn("Error scheduling notification reminder:", error);
    return null;
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
        body: "Ya puedes enviar tu aviso diario para que tus contactos sepan que estás bien.",
        data: { type: "heartbeat_available" },
      },
      trigger: null,
    });
    return notificationId;
  } catch (error) {
    console.warn("Error sending heartbeat available notification:", error);
    return null;
  }
}
