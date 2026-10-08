import { useState, useCallback, useEffect, useRef } from "react";
import NetInfo from "@react-native-community/netinfo";
import { sendHeartbeat, loadLastHeartbeat, syncPendingHeartbeats, getPendingHeartbeats } from "../services/heartbeatService";
import {
  scheduleHeartbeatReminders,
  requestNotificationPermissions,
  sendHeartbeatAvailableNotification,
  registerNotificationResponseListener,
} from "../services/notificationService";
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
  const isOnlineRef = useRef(true);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    loadLastHeartbeat(userId).then((value) => {
      if (active) setLastHeartbeat(value);
    });
    getPendingHeartbeats(userId).then((pending: HeartbeatEntry[]) => {
      if (active) setPendingCount(pending.length);
    });
    return () => {
      active = false;
    };
  }, [userId]);

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
      void requestNotificationPermissions().then((granted) => {
        if (granted) {
          void scheduleHeartbeatReminders(heartbeat.createdAt);
        }
      });
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
    const unsubscribe = NetInfo.addEventListener((state) => {
      const wasOffline = !isOnlineRef.current;
      const nowOnline = state.isConnected === true;
      isOnlineRef.current = nowOnline;
      setIsOnline(nowOnline);
      if (wasOffline && nowOnline && pendingCount > 0) {
        void syncPending();
      }
    });
    return unsubscribe;
  }, [userId, pendingCount, syncPending]);

  useEffect(() => {
    let active = true;
    getPendingHeartbeats(userId).then((pending: HeartbeatEntry[]) => {
      if (active) setPendingCount(pending.length);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const formattedLastHeartbeat = lastHeartbeat
    ? new Date(lastHeartbeat).toLocaleString()
    : "Sin registro todavía.";

  const overdue = isHeartbeatOverdue(lastHeartbeat, currentTime);
  const countdownText = formatHeartbeatCountdown(lastHeartbeat, currentTime);

  const prevOverdueRef = useRef<boolean | null>(null);

  useEffect(() => {
    void requestNotificationPermissions().then((granted) => {
      if (granted && lastHeartbeat !== null) {
        void scheduleHeartbeatReminders(lastHeartbeat);
      }
    });
  }, [lastHeartbeat]);

  useEffect(() => {
    if (prevOverdueRef.current === false && overdue) {
      void requestNotificationPermissions().then((granted) => {
        if (granted) {
          void sendHeartbeatAvailableNotification();
        }
      });
    }
    prevOverdueRef.current = overdue;
  }, [overdue]);

  useEffect(() => {
    const unsubscribe = registerNotificationResponseListener(() => {
      void handleHeartbeat();
    });
    return unsubscribe;
  }, [handleHeartbeat]);

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