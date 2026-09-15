import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { api } from '../api';
import { clearTokens, currentRefreshToken, loadTokens, onUnauthorized, saveTokens } from '../api/client';
import type { AuthResponse, Role, UserProfile } from '../api/types';
import { useI18n } from '../i18n';

interface LoginResult {
  ok: boolean;
  mfaRequired?: boolean;
  mfaToken?: string | null;
  mfaMethods?: ('totp' | 'email' | 'TOTP' | 'EMAIL')[] | null;
  maskedEmail?: string | null;
}

interface AuthValue {
  user: UserProfile | null;
  booting: boolean;
  busy: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasRole: (role: Role) => boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyMfa: (mfaToken: string, code: string, method?: 'TOTP' | 'EMAIL' | 'totp' | 'email') => Promise<boolean>;
  sendMfaEmail: (mfaToken: string) => Promise<boolean>;
  register: (input: { email: string; password: string; displayName: string; roles: Role[] }) => Promise<LoginResult>;
  loginWithAuthResponse: (auth: AuthResponse) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Returns true when signed in; otherwise sends the visitor to the sign-up gate. */
  requireAuth: (redirectTo?: string) => boolean;
  /** Unread notifications. */
  unreadCount: number;
  /** Unread private messages. */
  unreadMessages: number;
  refreshUnread: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({} as AuthValue);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const router = useRouter();
  const { locale, setLocale } = useI18n();
  const localeRef = useRef(locale);
  localeRef.current = locale;

  const applyProfile = useCallback(
    (profile: UserProfile | null) => {
      setUser(profile);
      if (profile?.locale && profile.locale !== localeRef.current) {
        setLocale(profile.locale as any);
      }
    },
    [setLocale],
  );

  const refreshUnread = useCallback(async () => {
    const [notifications, messages] = await Promise.allSettled([api.unreadCount(), api.unreadMessageCount()]);
    setUnreadCount(notifications.status === 'fulfilled' ? notifications.value?.count ?? 0 : 0);
    setUnreadMessages(messages.status === 'fulfilled' ? messages.value?.count ?? 0 : 0);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await api.me();
      applyProfile(profile);
      await refreshUnread();
    } catch {
      applyProfile(null);
    }
  }, [applyProfile, refreshUnread]);

  useEffect(() => {
    onUnauthorized(() => {
      setUser(null);
      setUnreadCount(0);
      setUnreadMessages(0);
    });
    (async () => {
      const { accessToken } = await loadTokens();
      if (accessToken) await refreshProfile();
      setBooting(false);
    })();
    return () => onUnauthorized(null);
  }, [refreshProfile]);

  // Poll while signed in so the notification and message badges stay fresh.
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => void refreshUnread(), 25000);
    return () => clearInterval(id);
  }, [user, refreshUnread]);

  const handleAuthResponse = useCallback(
    async (auth: AuthResponse): Promise<LoginResult> => {
      if (auth.mfaRequired) {
        return {
          ok: false,
          mfaRequired: true,
          mfaToken: auth.mfaToken,
          mfaMethods: auth.mfaMethods,
          maskedEmail: auth.maskedEmail,
        };
      }
      await saveTokens(auth);
      if (auth.user) {
        applyProfile(auth.user);
        await refreshUnread();
      } else {
        await refreshProfile();
      }
      return { ok: true };
    },
    [applyProfile, refreshProfile, refreshUnread],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      setBusy(true);
      try {
        return await handleAuthResponse(await api.login({ email, password }));
      } finally {
        setBusy(false);
      }
    },
    [handleAuthResponse],
  );

  const verifyMfa = useCallback(
    async (mfaToken: string, code: string, method?: 'TOTP' | 'EMAIL' | 'totp' | 'email') => {
      setBusy(true);
      try {
        const result = await handleAuthResponse(await api.verifyMfa({ mfaToken, code, method }));
        return result.ok;
      } finally {
        setBusy(false);
      }
    },
    [handleAuthResponse],
  );

  const sendMfaEmail = useCallback(
    async (mfaToken: string) => {
      setBusy(true);
      try {
        await api.sendMfaEmail({ mfaToken });
        return true;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const register = useCallback(
    async (input: { email: string; password: string; displayName: string; roles: Role[] }) => {
      setBusy(true);
      try {
        return await handleAuthResponse(await api.register({ ...input, locale: localeRef.current }));
      } finally {
        setBusy(false);
      }
    },
    [handleAuthResponse],
  );

  const loginWithAuthResponse = useCallback(
    async (auth: AuthResponse) => {
      await handleAuthResponse(auth);
    },
    [handleAuthResponse],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout(currentRefreshToken());
    } catch {
      /* the session is going away regardless */
    }
    await clearTokens();
    setUser(null);
    setUnreadCount(0);
    setUnreadMessages(0);
    router.replace('/');
  }, [router]);

  const requireAuth = useCallback(
    (redirectTo?: string) => {
      if (user) return true;
      router.push({ pathname: '/auth/login', params: redirectTo ? { redirect: redirectTo } : {} });
      return false;
    },
    [router, user],
  );

  const value = useMemo<AuthValue>(
    () => ({
      user,
      booting,
      busy,
      isAuthenticated: !!user,
      isAdmin: !!user?.roles?.includes('ADMIN'),
      hasRole: (role: Role) => !!user?.roles?.includes(role),
      login,
      verifyMfa,
      sendMfaEmail,
      register,
      loginWithAuthResponse,
      logout,
      refreshProfile,
      requireAuth,
      unreadCount,
      unreadMessages,
      refreshUnread,
    }),
    [
      user,
      booting,
      busy,
      login,
      verifyMfa,
      sendMfaEmail,
      register,
      loginWithAuthResponse,
      logout,
      refreshProfile,
      requireAuth,
      unreadCount,
      unreadMessages,
      refreshUnread,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
