import React, { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../../src/api';
import type { Passkey, TotpSetupResponse } from '../../src/api/types';
import { Icon } from '../../src/components/Icon';
import { Page } from '../../src/components/Page';
import {
  Badge,
  Body,
  Button,
  Card,
  Divider,
  EmptyState,
  H1,
  H2,
  H3,
  Input,
  Muted,
  Row,
  Spinner,
} from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { useI18n } from '../../src/i18n';
import { colors, radius, spacing } from '../../src/theme/theme';
import { formatDate } from '../../src/utils/format';
import { passkeysSupported, registerPasskey } from '../../src/utils/authHelpers';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';

export default function SecurityScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { user, booting, refreshProfile, logout } = useAuth();
  const { isWide } = useBreakpoint();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const [setup, setSetup] = useState<TotpSetupResponse | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [disableCode, setDisableCode] = useState('');

  const [emailSetupStep, setEmailSetupStep] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [emailDisableStep, setEmailDisableStep] = useState(false);
  const [emailDisableCode, setEmailDisableCode] = useState('');

  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [passkeyLabel, setPasskeyLabel] = useState('');
  const [loadingPasskeys, setLoadingPasskeys] = useState(true);

  const loadPasskeys = useCallback(async () => {
    if (!user) return;
    setLoadingPasskeys(true);
    try {
      setPasskeys(await api.passkeys());
    } catch {
      setPasskeys([]);
    } finally {
      setLoadingPasskeys(false);
    }
  }, [user]);

  useEffect(() => {
    void loadPasskeys();
  }, [loadPasskeys]);

  if (booting) return null;

  if (!user)
    return (
      <Page maxWidth={600}>
        <Card>
          <EmptyState
            icon="shield"
            title={t('common.signInRequired')}
            body={t('common.signInRequiredBody')}
            action={
              <Button
                title={t('nav.login')}
                onPress={() => router.push({ pathname: '/auth/login', params: { redirect: '/settings/security' } })}
              />
            }
          />
        </Card>
      </Page>
    );

  const wrap = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : (error as Error)?.message || t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const changePassword = () =>
    wrap(async () => {
      if (newPassword.length < 10) {
        toast.error(t('auth.passwordTooShort'));
        return;
      }
      if (newPassword !== repeatPassword) {
        toast.error(t('auth.passwordMismatch'));
        return;
      }
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setRepeatPassword('');
      toast.success(t('security.passwordChanged'));
    });

  return (
    <Page maxWidth={840}>
      <View style={{ gap: 4 }}>
        <Row gap={spacing.sm}>
          <Icon name="shield" size={20} color={colors.orange} />
          <H1>{t('security.title')}</H1>
        </Row>
        <Muted>{t('security.subtitle')}</Muted>
      </View>

      <Card style={{ gap: spacing.md }}>
        <H2>{t('security.password')}</H2>
        <Input
          label={t('security.currentPassword')}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          icon="lock"
        />
        <View style={{ flexDirection: isWide ? 'row' : 'column', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input
              label={t('security.newPassword')}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              icon="key"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label={t('security.repeatPassword')}
              value={repeatPassword}
              onChangeText={setRepeatPassword}
              secureTextEntry
              icon="key"
            />
          </View>
        </View>
        <View style={{ alignItems: isWide ? 'flex-end' : 'stretch' }}>
          <Button title={t('security.changePassword')} icon="check" loading={busy} onPress={changePassword} />
        </View>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm }}>
          <H2>{t('security.totp')}</H2>
          <Badge
            label={user.totpEnabled ? t('security.enabled') : t('security.disabled')}
            tone={
              user.totpEnabled
                ? { bg: colors.successSoft, fg: colors.success }
                : { bg: colors.surface, fg: colors.textMuted }
            }
          />
        </Row>
        <Muted>{t('security.totpHelp')}</Muted>

        {user.totpEnabled ? (
          <View style={{ flexDirection: isWide ? 'row' : 'column', gap: spacing.md, alignItems: isWide ? 'flex-end' : 'stretch' }}>
            <View style={{ flex: 1 }}>
              <Input
                label={t('security.codeFromApp')}
                value={disableCode}
                onChangeText={setDisableCode}
                keyboardType="number-pad"
                maxLength={6}
                icon="shield"
              />
            </View>
            <Button
              title={t('security.disableTotp')}
              icon="ban"
              variant="danger"
              loading={busy}
              onPress={() =>
                wrap(async () => {
                  await api.totpDisable(disableCode.trim());
                  setDisableCode('');
                  await refreshProfile();
                  toast.success(t('security.totpDisabled'));
                })
              }
            />
          </View>
        ) : setup ? (
          <View style={{ gap: spacing.md }}>
            <View
              style={{
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.md,
                padding: spacing.md,
                borderWidth: 1,
                borderColor: colors.border,
                gap: 6,
              }}
            >
              <Muted>{t('security.secret')}</Muted>
              <Body style={{ fontFamily: Platform.OS === 'web' ? 'monospace' : undefined, letterSpacing: 1 }}>
                {setup.secret}
              </Body>
              <Muted>{t('security.otpauth')}</Muted>
              <Body style={{ fontSize: 12, color: colors.textMuted }} numberOfLines={2}>
                {setup.otpauthUri}
              </Body>
            </View>
            <View style={{ flexDirection: isWide ? 'row' : 'column', gap: spacing.md, alignItems: isWide ? 'flex-end' : 'stretch' }}>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('security.codeFromApp')}
                  value={totpCode}
                  onChangeText={setTotpCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  icon="shield"
                />
              </View>
              <Button
                title={t('security.enableTotp')}
                icon="check"
                loading={busy}
                onPress={() =>
                  wrap(async () => {
                    await api.totpEnable(totpCode.trim());
                    setTotpCode('');
                    setSetup(null);
                    await refreshProfile();
                    toast.success(t('security.totpEnabled'));
                  })
                }
              />
            </View>
          </View>
        ) : (
          <View style={{ alignItems: isWide ? 'flex-start' : 'stretch' }}>
            <Button
              title={t('security.setupTotp')}
              icon="shield"
              variant="outline"
              loading={busy}
              onPress={() => wrap(async () => setSetup(await api.totpSetup()))}
            />
          </View>
        )}
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm }}>
          <H2>{t('security.emailMfa')}</H2>
          <Badge
            label={user.emailMfaEnabled ? t('security.enabled') : t('security.disabled')}
            tone={
              user.emailMfaEnabled
                ? { bg: colors.successSoft, fg: colors.success }
                : { bg: colors.surface, fg: colors.textMuted }
            }
          />
        </Row>
        <Muted>{t('security.emailMfaHelp')}</Muted>

        {user.emailMfaEnabled ? (
          emailDisableStep ? (
            <View style={{ gap: spacing.md }}>
              <Muted>{t('security.emailMfaCodeSent')}</Muted>
              <View
                style={{
                  flexDirection: isWide ? 'row' : 'column',
                  gap: spacing.md,
                  alignItems: isWide ? 'flex-end' : 'stretch',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Input
                    label={t('security.codeFromEmail')}
                    value={emailDisableCode}
                    onChangeText={setEmailDisableCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    icon="shield"
                  />
                </View>
                <Button
                  title={t('security.disableEmailMfa')}
                  icon="ban"
                  variant="danger"
                  loading={busy}
                  onPress={() =>
                    wrap(async () => {
                      await api.emailMfaDisable({ code: emailDisableCode.trim() });
                      setEmailDisableCode('');
                      setEmailDisableStep(false);
                      await refreshProfile();
                      toast.success(t('security.emailMfaDisabled'));
                    })
                  }
                />
                <Button
                  title={t('security.resendEmailCode')}
                  icon="envelope"
                  variant="outline"
                  loading={busy}
                  onPress={() =>
                    wrap(async () => {
                      await api.emailMfaSendDisableCode();
                      toast.success(t('security.emailCodeResent'));
                    })
                  }
                />
                <Button
                  title={t('common.cancel')}
                  variant="ghost"
                  onPress={() => {
                    setEmailDisableStep(false);
                    setEmailDisableCode('');
                  }}
                />
              </View>
            </View>
          ) : (
            <View style={{ alignItems: isWide ? 'flex-start' : 'stretch' }}>
              <Button
                title={t('security.disableEmailMfa')}
                icon="ban"
                variant="danger"
                loading={busy}
                onPress={() =>
                  wrap(async () => {
                    await api.emailMfaSendDisableCode();
                    setEmailDisableStep(true);
                    toast.info(t('security.emailMfaCodeSent'));
                  })
                }
              />
            </View>
          )
        ) : emailSetupStep ? (
          <View style={{ gap: spacing.md }}>
            <Muted>{t('security.emailMfaCodeSent')}</Muted>
            <View style={{ flexDirection: isWide ? 'row' : 'column', gap: spacing.md, alignItems: isWide ? 'flex-end' : 'stretch' }}>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('security.codeFromEmail')}
                  value={emailCode}
                  onChangeText={setEmailCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  icon="shield"
                />
              </View>
              <Button
                title={t('security.enableEmailMfa')}
                icon="check"
                loading={busy}
                onPress={() =>
                  wrap(async () => {
                    await api.emailMfaEnable(emailCode.trim());
                    setEmailCode('');
                    setEmailSetupStep(false);
                    await refreshProfile();
                    toast.success(t('security.emailMfaEnabled'));
                  })
                }
              />
              <Button
                title={t('security.resendEmailCode')}
                icon="envelope"
                variant="outline"
                loading={busy}
                onPress={() =>
                  wrap(async () => {
                    await api.emailMfaSetup();
                    toast.success(t('security.emailCodeResent'));
                  })
                }
              />
              <Button
                title={t('common.cancel')}
                variant="ghost"
                onPress={() => {
                  setEmailSetupStep(false);
                  setEmailCode('');
                }}
              />
            </View>
          </View>
        ) : (
          <View style={{ alignItems: isWide ? 'flex-start' : 'stretch' }}>
            <Button
              title={t('security.setupEmailMfa')}
              icon="envelope"
              variant="outline"
              loading={busy}
              onPress={() =>
                wrap(async () => {
                  await api.emailMfaSetup();
                  setEmailSetupStep(true);
                  toast.info(t('security.emailMfaCodeSent'));
                })
              }
            />
          </View>
        )}
      </Card>

      <Card style={{ gap: spacing.md }}>
        <H2>{t('security.passkeys')}</H2>
        <Muted>{t('security.passkeysHelp')}</Muted>

        {loadingPasskeys ? (
          <Spinner />
        ) : passkeys.length === 0 ? (
          <Muted>{t('security.noPasskeys')}</Muted>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {passkeys.map((passkey) => (
              <Row
                key={passkey.id}
                style={{
                  justifyContent: 'space-between',
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radius.md,
                  padding: spacing.md,
                }}
              >
                <Row gap={spacing.sm} style={{ flex: 1 }}>
                  <Icon name="key" size={14} color={colors.orange} />
                  <View style={{ flex: 1 }}>
                    <Body style={{ fontWeight: '600' }}>{passkey.label || t('security.passkey')}</Body>
                    <Muted>
                      {t('security.added')}: {formatDate(passkey.createdAt, locale)}
                      {passkey.lastUsedAt ? ` · ${t('security.lastUsed')}: ${formatDate(passkey.lastUsedAt, locale)}` : ''}
                    </Muted>
                  </View>
                </Row>
                <Button
                  title={t('common.delete')}
                  icon="trash"
                  variant="ghost"
                  size="sm"
                  onPress={() =>
                    wrap(async () => {
                      await api.deletePasskey(passkey.id);
                      await loadPasskeys();
                      toast.success(t('security.passkeyRemoved'));
                    })
                  }
                />
              </Row>
            ))}
          </View>
        )}

        {passkeysSupported() ? (
          <View style={{ flexDirection: isWide ? 'row' : 'column', gap: spacing.md, alignItems: isWide ? 'flex-end' : 'stretch' }}>
            <View style={{ flex: 1 }}>
              <Input
                label={t('security.passkeyLabel')}
                value={passkeyLabel}
                onChangeText={setPasskeyLabel}
                placeholder={t('security.passkeyLabelPlaceholder')}
                icon="laptop"
              />
            </View>
            <Button
              title={t('security.addPasskey')}
              icon="plus"
              loading={busy}
              onPress={() =>
                wrap(async () => {
                  await registerPasskey(passkeyLabel.trim() || undefined);
                  setPasskeyLabel('');
                  await loadPasskeys();
                  toast.success(t('security.passkeyAdded'));
                })
              }
            />
          </View>
        ) : (
          <Muted>{t('security.passkeysUnsupported')}</Muted>
        )}
      </Card>

      <Card style={{ gap: spacing.md }}>
        <H3>{t('security.sessions')}</H3>
        <Muted>{t('security.sessionsHelp')}</Muted>
        <Divider />
        <View style={{ alignItems: isWide ? 'flex-end' : 'stretch' }}>
          <Button
            title={t('security.signOutEverywhere')}
            icon="logout"
            variant="danger"
            loading={busy}
            onPress={() =>
              wrap(async () => {
                await api.logoutAll();
                await logout();
                router.replace('/');
              })
            }
          />
        </View>
      </Card>
    </Page>
  );
}
