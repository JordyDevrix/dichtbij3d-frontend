import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, ApiError } from '../../src/api';
import { Page } from '../../src/components/Page';
import { Body, Button, Card, H1, Input, Muted } from '../../src/components/ui';
import { Logo } from '../../src/components/AppHeader';
import { Icon } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { colors, spacing } from '../../src/theme/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { t } = useI18n();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanToken = typeof token === 'string' ? token.trim() : '';

  const submit = async () => {
    setError(null);

    if (!cleanToken) {
      setError(t('auth.invalidResetToken'));
      return;
    }

    if (password.length < 10) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setBusy(true);
    try {
      await api.resetPassword(cleanToken, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.somethingWentWrong'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page maxWidth={500} contentStyle={{ paddingTop: spacing.xxl, paddingBottom: spacing.xxl }}>
      <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
        <Logo />
      </View>

      {!cleanToken ? (
        <Card style={{ gap: spacing.lg }}>
          <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: colors.dangerSoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.xs,
              }}
            >
              <Icon name="error" size={28} color={colors.danger} />
            </View>
            <H1 style={{ textAlign: 'center' }}>{t('auth.invalidResetToken')}</H1>
          </View>

          <Button
            title={t('auth.requestNewLink')}
            icon="refresh"
            full
            onPress={() => router.replace('/auth/forgot-password')}
          />
          <Button
            title={t('auth.backToLogin')}
            variant="ghost"
            icon="back"
            full
            onPress={() => router.replace('/auth/login')}
          />
        </Card>
      ) : success ? (
        <Card style={{ gap: spacing.lg }}>
          <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: colors.orangeSoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.xs,
              }}
            >
              <Icon name="checkCircle" size={28} color={colors.orange} />
            </View>
            <H1 style={{ textAlign: 'center' }}>{t('auth.resetPasswordSuccess')}</H1>
          </View>

          <Button
            title={t('auth.login')}
            icon="key"
            full
            onPress={() => router.replace('/auth/login')}
          />
        </Card>
      ) : (
        <Card style={{ gap: spacing.lg }}>
          <View style={{ gap: 6 }}>
            <H1>{t('auth.resetPasswordTitle')}</H1>
            <Muted>{t('auth.resetPasswordSubtitle')}</Muted>
          </View>

          <Input
            label={t('auth.newPassword')}
            value={password}
            onChangeText={setPassword}
            icon="lock"
            password
            hint={t('auth.passwordHint')}
            autoComplete="new-password"
            autoFocus
          />

          <Input
            label={t('auth.confirmPassword')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            icon="lock"
            password
            autoComplete="new-password"
            onSubmitEditing={submit}
          />

          {error && <Body style={{ color: colors.danger }}>{error}</Body>}

          <Button
            title={t('auth.resetPasswordButton')}
            icon="check"
            full
            loading={busy}
            disabled={!password || !confirmPassword}
            onPress={submit}
          />

          <Button
            title={t('auth.backToLogin')}
            variant="ghost"
            icon="back"
            full
            onPress={() => router.replace('/auth/login')}
          />
        </Card>
      )}
    </Page>
  );
}
