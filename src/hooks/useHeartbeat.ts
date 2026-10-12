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
  loading: boolean;
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
  const [loading, setLoading] = useState(true);
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
    async function init() {
      setLoading(true);
      try {
        const value = await loadLastHeartbeat(userId);
        if (active) setLastHeartbeat(value);
      } catch (error) {
        console.error("Error loading last heartbeat on init:", error);
      } finally {
        if (active) setLoading(false);
      }

      const pending = await getPendingHeartbeats(userId);
      if (active) {
        setPendingCount(pending.length);
        if (pending.length > 0) {
          const state = await NetInfo.fetch();
          if (state.isConnected === true) {
            setSending(true);
            try {
              const result = await syncPendingHeartbeats(userId);
              if (active) {
                setPendingCount((prev) => Math.max(0, prev - result.synced));
                const updatedValue = await loadLastHeartbeat(userId);
                if (active && updatedValue) {
                  setLastHeartbeat(updatedValue);
                }
              }
            } catch (error) {
              console.error("Error syncing pending heartbeats on startup:", error);
            } finally {
              if (active) setSending(false);
            }
          }
        }
      }
    }
    void init();
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
      const updatedValue = await loadLastHeartbeat(userId);
      if (updatedValue) {
        setLastHeartbeat(updatedValue);
      }
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

  const formattedLastHeartbeat = loading
    ? "Cargando..."
    : lastHeartbeat
      ? new Date(lastHeartbeat).toLocaleString()
      : "Sin registro todavía.";

  const overdue = !loading && isHeartbeatOverdue(lastHeartbeat, currentTime);
  const countdownText = formatHeartbeatCountdown(lastHeartbeat, currentTime);

  useEffect(() => {
    void requestNotificationPermissions().then((granted) => {
      if (granted && lastHeartbeat !== null) {
        void scheduleHeartbeatReminders(lastHeartbeat);
      }
    });
  }, [lastHeartbeat]);

  useEffect(() => {
    const unsubscribe = registerNotificationResponseListener(() => {
      void handleHeartbeat();
    });
    return unsubscribe;
  }, [handleHeartbeat]);

  return {
    lastHeartbeat,
    sending,
    loading,
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
