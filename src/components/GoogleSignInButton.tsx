import React, { useEffect, useRef, useState } from 'react';
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

// Global cached client ID promise so we only fetch /api/auth/config once
let cachedClientIdPromise: Promise<string | null> | null = null;

export function fetchGoogleClientId(): Promise<string | null> {
  if (cachedClientIdPromise) return cachedClientIdPromise;

  cachedClientIdPromise = (async () => {
    const envId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
    if (envId && envId.trim().length > 0) return envId.trim();

    try {
      const config = await api.authConfig();
      if (config.googleEnabled && config.googleClientId) {
        return config.googleClientId;
      }
    } catch {
      // Backend not reachable or config unavailable
    }
    return null;
  })();

  return cachedClientIdPromise;
}

let gsiScriptLoadingPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return Promise.resolve();
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  if (gsiScriptLoadingPromise) {
    return gsiScriptLoadingPromise;
  }

  gsiScriptLoadingPromise = new Promise<void>((resolve, reject) => {
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

  return gsiScriptLoadingPromise;
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

  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isGsiReady, setIsGsiReady] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    let active = true;
    fetchGoogleClientId().then((id) => {
      if (active) setClientId(id);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !clientId) return;

    let active = true;
    loadGsiScript()
      .then(() => {
        if (active) setIsGsiReady(true);
      })
      .catch(() => {
        // GSI failed to load (e.g. adblocker or network error)
      });

    return () => {
      active = false;
    };
  }, [clientId]);

  const handleCredentialResponse = async (credential: string) => {
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
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || !isGsiReady || !clientId || !containerRef.current) {
      return;
    }

    try {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: (res) => {
          if (res?.credential) {
            void handleCredentialResponse(res.credential);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      initializedRef.current = true;

      // Render official Google button
      const googleText = mode === 'signup' ? 'signup_with' : mode === 'signin' ? 'signin_with' : 'continue_with';
      window.google?.accounts.id.renderButton(containerRef.current, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        shape: 'rectangular',
        text: googleText,
        logo_alignment: 'left',
        width: 320,
        locale: locale || 'nl',
      });
    } catch {
      // ignore
    }
  }, [isGsiReady, clientId, mode, locale]);

  if (!clientId) {
    return null;
  }

  const buttonText =
    mode === 'signup'
      ? t('auth.continueWithGoogle')
      : mode === 'signin'
      ? t('auth.loginWithGoogle')
      : t('auth.continueWithGoogle');

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.wrapper, style]}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={colors.orange} />
          </View>
        )}
        <div
          ref={(el) => {
            containerRef.current = el;
          }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            minHeight: 44,
          }}
        />
      </View>
    );
  }

  // Fallback for native/other environments
  return (
    <Button
      title={buttonText}
      icon="google"
      variant="outline"
      full
      loading={loading}
      style={style}
      onPress={() => {
        if (window?.google?.accounts?.id) {
          window.google.accounts.id.prompt();
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 44,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderRadius: radius.md,
  },
});
