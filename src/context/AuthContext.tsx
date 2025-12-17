/**
 * AuthContext - Global authentication state management
 *
 * Features:
 * - Persistent authentication state (localStorage)
 * - Auto token refresh on app start
 * - Cross-tab synchronization
 * - Logout with cleanup
 * - Bootstrap loading state
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  clearAllAuth,
  getStoredUser,
  initAuthWatchers,
  setAccessToken,
  setStoredUser,
  touchRefreshWatcher,
} from '@/lib/auth';
import type { StoredUser } from '@/lib/auth';
import { logoutUser, rotateTokens } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Authentication context value shape
 */
interface AuthContextValue {
  /** Currently authenticated user (null if not logged in) */
  user: StoredUser | null;
  /** Whether initial auth check is complete */
  bootstrapped: boolean;
  /** Updates the current user */
  setUser: (user: StoredUser | null) => void;
  /** Logs out the user and clears all data */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Authentication provider component
 * Manages auth state, token refresh, and cross-tab sync
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  // User state initialized from localStorage
  const [user, setUserState] = useState<StoredUser | null>(() =>
    getStoredUser()
  );
  // Bootstrap state tracks initial auth check completion
  const [bootstrapped, setBootstrapped] = useState(false);

  /**
   * Syncs user state from localStorage
   * Used for cross-tab synchronization
   */
  const syncUserFromStorage = useCallback(() => {
    setUserState(getStoredUser());
  }, []);

  /**
   * Initialize auth watchers and attempt token refresh on mount
   * Also sets up cross-tab storage event listeners
   */
  useEffect(() => {
    let mounted = true;
    initAuthWatchers();

    /**
     * Attempts to refresh access token using stored refresh token
     * Runs on app startup to restore session
     */
    const attemptRefresh = async () => {
      const storedRefresh = localStorage.getItem('refreshToken');
      if (!storedRefresh) {
        setBootstrapped(true);
        return;
      }
      try {
        const data = await rotateTokens(storedRefresh);
        setAccessToken(data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        touchRefreshWatcher();
      } catch {
        clearAllAuth();
        setUserState(null);
      } finally {
        if (mounted) setBootstrapped(true);
      }
    };

    attemptRefresh();

    /**
     * Handles storage events from other tabs
     * Syncs auth state across browser tabs
     */
    const handleStorage = (event: StorageEvent) => {
      if (!event.key) return;
      if (event.key === 'user') {
        syncUserFromStorage();
      }
      if (event.key === 'refreshToken') {
        touchRefreshWatcher();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      mounted = false;
      window.removeEventListener('storage', handleStorage);
    };
  }, [syncUserFromStorage]);

  /**
   * Updates user state in memory and localStorage
   * Triggers cross-tab sync via storage events
   */
  const setUser = useCallback((nextUser: StoredUser | null) => {
    setUserState(nextUser);
    setStoredUser(nextUser);
  }, []);

  /**
   * Logs out the user
   * - Calls logout API endpoint
   * - Clears all auth data (tokens, user)
   * - Clears React Query cache
   * - Handles API errors gracefully (always logs out locally)
   */
  const logout = useCallback(async () => {
    try {
      if (user) {
        await logoutUser(user._id);
      }
    } catch {
      // Ignore API errors during logout to avoid trapping user
    } finally {
      clearAllAuth();
      setUserState(null);
      setStoredUser(null);
      queryClient.clear();
    }
  }, [queryClient, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      bootstrapped,
      setUser,
      logout,
    }),
    [user, bootstrapped, setUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to access authentication context
 * @throws Error if used outside AuthProvider
 * @returns Authentication context value
 */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
