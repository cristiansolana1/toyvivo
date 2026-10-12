const CACHE_PREFIX = "estoy_bien_admin_cache_";
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function getCachedData(key) {
  try {
    const itemStr = localStorage.getItem(CACHE_PREFIX + key);
    if (!itemStr) return null;
    const item = JSON.parse(itemStr);
    if (Date.now() > item.expiry) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return item.value;
  } catch (e) {
    return null;
  }
}

export function setCachedData(key, value, ttlMs = DEFAULT_TTL_MS) {
  try {
    const item = {
      value,
      expiry: Date.now() + ttlMs
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
  } catch (e) {
    console.warn("[Cache] Failed to set cache:", e);
  }
}

export function clearCache(keyPrefix = "") {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX + keyPrefix)) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {}
}
