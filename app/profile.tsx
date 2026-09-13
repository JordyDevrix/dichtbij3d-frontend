import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../src/api';
import { absoluteUrl } from '../src/api/client';
import { GENDERS, SELECTABLE_ROLES } from '../src/api/types';
import type { AdvertSummary, Gender, Role } from '../src/api/types';
import { AdvertCard } from '../src/components/AdvertCard';
import { Icon } from '../src/components/Icon';
import { Page } from '../src/components/Page';
import {
  Avatar,
  Badge,
  Body,
  Button,
  Card,
  Chip,
  EmptyState,
  H1,
  H2,
  H3,
  Input,
  Muted,
  Row,
  Select,
  Spinner,
} from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';
import { useToast } from '../src/context/ToastContext';
import { LOCALE_LABELS, LOCALES, useI18n } from '../src/i18n';
import type { Locale } from '../src/i18n';
import { colors, spacing } from '../src/theme/theme';
import { formatDate } from '../src/utils/format';
import { pickAndUploadAvatar } from '../src/utils/upload';

export default function ProfileScreen() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const { user, booting, refreshProfile, logout, isAdmin } = useAuth();
  const toast = useToast();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState<Gender | undefined>(undefined);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [city, setCity] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [busy, setBusy] = useState(false);
  const [adverts, setAdverts] = useState<AdvertSummary[]>([]);
  const [loadingAdverts, setLoadingAdverts] = useState(true);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName ?? '');
    setBio(user.bio ?? '');
    setGender(user.gender ?? undefined);
    setContactEmail(user.contactEmail ?? '');
    setContactPhone(user.contactPhone ?? '');
    setWebsite(user.website ?? '');
    setCity(user.city ?? '');
    setRoles((user.roles ?? []).filter((role) => role !== 'ADMIN'));
  }, [user]);

  const loadAdverts = useCallback(async () => {
    if (!user) return;
    setLoadingAdverts(true);
    try {
      const page = await api.adverts({ authorId: user.id, size: 24 });
      setAdverts(page.content);
    } catch {
      setAdverts([]);
    } finally {
      setLoadingAdverts(false);
    }
  }, [user]);

  useEffect(() => {
    void loadAdverts();
  }, [loadAdverts]);

  if (booting) return null;

  if (!user)
    return (
      <Page maxWidth={600}>
        <Card>
          <EmptyState
            icon="user"
            title={t('common.signInRequired')}
            body={t('common.signInRequiredBody')}
            action={
              <Row gap={spacing.sm}>
                <Button title={t('nav.login')} onPress={() => router.push('/auth/login')} />
                <Button title={t('nav.register')} variant="outline" onPress={() => router.push('/auth/register')} />
              </Row>
            }
          />
        </Card>
      </Page>
    );

  const save = async () => {
    setBusy(true);
    try {
      await api.updateMe({
        displayName: displayName.trim(),
        bio: bio.trim(),
        gender,
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        website: website.trim(),
        city: city.trim(),
        locale,
        roles: roles.length ? roles : ['CUSTOMER'],
      });
      await refreshProfile();
      toast.success(t('profile.saved'));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const changeAvatar = async () => {
    setBusy(true);
    try {
      const result = await pickAndUploadAvatar();
      if (result) {
        await refreshProfile();
        toast.success(t('profile.saved'));
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page maxWidth={980}>
      <Card style={{ gap: spacing.lg }}>
        <Row style={{ flexWrap: 'wrap', gap: spacing.lg }}>
          <Pressable onPress={changeAvatar}>
            <Avatar name={user.displayName} uri={absoluteUrl(user.avatarUrl)} size={78} />
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                backgroundColor: colors.orange,
                width: 26,
                height: 26,
                borderRadius: 13,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: colors.surface,
              }}
            >
              <Icon name="camera" size={11} color={colors.white} />
            </View>
          </Pressable>
          <View style={{ flex: 1, gap: 4, minWidth: 200 }}>
            <H1>{user.displayName}</H1>
            <Muted>{user.email}</Muted>
            <Row gap={6} style={{ flexWrap: 'wrap', marginTop: 4 }}>
              {user.roles.map((role) => (
                <Badge
                  key={role}
                  label={t(`roles.${role}`)}
                  tone={
                    role === 'ADMIN'
                      ? { bg: colors.ink, fg: colors.white }
                      : { bg: colors.orangeSoft, fg: colors.orangeDarker }
                  }
                />
              ))}
            </Row>
            <Muted>
              {t('profile.memberSince')}: {user.createdAt ? formatDate(user.createdAt, locale) : '—'}
            </Muted>
          </View>
          <Row gap={spacing.sm}>
            <Button
              title={t('nav.security')}
              icon="shield"
              variant="outline"
              size="sm"
              onPress={() => router.push('/settings/security')}
            />
            {isAdmin && (
              <Button
                title={t('nav.admin')}
                icon="userShield"
                variant="outline"
                size="sm"
                onPress={() => router.push('/admin')}
              />
            )}
            <Button title={t('nav.logout')} icon="logout" variant="ghost" size="sm" onPress={() => void logout()} />
          </Row>
        </Row>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <H2>{t('profile.editProfile')}</H2>
        <Row gap={spacing.md} style={{ flexWrap: 'wrap' }}>
          <View style={{ flexGrow: 1, flexBasis: 240 }}>
            <Input label={t('auth.displayName')} value={displayName} onChangeText={setDisplayName} icon="user" />
          </View>
          <View style={{ flexGrow: 1, flexBasis: 240 }}>
            <Input label={t('profile.city')} value={city} onChangeText={setCity} icon="location" />
          </View>
        </Row>
        <Input
          label={t('profile.bio')}
          value={bio}
          onChangeText={setBio}
          placeholder={t('profile.bioPlaceholder')}
          multiline
        />
        <Row gap={spacing.md} style={{ flexWrap: 'wrap' }}>
          <View style={{ flexGrow: 1, flexBasis: 220 }}>
            <Select
              label={t('profile.gender')}
              value={gender}
              options={GENDERS.map((value) => ({ value, label: t(`profile.${value}`) }))}
              onChange={setGender}
              icon="user"
            />
          </View>
          <View style={{ flexGrow: 1, flexBasis: 220 }}>
            <Select
              label={t('common.language')}
              value={locale}
              options={LOCALES.map((value) => ({ value, label: LOCALE_LABELS[value as Locale] }))}
              onChange={(value) => setLocale(value as Locale)}
              icon="globe"
            />
          </View>
        </Row>
        <Row gap={spacing.md} style={{ flexWrap: 'wrap' }}>
          <View style={{ flexGrow: 1, flexBasis: 220 }}>
            <Input
              label={t('profile.contactEmail')}
              value={contactEmail}
              onChangeText={setContactEmail}
              icon="envelope"
              autoCapitalize="none"
            />
          </View>
          <View style={{ flexGrow: 1, flexBasis: 200 }}>
            <Input label={t('profile.contactPhone')} value={contactPhone} onChangeText={setContactPhone} icon="phone" />
          </View>
          <View style={{ flexGrow: 1, flexBasis: 220 }}>
            <Input
              label={t('profile.website')}
              value={website}
              onChangeText={setWebsite}
              icon="globe"
              autoCapitalize="none"
            />
          </View>
        </Row>

        <View style={{ gap: spacing.sm }}>
          <H3>{t('roles.pickRoles')}</H3>
          <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
            {SELECTABLE_ROLES.map((role) => (
              <Chip
                key={role}
                label={t(`roles.${role}`)}
                selected={roles.includes(role)}
                onPress={() =>
                  setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]))
                }
              />
            ))}
          </Row>
        </View>

        <Row style={{ justifyContent: 'flex-end' }}>
          <Button title={t('common.save')} icon="check" loading={busy} onPress={save} />
        </Row>
      </Card>

      <View style={{ gap: spacing.md }}>
        <H2>{t('profile.myAdverts')}</H2>
        {loadingAdverts ? (
          <Spinner />
        ) : adverts.length === 0 ? (
          <Card>
            <EmptyState
              icon="layers"
              title={t('profile.noAdverts')}
              action={<Button title={t('marketplace.heroCtaCreate')} icon="plus" onPress={() => router.push('/create')} />}
            />
          </Card>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
            {adverts.map((advert) => (
              <AdvertCard key={advert.id} advert={advert} onChanged={() => void loadAdverts()} />
            ))}
          </View>
        )}
      </View>
    </Page>
  );
}
