// ===== INACTIVITY TIMER =====

export function createInactivityTimer(logoutFn, options = {}) {
  const {
    timeoutMs = 10 * 60 * 1000,      // 10 minutes
    warningMs = 9 * 60 * 1000,       // 9 minutes (1 min before logout)
    onWarning = null,                // callback when warning triggers
    onLogout = null                  // callback after logout
  } = options;

  let timerId = null;
  let warningId = null;
  let lastActivity = Date.now();
  let isWarningShown = false;

  // Events that count as activity
  const ACTIVITY_EVENTS = [
    'mousemove', 'keydown', 'click', 'scroll', 
    'touchstart', 'touchmove', 'pointerdown'
  ];

  function getElapsed() {
    return Date.now() - lastActivity;
  }

  function getRemaining() {
    return Math.max(0, timeoutMs - getElapsed());
  }

  function getWarningRemaining() {
    return Math.max(0, warningMs - getElapsed());
  }

  function clearTimers() {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    if (warningId) {
      clearTimeout(warningId);
      warningId = null;
    }
  }

  function scheduleTimers() {
    clearTimers();
    
    const remaining = getRemaining();
    const warningRemaining = getWarningRemaining();

    if (remaining <= 0) {
      // Already past timeout - logout immediately
      logout();
      return;
    }

    if (!isWarningShown && warningRemaining > 0 && warningRemaining < remaining) {
      // Schedule warning
      warningId = setTimeout(() => {
        showWarning();
      }, warningRemaining);
    }

    // Schedule logout
    timerId = setTimeout(() => {
      logout();
    }, remaining);
  }

  function showWarning() {
    isWarningShown = true;
    if (onWarning) onWarning(getWarningRemaining());
  }

  function logout() {
    clearTimers();
    isWarningShown = false;
    if (onLogout) onLogout();
    logoutFn();
  }

  function reset() {
    lastActivity = Date.now();
    isWarningShown = false;
    clearTimers();
    scheduleTimers();
  }

  function handleActivity() {
    // Throttle: only reset if more than 1 second since last activity
    const now = Date.now();
    if (now - lastActivity > 1000) {
      reset();
    }
  }

  function start() {
    lastActivity = Date.now();
    isWarningShown = false;
    
    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Handle tab visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearTimers();
      } else {
        // Tab became visible - check if session expired while hidden
        if (getElapsed() >= timeoutMs) {
          logout();
        } else {
          reset();
        }
      }
    });

    // Handle page unload (for multi-tab sync)
    window.addEventListener('beforeunload', () => {
      localStorage.setItem('lastActivity', Date.now().toString());
    });

    // Check for activity in other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === 'lastActivity' && e.newValue) {
        const otherTabActivity = parseInt(e.newValue, 10);
        if (otherTabActivity > lastActivity) {
          lastActivity = otherTabActivity;
          if (getElapsed() >= timeoutMs) {
            logout();
          } else {
            scheduleTimers();
          }
        }
      }
    });

    // Initialize from other tabs
    const stored = localStorage.getItem('lastActivity');
    if (stored) {
      const otherTabActivity = parseInt(stored, 10);
      if (otherTabActivity > lastActivity) {
        lastActivity = otherTabActivity;
      }
    }

    scheduleTimers();
    localStorage.setItem('lastActivity', Date.now().toString());
  }

  function stop() {
    clearTimers();
    ACTIVITY_EVENTS.forEach(event => {
      document.removeEventListener(event, handleActivity);
    });
    document.removeEventListener('visibilitychange');
    window.removeEventListener('beforeunload');
    window.removeEventListener('storage');
  }

  return {
    start,
    stop,
    reset,
    getRemaining,
    getElapsed,
    isWarningShown: () => isWarningShown
  };
}