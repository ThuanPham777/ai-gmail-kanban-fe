let accessTokenMemory: string | null = null;
let accessExpiryTimer: number | null = null;
let refreshExpiryTimer: number | null = null;

// BroadcastChannel for cross-tab auth sync (instant, more reliable than storage events)
let authChannel: BroadcastChannel | null = null;

export type StoredUser = {
  _id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  provider?: 'password' | 'google';
};

export type AuthBroadcastMessage =
  | { type: 'logout' }
  | { type: 'login'; user: StoredUser };

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
  onMessage: (message: AuthBroadcastMessage) => void
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
  const hasRefresh = Boolean(localStorage.getItem('refreshToken'));
  if (!accessExpMs) return;
  const delay = Math.max(0, accessExpMs - Date.now());
  accessExpiryTimer = window.setTimeout(() => {
    if (!hasRefresh) {
      clearAllAuth();
      if (window.location.pathname !== '/login')
        window.location.assign('/login');
    }
  }, delay);
}

function scheduleRefreshExpiryWatcher() {
  clearTimer(refreshExpiryTimer);
  const refreshToken = localStorage.getItem('refreshToken');
  const refreshExpMs = decodeJwtExp(refreshToken);
  if (!refreshExpMs) return;
  const delay = Math.max(0, refreshExpMs - Date.now());
  refreshExpiryTimer = window.setTimeout(() => {
    clearAllAuth();
    if (window.location.pathname !== '/login') window.location.assign('/login');
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

export const persistRefreshInfo = (user: StoredUser, refreshToken: string) => {
  setStoredUser(user);
  localStorage.setItem('refreshToken', refreshToken);
  scheduleRefreshExpiryWatcher();
  // Broadcast login to other tabs
  broadcastAuthChange({ type: 'login', user });
};

export const touchRefreshWatcher = () => {
  scheduleRefreshExpiryWatcher();
};

export const clearAllAuth = () => {
  accessTokenMemory = null;
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  clearTimer(accessExpiryTimer);
  clearTimer(refreshExpiryTimer);
  accessExpiryTimer = null;
  refreshExpiryTimer = null;
  // Broadcast logout to other tabs
  broadcastAuthChange({ type: 'logout' });
};

export const initAuthWatchers = () => {
  scheduleAccessExpiryWatcher();
  scheduleRefreshExpiryWatcher();
  initBroadcastChannel();
};
