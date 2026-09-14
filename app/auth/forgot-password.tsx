import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../../src/api';
import { Page } from '../../src/components/Page';
import { Body, Button, Card, H1, Input, Muted, Row } from '../../src/components/ui';
import { Logo } from '../../src/components/AppHeader';
import { Icon } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { colors, radius, spacing } from '../../src/theme/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useI18n();

  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setError(null);
    setBusy(true);
    try {
      await api.forgotPassword(trimmed);
      setSubmittedEmail(trimmed);
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

      {submittedEmail ? (
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
              <Icon name="envelope" size={28} color={colors.orange} />
            </View>
            <H1 style={{ textAlign: 'center' }}>{t('auth.forgotPasswordSuccessTitle')}</H1>
            <Muted style={{ textAlign: 'center', lineHeight: 22 }}>
              {t('auth.forgotPasswordSuccessBody', { email: submittedEmail })}
            </Muted>
          </View>

          <Button
            title={t('auth.backToLogin')}
            icon="back"
            full
            onPress={() => router.replace('/auth/login')}
          />
        </Card>
      ) : (
        <Card style={{ gap: spacing.lg }}>
          <View style={{ gap: 6 }}>
            <H1>{t('auth.forgotPasswordTitle')}</H1>
            <Muted>{t('auth.forgotPasswordSubtitle')}</Muted>
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
            onSubmitEditing={submit}
            autoFocus
          />

          {error && <Body style={{ color: colors.danger }}>{error}</Body>}

          <Button
            title={t('auth.sendResetLink')}
            icon="send"
            full
            loading={busy}
            disabled={!email.trim()}
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
