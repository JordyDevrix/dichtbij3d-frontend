import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ApiError } from '../../src/api';
import { Page } from '../../src/components/Page';
import { Body, Button, Card, Divider, H1, H3, Input, Muted } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { Logo } from '../../src/components/AppHeader';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { useI18n } from '../../src/i18n';
import { colors, radius, shadow, spacing } from '../../src/theme/theme';

type MfaStep = 'select' | 'totp' | 'email';

export default function MfaScreen() {
  const router = useRouter();
  const { token, redirect, methods, maskedEmail } = useLocalSearchParams<{
    token?: string;
    redirect?: string;
    methods?: string;
    maskedEmail?: string;
  }>();
  const { t } = useI18n();
  const { verifyMfa, sendMfaEmail, busy } = useAuth();
  const toast = useToast();

  const methodList = (methods || '').toLowerCase().split(',').filter(Boolean);
  const hasEmail = methodList.length === 0 || methodList.includes('email');
  const hasTotp = methodList.length === 0 || methodList.includes('totp');
  const canChooseOther = hasEmail && hasTotp;

  // If only TOTP is configured, go directly to TOTP code entry.
  // Otherwise start on 'select' so the user chooses their method and email is only sent when requested.
  const [step, setStep] = useState<MfaStep>(() => {
    if (hasTotp && !hasEmail) return 'totp';
    return 'select';
  });

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Countdown timer for email resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const selectTotp = () => {
    setError(null);
    setCode('');
    setStep('totp');
  };

  const selectEmail = async () => {
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    setError(null);
    setCode('');
    setSendingEmail(true);
    try {
      await sendMfaEmail(token);
      toast.success(t('auth.mfaEmailSent'));
      setCooldown(30);
      setStep('email');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setSendingEmail(false);
    }
  };

  const resendEmail = async () => {
    if (!token || cooldown > 0 || sendingEmail) return;
    setError(null);
    setSendingEmail(true);
    try {
      await sendMfaEmail(token);
      toast.success(t('auth.mfaEmailSent'));
      setCooldown(30);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setSendingEmail(false);
    }
  };

  const submit = async () => {
    setError(null);
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    const cleanCode = code.trim();
    if (cleanCode.length < 6) {
      setError(t('errors.generic'));
      return;
    }
    try {
      const method = step === 'email' ? 'EMAIL' : 'TOTP';
      const ok = await verifyMfa(token, cleanCode, method);
      if (ok) {
        router.replace((redirect as string) || '/');
      } else {
        setError(t('errors.generic'));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('errors.generic'));
    }
  };

  return (
    <Page maxWidth={480} contentStyle={{ paddingTop: spacing.xxl }}>
      <View style={{ alignItems: 'center', marginBottom: spacing.sm }}>
        <Logo />
      </View>

      {/* ------------------------------------------------ STEP 1: Select 2FA method */}
      {step === 'select' && (
        <Card style={{ gap: spacing.lg }}>
          <View style={{ gap: 4 }}>
            <H1>{t('auth.mfaSelectTitle')}</H1>
            <Muted>{t('auth.mfaSelectSubtitle')}</Muted>
          </View>

          {error && <Body style={{ color: colors.danger }}>{error}</Body>}

          <View style={{ gap: spacing.md }}>
            {/* Option A: Authenticator app (TOTP) */}
            {hasTotp && (
              <Pressable
                onPress={selectTotp}
                accessibilityRole="button"
                accessibilityLabel={t('auth.mfaMethodTotpTitle')}
                style={({ hovered }: any) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: spacing.lg,
                    borderRadius: radius.lg,
                    borderWidth: 1.5,
                    borderColor: hovered ? colors.orange : colors.border,
                    backgroundColor: hovered ? colors.orangeSofter : colors.surface,
                    gap: spacing.md,
                    cursor: 'pointer' as any,
                    ...shadow.card,
                  },
                ]}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.md,
                    backgroundColor: colors.orangeSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="shield" size={20} color={colors.orange} />
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <H3>{t('auth.mfaMethodTotpTitle')}</H3>
                  <Muted style={{ fontSize: 13 }}>{t('auth.mfaMethodTotpDesc')}</Muted>
                </View>

                <Icon name="chevronRight" size={14} color={colors.textMuted} />
              </Pressable>
            )}

            {/* Option B: Email verification code */}
            {hasEmail && (
              <Pressable
                onPress={selectEmail}
                disabled={sendingEmail}
                accessibilityRole="button"
                accessibilityLabel={t('auth.mfaMethodEmailTitle')}
                style={({ hovered }: any) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: spacing.lg,
                    borderRadius: radius.lg,
                    borderWidth: 1.5,
                    borderColor: hovered ? colors.orange : colors.border,
                    backgroundColor: hovered ? colors.orangeSofter : colors.surface,
                    gap: spacing.md,
                    opacity: sendingEmail ? 0.7 : 1,
                    cursor: (sendingEmail ? 'default' : 'pointer') as any,
                    ...shadow.card,
                  },
                ]}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.md,
                    backgroundColor: colors.surfaceAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="envelope" size={18} color={colors.orange} />
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <H3>{t('auth.mfaMethodEmailTitle')}</H3>
                  <Muted style={{ fontSize: 13 }}>
                    {t('auth.mfaMethodEmailDesc', { email: maskedEmail || t('auth.email') })}
                  </Muted>
                </View>

                <Icon name="chevronRight" size={14} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          <Divider />

          <Button
            title={t('common.back')}
            variant="ghost"
            full
            onPress={() => router.replace('/auth/login')}
          />
        </Card>
      )}

      {/* ------------------------------------------------ STEP 2A: TOTP Flow */}
      {step === 'totp' && (
        <Card style={{ gap: spacing.lg }}>
          <View style={{ gap: 4 }}>
            <H1>{t('auth.mfaTotpTitle')}</H1>
            <Muted>{t('auth.mfaTotpSubtitle')}</Muted>
          </View>

          <Input
            label={t('auth.mfaCode')}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 8))}
            icon="shield"
            keyboardType="number-pad"
            maxLength={8}
            placeholder="000 000"
            onSubmitEditing={submit}
            style={{ letterSpacing: 8, fontSize: 24, fontWeight: '700', textAlign: 'center' }}
          />

          {error && <Body style={{ color: colors.danger }}>{error}</Body>}

          <Button
            title={t('auth.verify')}
            icon="check"
            full
            loading={busy}
            onPress={submit}
          />

          {canChooseOther && (
            <Button
              title={t('auth.mfaChooseOtherMethod')}
              icon="refresh"
              variant="outline"
              full
              onPress={() => {
                setStep('select');
                setCode('');
                setError(null);
              }}
            />
          )}

          <Button
            title={t('common.back')}
            variant="ghost"
            full
            onPress={() => router.replace('/auth/login')}
          />
        </Card>
      )}

      {/* ------------------------------------------------ STEP 2B: Email Flow */}
      {step === 'email' && (
        <Card style={{ gap: spacing.lg }}>
          <View style={{ gap: 4 }}>
            <H1>{t('auth.mfaEmailTitle')}</H1>
            <Muted>{t('auth.mfaEmailSubtitle', { email: maskedEmail || t('auth.email') })}</Muted>
          </View>

          <Input
            label={t('auth.mfaCode')}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 8))}
            icon="envelope"
            keyboardType="number-pad"
            maxLength={8}
            placeholder="000 000"
            onSubmitEditing={submit}
            style={{ letterSpacing: 8, fontSize: 24, fontWeight: '700', textAlign: 'center' }}
          />

          {error && <Body style={{ color: colors.danger }}>{error}</Body>}

          <Button
            title={t('auth.verify')}
            icon="check"
            full
            loading={busy}
            onPress={submit}
          />

          {/* Resend email code action */}
          <View style={{ alignItems: 'center' }}>
            {cooldown > 0 ? (
              <Muted style={{ fontSize: 13 }}>
                {t('auth.mfaResendCooldown', { seconds: cooldown })}
              </Muted>
            ) : (
              <Button
                title={t('auth.mfaResendCode')}
                variant="ghost"
                size="sm"
                icon="refresh"
                loading={sendingEmail}
                onPress={resendEmail}
              />
            )}
          </View>

          {canChooseOther && (
            <Button
              title={t('auth.mfaChooseOtherMethod')}
              icon="refresh"
              variant="outline"
              full
              onPress={() => {
                setStep('select');
                setCode('');
                setError(null);
              }}
            />
          )}

          <Button
            title={t('common.back')}
            variant="ghost"
            full
            onPress={() => router.replace('/auth/login')}
          />
        </Card>
      )}
    </Page>
  );
}
