import React, { useCallback, useEffect, useState } from 'react';
import { Platform, View, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { Button } from './ui';
import { GoogleIcon } from './GoogleIcon';

declare global {
  interface Window {
    __DICHTBIJ3D_GOOGLE_CLIENT_ID__?: string;
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (notification?: (notification: any) => void) => void;
        };
      };
    };
  }
}

let resolvedClientId: string | null = null;
let clientIdFetchPromise: Promise<string | null> | null = null;

export function fetchGoogleClientId(): Promise<string | null> {
  if (resolvedClientId) return Promise.resolve(resolvedClientId);
  if (clientIdFetchPromise) return clientIdFetchPromise;

  clientIdFetchPromise = (async () => {
    // 1. Check window runtime variable (injected by env.sh in docker)
    if (typeof window !== 'undefined') {
      const runtime = window.__DICHTBIJ3D_GOOGLE_CLIENT_ID__;
      if (typeof runtime === 'string' && runtime.trim().length > 0) {
        resolvedClientId = runtime.trim();
        return resolvedClientId;
      }
    }

    // 2. Check build-time environment variable
    const envId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
    if (envId && envId.trim().length > 0) {
      resolvedClientId = envId.trim();
      return resolvedClientId;
    }

    // 3. Fetch from backend /api/auth/config
    try {
      const config = await api.authConfig();
      if (config.googleEnabled && config.googleClientId && config.googleClientId.trim().length > 0) {
        resolvedClientId = config.googleClientId.trim();
        return resolvedClientId;
      }
    } catch {
      // Backend not yet reachable or config failed
    }

    // Reset promise so subsequent calls can retry
    clientIdFetchPromise = null;
    return null;
  })();

  return clientIdFetchPromise;
}

let gsiScriptPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return Promise.resolve();
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  if (gsiScriptPromise) {
    return gsiScriptPromise;
  }

  gsiScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')));
      if (window.google?.accounts?.id) resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });

  return gsiScriptPromise;
}

function openGoogleOAuthPopup(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window not available'));
      return;
    }

    const redirectUri = window.location.origin + '/auth/login';
    const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const state = Math.random().toString(36).substring(2);

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId,
    )}&response_type=id_token&scope=openid%20email%20profile&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&nonce=${nonce}&state=${state}&prompt=select_account`;

    const width = 500;
    const height = 620;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

    const popup = window.open(
      authUrl,
      'google_oauth_popup',
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`,
    );

    if (!popup) {
      reject(new Error('Popup geblokkeerd door browser. Sta popups toe voor deze site.'));
      return;
    }

    const timer = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(timer);
          reject(new Error('Inloggen met Google geannuleerd'));
          return;
        }

        const href = popup.location.href;
        if (href && href.startsWith(window.location.origin)) {
          const hash = popup.location.hash || '';
          const params = new URLSearchParams(hash.replace(/^#/, ''));
          const idToken = params.get('id_token');
          popup.close();
          clearInterval(timer);

          if (idToken) {
            resolve(idToken);
          } else {
            const errorParam = params.get('error') || new URLSearchParams(popup.location.search).get('error');
            reject(new Error(errorParam || 'Geen token ontvangen van Google'));
          }
        }
      } catch {
        // Cross-origin navigation inside popup is expected until redirected back
      }
    }, 250);
  });
}

export interface GoogleSignInButtonProps {
  mode?: 'signin' | 'signup' | 'continue';
  redirect?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  style?: ViewStyle;
}

export function GoogleSignInButton({
  mode = 'continue',
  redirect,
  onSuccess,
  onError,
  style,
}: GoogleSignInButtonProps) {
  const { t } = useI18n();
  const { loginWithGoogle } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetchGoogleClientId();
    if (Platform.OS === 'web') {
      void loadGsiScript();
    }
  }, []);

  const handleIdToken = useCallback(
    async (idToken: string) => {
      setLoading(true);
      try {
        const result = await loginWithGoogle(idToken);
        if (result.mfaRequired && result.mfaToken) {
          router.push({
            pathname: '/auth/mfa',
            params: {
              token: result.mfaToken,
              redirect: redirect ?? '',
              methods: result.mfaMethods?.join(',') ?? '',
              maskedEmail: result.maskedEmail ?? '',
            },
          });
          return;
        }
        if (result.ok) {
          if (onSuccess) {
            onSuccess();
          } else {
            router.replace((redirect as string) || '/');
          }
        }
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : t('auth.googleAuthFailed');
        onError?.(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [loginWithGoogle, router, redirect, onSuccess, onError, toast, t],
  );

  const handlePress = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const clientId = await fetchGoogleClientId();
      if (!clientId) {
        toast.error('Google Sign-In is niet geconfigureerd op de server (GOOGLE_OAUTH_CLIENT_ID ontbreekt).');
        setLoading(false);
        return;
      }

      // Initialize GIS if available
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (res) => {
              if (res?.credential) {
                void handleIdToken(res.credential);
              }
            },
            auto_select: false,
          });
        } catch {
          // ignore
        }
      }

      // Trigger OAuth Popup
      const idToken = await openGoogleOAuthPopup(clientId);
      if (idToken) {
        await handleIdToken(idToken);
      }
    } catch (err: any) {
      const msg = err?.message || t('auth.googleAuthFailed');
      if (msg !== 'Inloggen met Google geannuleerd' && msg !== 'Sign in cancelled') {
        onError?.(msg);
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const buttonTitle =
    mode === 'signup'
      ? t('auth.continueWithGoogle')
      : mode === 'signin'
      ? t('auth.loginWithGoogle')
      : t('auth.continueWithGoogle');

  return (
    <Button
      title={buttonTitle}
      iconElement={<GoogleIcon size={16} />}
      variant="outline"
      full
      loading={loading}
      onPress={handlePress}
      style={style}
    />
  );
}

export default GoogleSignInButton;
