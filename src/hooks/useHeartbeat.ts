import { useState, useCallback, useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import { sendHeartbeat, loadLastHeartbeat, syncPendingHeartbeats, getPendingHeartbeats } from "../services/heartbeatService";
import { HeartbeatEntry } from "../types";
import { isHeartbeatOverdue, formatHeartbeatCountdown, HEARTBEAT_LIMIT_MS } from "../constants";

interface UseHeartbeatReturn {
  lastHeartbeat: string | null;
  sending: boolean;
  currentTime: number;
  formattedLastHeartbeat: string;
  overdue: boolean;
  countdownText: string;
  handleHeartbeat: () => Promise<void>;
  syncPending: () => Promise<void>;
  pendingCount: number;
  isOnline: boolean;
  HEARTBEAT_LIMIT_MS: number;
}

export function useHeartbeat(userId: string): UseHeartbeatReturn {
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadLastHeartbeat(userId).then(setLastHeartbeat);
    getPendingHeartbeats(userId).then((pending: HeartbeatEntry[]) => setPendingCount(pending.length));
  }, [userId]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const wasOffline = !isOnline;
      const nowOnline = state.isConnected === true;
      setIsOnline(nowOnline);
      if (wasOffline && nowOnline && pendingCount > 0) {
        syncPending();
      }
    });
    return unsubscribe;
  }, [userId, pendingCount]);

  const handleHeartbeat = useCallback(async () => {
    const heartbeat: HeartbeatEntry = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: "alive",
    };

    try {
      setSending(true);
      const result = await sendHeartbeat(userId, heartbeat);
      setLastHeartbeat(heartbeat.createdAt);
      if (result.queued) {
        setPendingCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error sending heartbeat:", error);
      setSending(false);
      // Error is already handled by syncPending on reconnection
    } finally {
      setSending(false);
    }
  }, [userId]);

  const syncPending = useCallback(async () => {
    if (pendingCount === 0) return;
    setSending(true);
    try {
      const result = await syncPendingHeartbeats(userId);
      setPendingCount((prev) => prev - result.synced);
    } finally {
      setSending(false);
    }
  }, [userId, pendingCount]);

  useEffect(() => {
    const updatePending = async () => {
      const pending = await getPendingHeartbeats(userId);
      setPendingCount(pending.length);
    };
    updatePending();
    const interval = setInterval(updatePending, 30000);
    return () => clearInterval(interval);
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
    syncPending,
    pendingCount,
    isOnline,
    HEARTBEAT_LIMIT_MS,
  };
}