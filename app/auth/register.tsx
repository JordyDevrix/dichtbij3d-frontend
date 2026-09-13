import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ApiError } from '../../src/api';
import { SELECTABLE_ROLES } from '../../src/api/types';
import type { Role } from '../../src/api/types';
import { Page } from '../../src/components/Page';
import { Body, Button, Card, H1, H3, Input, Muted, Row } from '../../src/components/ui';
import { Logo } from '../../src/components/AppHeader';
import { Icon } from '../../src/components/Icon';
import { useAuth } from '../../src/context/AuthContext';
import { useI18n } from '../../src/i18n';
import { colors, radius, spacing } from '../../src/theme/theme';
import { Pressable } from 'react-native';

const ROLE_ICONS: Record<string, 'user' | 'print' | 'cube'> = {
  CUSTOMER: 'user',
  PRINTER: 'print',
  MODELLER: 'cube',
};

export default function RegisterScreen() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const { t } = useI18n();
  const { register, busy } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [roles, setRoles] = useState<Role[]>(['CUSTOMER']);
  const [error, setError] = useState<string | null>(null);

  const toggleRole = (role: Role) =>
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

  const submit = async () => {
    setError(null);
    if (password.length < 10) {
      setError(t('auth.passwordHint'));
      return;
    }
    try {
      const result = await register({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        roles: roles.length ? roles : ['CUSTOMER'],
      });
      if (result.ok) router.replace((redirect as string) || '/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('errors.generic'));
    }
  };

  return (
    <Page maxWidth={560} contentStyle={{ paddingTop: spacing.xxl }}>
      <View style={{ alignItems: 'center', marginBottom: spacing.sm }}>
        <Logo />
      </View>
      <Card style={{ gap: spacing.lg }}>
        <View style={{ gap: 4 }}>
          <H1>{t('auth.registerTitle')}</H1>
          <Muted>{t('auth.registerSubtitle')}</Muted>
        </View>

        <Input
          label={t('auth.displayName')}
          value={displayName}
          onChangeText={setDisplayName}
          icon="user"
          placeholder="Sanne de Vries"
        />
        <Input
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          icon="envelope"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Input
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          icon="lock"
          password
          hint={t('auth.passwordHint')}
          autoComplete="new-password"
        />

        <View style={{ gap: spacing.sm }}>
          <H3>{t('roles.pickRoles')}</H3>
          <Muted>{t('roles.pickRolesHint')}</Muted>
          <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
            {SELECTABLE_ROLES.map((role) => {
              const selected = roles.includes(role);
              return (
                <Pressable
                  key={role}
                  onPress={() => toggleRole(role)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.md,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: selected ? colors.orange : colors.border,
                    backgroundColor: selected ? colors.orangeSofter : colors.surface,
                  }}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selected ? colors.orange : colors.surfaceAlt,
                    }}
                  >
                    <Icon
                      name={ROLE_ICONS[role]}
                      size={14}
                      color={selected ? colors.white : colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Body style={{ fontWeight: '700' }}>{t(`roles.${role}`)}</Body>
                    <Muted>{t(`roles.${role}_DESC`)}</Muted>
                  </View>
                  {selected && <Icon name="checkCircle" size={16} color={colors.orange} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        {error && <Body style={{ color: colors.danger }}>{error}</Body>}

        <Button title={t('auth.register')} icon="userPlus" full loading={busy} onPress={submit} />
        <Muted style={{ textAlign: 'center' }}>{t('auth.agreeHint')}</Muted>

        <Row style={{ justifyContent: 'center' }} gap={6}>
          <Muted>{t('auth.hasAccount')}</Muted>
          <Button
            title={t('auth.login')}
            variant="ghost"
            size="sm"
            onPress={() => router.replace({ pathname: '/auth/login', params: { redirect: redirect ?? '' } })}
          />
        </Row>
      </Card>
    </Page>
  );
}
