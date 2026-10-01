import React, { useState, useCallback } from "react";
import { ToastNotification } from "../components/ToastNotification";

interface UseToastReturn {
  showToast: (options: {
    text: string;
    type?: "success" | "error" | "info";
    duration?: number;
  }) => void;
  hideToast: () => void;
  isVisible: boolean;
}

export function useToast(): UseToastReturn {
  const [isVisible, setIsVisible] = useState(false);

  const showToast = useCallback(
    ({ text, type = "info", duration = 3000 }: {
      text: string;
      type?: "success" | "error" | "info";
      duration?: number;
    }) => {
      // The ToastNotification component manages its own visibility via useEffect
      // We just need to ensure it's shown - we'll render it via a parent component
      setIsVisible(true);

      const hideTimeout = setTimeout(() => {
        setIsVisible(false);
      }, duration);

      return () => clearTimeout(hideTimeout);
    },
    []
  );

  const hideToast = useCallback(() => {
    setIsVisible(false);
  }, []);

  return {
    showToast,
    hideToast,
    isVisible,
  };
}