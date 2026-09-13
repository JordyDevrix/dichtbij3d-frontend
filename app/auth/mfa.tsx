import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ApiError } from '../../src/api';
import { Page } from '../../src/components/Page';
import { Body, Button, Card, H1, Input, Muted } from '../../src/components/ui';
import { Logo } from '../../src/components/AppHeader';
import { useAuth } from '../../src/context/AuthContext';
import { useI18n } from '../../src/i18n';
import { colors, spacing } from '../../src/theme/theme';

export default function MfaScreen() {
  const router = useRouter();
  const { token, redirect } = useLocalSearchParams<{ token?: string; redirect?: string }>();
  const { t } = useI18n();
  const { verifyMfa, busy } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  return (
    <Page maxWidth={460} contentStyle={{ paddingTop: spacing.xxl }}>
      <View style={{ alignItems: 'center', marginBottom: spacing.sm }}>
        <Logo />
      </View>
      <Card style={{ gap: spacing.lg }}>
        <View style={{ gap: 4 }}>
          <H1>{t('auth.mfaTitle')}</H1>
          <Muted>{t('auth.mfaSubtitle')}</Muted>
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
        <Button title={t('common.back')} variant="ghost" full onPress={() => router.replace('/auth/login')} />
      </Card>
    </Page>
  );
}
