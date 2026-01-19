let accessTokenMemory: string | null = null;
let accessExpiryTimer: number | null = null;

// BroadcastChannel for cross-tab auth sync (instant, more reliable than storage events)
let authChannel: BroadcastChannel | null = null;

export type StoredUser = {
  _id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  provider: 'google';
  googleId?: string;
};

export type AuthBroadcastMessage =
  | { type: 'logout' }
  | { type: 'login'; user: StoredUser; accessToken: string };

/**
 * Initialize BroadcastChannel for cross-tab auth sync
 * Falls back gracefully if BroadcastChannel is not supported
 */
function initBroadcastChannel() {
  if (typeof BroadcastChannel === 'undefined') {
    console.warn('BroadcastChannel not supported in this browser');
    return;
  }
  if (!authChannel) {
    authChannel = new BroadcastChannel('auth-sync');
  }
}

/**
 * Broadcast auth state change to other tabs
 */
export function broadcastAuthChange(message: AuthBroadcastMessage) {
  if (!authChannel) return;
  try {
    authChannel.postMessage(message);
  } catch (error) {
    console.error('Failed to broadcast auth change:', error);
  }
}

/**
 * Set up listener for auth broadcasts from other tabs
 */
export function setupAuthBroadcastListener(
  onMessage: (message: AuthBroadcastMessage) => void,
) {
  initBroadcastChannel();
  if (!authChannel) return () => {};

  const handler = (event: MessageEvent<AuthBroadcastMessage>) => {
    onMessage(event.data);
  };

  authChannel.addEventListener('message', handler);

  return () => {
    authChannel?.removeEventListener('message', handler);
  };
}

function decodeJwtExp(token: string | null): number | null {
  try {
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1] || ''));
    if (typeof payload.exp === 'number') return payload.exp * 1000;
    return null;
  } catch {
    return null;
  }
}

function clearTimer(timerId: number | null) {
  if (timerId) window.clearTimeout(timerId);
}

function scheduleAccessExpiryWatcher() {
  clearTimer(accessExpiryTimer);
  const accessExpMs = decodeJwtExp(accessTokenMemory);
  if (!accessExpMs) return;
  const delay = Math.max(0, accessExpMs - Date.now());
  accessExpiryTimer = window.setTimeout(() => {
    // Access token expired - the interceptor will try to refresh via cookie
    // If refresh fails, the interceptor will clear auth and redirect to login
  }, delay);
}

export const getAccessToken = () => accessTokenMemory;
export const setAccessToken = (token: string | null) => {
  accessTokenMemory = token;
  scheduleAccessExpiryWatcher();
};

export const getStoredUser = (): StoredUser | null => {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: StoredUser | null) => {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
};

/**
 * Persist user info after login
 * Note: Refresh token is now stored in HttpOnly cookie (server-side)
 */
export const persistLoginInfo = (user: StoredUser, accessToken: string) => {
  setStoredUser(user);
  setAccessToken(accessToken);
  // Broadcast login to other tabs (include access token so other tabs can sync)
  broadcastAuthChange({ type: 'login', user, accessToken });
};

/**
 * Clear all auth data locally WITHOUT broadcasting.
 * Use this when receiving logout broadcast from another tab to avoid ping-pong loop.
 */
export const clearLocalAuth = () => {
  accessTokenMemory = null;
  localStorage.removeItem('user');
  clearTimer(accessExpiryTimer);
  accessExpiryTimer = null;
};

/**
 * Clear all auth data and broadcast logout to other tabs.
 * Use this when user initiates logout action.
 * Note: HttpOnly cookie is cleared by the logout API endpoint
 */
export const clearAllAuth = () => {
  clearLocalAuth();
  // Broadcast logout to other tabs
  broadcastAuthChange({ type: 'logout' });
};

export const initAuthWatchers = () => {
  scheduleAccessExpiryWatcher();
  initBroadcastChannel();
};
