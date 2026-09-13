import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, ApiError } from '../../src/api';
import { Page } from '../../src/components/Page';
import { Body, Button, Card, Divider, H1, Input, Muted, Row } from '../../src/components/ui';
import { Logo } from '../../src/components/AppHeader';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { useI18n } from '../../src/i18n';
import { colors, spacing } from '../../src/theme/theme';
import { createPasskeyLogin } from '../../src/utils/authHelpers';

export default function LoginScreen() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const { t } = useI18n();
  const { login, busy, loginWithAuthResponse } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [passkeyBusy, setPasskeyBusy] = useState(false);

  const done = () => router.replace((redirect as string) || '/');

  const submit = async () => {
    setError(null);
    try {
      const result = await login(email.trim(), password);
      if (result.mfaRequired && result.mfaToken) {
        router.push({ pathname: '/auth/mfa', params: { token: result.mfaToken, redirect: redirect ?? '' } });
        return;
      }
      if (result.ok) done();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('errors.generic'));
    }
  };

  const passkeyLogin = async () => {
    setPasskeyBusy(true);
    setError(null);
    try {
      const auth = await createPasskeyLogin();
      await loginWithAuthResponse(auth);
      done();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.passkeyUnsupported'));
    } finally {
      setPasskeyBusy(false);
    }
  };

  return (
    <Page maxWidth={520} contentStyle={{ paddingTop: spacing.xxl }}>
      <View style={{ alignItems: 'center', marginBottom: spacing.sm }}>
        <Logo />
      </View>
      <Card style={{ gap: spacing.lg }}>
        <View style={{ gap: 4 }}>
          <H1>{t('auth.loginTitle')}</H1>
          <Muted>{t('auth.loginSubtitle')}</Muted>
        </View>

        <Input
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          icon="envelope"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="sanne@dichtbij3d.nl"
        />
        <Input
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          icon="lock"
          password
          autoComplete="current-password"
          onSubmitEditing={submit}
        />

        {error && <Body style={{ color: colors.danger }}>{error}</Body>}

        <Button title={t('auth.login')} icon="key" full loading={busy} onPress={submit} />

        <Row gap={spacing.md}>
          <Divider style={{ flex: 1 }} />
          <Muted>{t('common.or')}</Muted>
          <Divider style={{ flex: 1 }} />
        </Row>

        <Button
          title={t('auth.loginWithPasskey')}
          icon="fingerprint"
          variant="outline"
          full
          loading={passkeyBusy}
          onPress={passkeyLogin}
        />

        <Row style={{ justifyContent: 'center' }} gap={6}>
          <Muted>{t('auth.noAccount')}</Muted>
          <Button
            title={t('auth.register')}
            variant="ghost"
            size="sm"
            onPress={() => router.replace({ pathname: '/auth/register', params: { redirect: redirect ?? '' } })}
          />
        </Row>
      </Card>

      <Card style={{ backgroundColor: colors.orangeSofter, borderColor: colors.orangeBorder }}>
        <Muted>
          Demo: sanne@dichtbij3d.nl / Demo12345! · bram@dichtbij3d.nl / Demo12345! · admin@dichtbij3d.nl / Admin123!
        </Muted>
      </Card>
    </Page>
  );
}
