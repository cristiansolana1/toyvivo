import { useState, useCallback, useEffect } from "react";
import { sendHeartbeat, loadLastHeartbeat } from "../services/heartbeatService";
import { HeartbeatEntry } from "../types";
import { isHeartbeatOverdue, formatHeartbeatCountdown, HEARTBEAT_LIMIT_MS } from "../constants";

export function useHeartbeat(userId: string) {
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadLastHeartbeat(userId).then(setLastHeartbeat);
  }, [userId]);

  const handleHeartbeat = useCallback(async () => {
    const heartbeat: HeartbeatEntry = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: "alive",
    };

    try {
      setSending(true);
      await sendHeartbeat(userId, heartbeat);
      setLastHeartbeat(heartbeat.createdAt);
    } catch (error) {
      console.error("Error sending heartbeat:", error);
      throw error;
    } finally {
      setSending(false);
    }
  }, [userId]);

  const formattedLastHeartbeat = lastHeartbeat
    ? new Date(lastHeartbeat).toLocaleString()
    : "Sin registro todavía.";

  const overdue = isHeartbeatOverdue(lastHeartbeat, currentTime);
  const countdownText = formatHeartbeatCountdown(lastHeartbeat, currentTime);

  return {
    lastHeartbeat,
    sending,
    currentTime,
    formattedLastHeartbeat,
    overdue,
    countdownText,
    handleHeartbeat,
    HEARTBEAT_LIMIT_MS,
  };
}