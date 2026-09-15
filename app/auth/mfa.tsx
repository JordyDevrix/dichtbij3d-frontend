import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, ApiError } from '../../src/api';
import { Page } from '../../src/components/Page';
import { Body, Button, Card, H1, Input, Muted } from '../../src/components/ui';
import { Logo } from '../../src/components/AppHeader';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { useI18n } from '../../src/i18n';
import { colors, spacing } from '../../src/theme/theme';

export default function MfaScreen() {
  const router = useRouter();
  const { token, redirect, methods } = useLocalSearchParams<{ token?: string; redirect?: string; methods?: string }>();
  const { t } = useI18n();
  const { verifyMfa, busy } = useAuth();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const methodList = (methods || '').split(',').filter(Boolean);
  const hasEmail = methodList.includes('email');
  const hasTotp = methodList.includes('totp');

  const subtitle =
    hasEmail && hasTotp
      ? t('auth.mfaDualSubtitle')
      : hasEmail
      ? t('auth.mfaEmailSubtitle')
      : t('auth.mfaSubtitle');

  const submit = async () => {
    setError(null);
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    try {
      const ok = await verifyMfa(token as string, code.trim());
      if (ok) router.replace((redirect as string) || '/');
      else setError(t('errors.generic'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('errors.generic'));
    }
  };

  const resendCode = async () => {
    if (!token) return;
    setResending(true);
    try {
      await api.emailMfaSend(token as string);
      toast.success(t('security.emailCodeResent'));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setResending(false);
    }
  };

  return (
    <Page maxWidth={460} contentStyle={{ paddingTop: spacing.xxl }}>
      <View style={{ alignItems: 'center', marginBottom: spacing.sm }}>
        <Logo />
      </View>
      <Card style={{ gap: spacing.lg }}>
        <View style={{ gap: 4 }}>
          <H1>{t('auth.mfaTitle')}</H1>
          <Muted>{subtitle}</Muted>
        </View>
        <Input
          label={t('auth.mfaCode')}
          value={code}
          onChangeText={setCode}
          icon="shield"
          keyboardType="number-pad"
          maxLength={8}
          onSubmitEditing={submit}
          style={{ letterSpacing: 6, fontSize: 20, fontWeight: '700' }}
        />
        {error && <Body style={{ color: colors.danger }}>{error}</Body>}
        <Button title={t('auth.verify')} icon="check" full loading={busy} onPress={submit} />
        {hasEmail && (
          <Button
            title={t('security.resendEmailCode')}
            icon="envelope"
            variant="outline"
            full
            loading={resending}
            onPress={resendCode}
          />
        )}
        <Button title={t('common.back')} variant="ghost" full onPress={() => router.replace('/auth/login')} />
      </Card>
    </Page>
  );
}
