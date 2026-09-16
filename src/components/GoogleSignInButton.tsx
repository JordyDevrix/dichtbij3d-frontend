import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { colors, radius, spacing } from '../theme/theme';
import { Button } from './ui';

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
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number | string;
              locale?: string;
            },
          ) => void;
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
  const { t, locale } = useI18n();
  const { loginWithGoogle } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [clientId, setClientId] = useState<string | null>(() => resolvedClientId);
  const [loading, setLoading] = useState(false);
  const [buttonRendered, setButtonRendered] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleCredentialResponse = useCallback(
    async (credential: string) => {
      setLoading(true);
      try {
        const result = await loginWithGoogle(credential);
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

  const tryRenderGoogleButton = useCallback(
    (id: string, el: HTMLDivElement) => {
      if (!window.google?.accounts?.id) return;

      try {
        window.google.accounts.id.initialize({
          client_id: id,
          callback: (res) => {
            if (res?.credential) {
              void handleCredentialResponse(res.credential);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        const googleText =
          mode === 'signup' ? 'signup_with' : mode === 'signin' ? 'signin_with' : 'continue_with';

        // Clear existing children before rendering
        el.innerHTML = '';
        window.google.accounts.id.renderButton(el, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'rectangular',
          text: googleText,
          logo_alignment: 'left',
          width: 320,
          locale: locale || 'nl',
        });
        setButtonRendered(true);
      } catch (e) {
        // Render error or popup blocker
      }
    },
    [handleCredentialResponse, mode, locale],
  );

  // Initialize client ID and GSI SDK
  useEffect(() => {
    let active = true;

    fetchGoogleClientId().then((id) => {
      if (!active) return;
      if (id) {
        setClientId(id);
      }
    });

    if (Platform.OS === 'web') {
      loadGsiScript().then(() => {
        if (!active) return;
        if (resolvedClientId && containerRef.current) {
          tryRenderGoogleButton(resolvedClientId, containerRef.current);
        }
      });
    }

    return () => {
      active = false;
    };
  }, [tryRenderGoogleButton]);

  // If clientId or container updates, render Google button
  useEffect(() => {
    if (Platform.OS !== 'web' || !clientId || !containerRef.current) return;
    if (window.google?.accounts?.id) {
      tryRenderGoogleButton(clientId, containerRef.current);
    }
  }, [clientId, tryRenderGoogleButton]);

  const handleCustomButtonClick = async () => {
    if (loading) return;

    // If client ID is known and GSI is ready, prompt account chooser
    if (clientId && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
      return;
    }

    // Try fetching client ID on demand if not yet loaded
    setLoading(true);
    try {
      const id = await fetchGoogleClientId();
      if (id) {
        setClientId(id);
        if (window.google?.accounts?.id) {
          window.google.accounts.id.prompt();
          return;
        }
      } else {
        toast.error('Google Sign-In is niet geconfigureerd op de server (GOOGLE_OAUTH_CLIENT_ID ontbreekt).');
      }
    } catch {
      toast.error(t('auth.googleAuthFailed'));
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
    <View style={[styles.container, style]}>
      {Platform.OS === 'web' && (
        <div
          ref={(el) => {
            containerRef.current = el;
            if (el && clientId && window.google?.accounts?.id && !buttonRendered) {
              tryRenderGoogleButton(clientId, el);
            }
          }}
          style={{
            display: buttonRendered ? 'flex' : 'none',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            minHeight: 44,
          }}
        />
      )}

      {(!buttonRendered || Platform.OS !== 'web') && (
        <Button
          title={buttonTitle}
          icon="google"
          variant="outline"
          full
          loading={loading}
          onPress={handleCustomButtonClick}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
});
