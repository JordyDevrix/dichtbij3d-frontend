import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../src/api';
import { absoluteUrl } from '../src/api/client';
import { GENDERS, SELECTABLE_ROLES } from '../src/api/types';
import type { AdvertSummary, BlockedUser, Gender, Role, NotificationType } from '../src/api/types';
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
import { useBreakpoint } from '../src/hooks/useBreakpoint';
import { LOCALE_LABELS, LOCALES, useI18n } from '../src/i18n';
import type { Locale } from '../src/i18n';
import { colors, spacing } from '../src/theme/theme';
import { formatDate } from '../src/utils/format';
import { pickAndUploadAvatar } from '../src/utils/upload';

const NOTIFICATION_CATEGORIES: { labelKey: string; types: NotificationType[] }[] = [
  { labelKey: 'categoryBids', types: ['BID_PLACED', 'BID_ACCEPTED', 'BID_REJECTED'] },
  { labelKey: 'categoryChat', types: ['MESSAGE_RECEIVED'] },
  { labelKey: 'categoryReactions', types: ['ADVERT_REACTION'] },
  { labelKey: 'categorySales', types: ['ADVERT_ACCEPTED', 'ADVERT_PURCHASE_REQUEST', 'MODEL_PURCHASED', 'MODEL_PURCHASE_REQUEST', 'MODEL_ACCESS_GRANTED', 'MODEL_PURCHASE_DECLINED'] },
  { labelKey: 'categorySystem', types: ['ADVERT_REMOVED', 'MODEL_SHARED', 'SYSTEM'] }
];

export default function ProfileScreen() {
  const router = useRouter();
  const { isWide } = useBreakpoint();
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
  const [mutedNotifications, setMutedNotifications] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [adverts, setAdverts] = useState<AdvertSummary[]>([]);
  const [loadingAdverts, setLoadingAdverts] = useState(true);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);

  const loadBlocked = useCallback(() => {
    api.blockedUsers().then(setBlocked).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadBlocked();
  }, [user, loadBlocked]);

  const unblock = async (id: string) => {
    try {
      await api.unblockUser(id);
      toast.success(t('block.unblockedDone'));
      loadBlocked();
    } catch {
      toast.error(t('errors.generic'));
    }
  };

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
    setMutedNotifications(user.mutedNotifications ?? []);
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
        mutedNotifications: mutedNotifications as NotificationType[],
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
        <View style={{ flexDirection: isWide ? 'row' : 'column', gap: spacing.lg }}>
          <Pressable onPress={changeAvatar} style={{ alignSelf: isWide ? 'auto' : 'center' }}>
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
          <View style={{ flex: 1, gap: 4, minWidth: 200, alignItems: isWide ? 'flex-start' : 'center' }}>
            <H1>{user.displayName}</H1>
            <Muted>{user.email}</Muted>
            <Row gap={6} style={{ flexWrap: 'wrap', marginTop: 4, justifyContent: isWide ? 'flex-start' : 'center' }}>
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
          <View style={{ flexDirection: isWide ? 'row' : 'column', gap: spacing.sm }}>
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
          </View>
        </View>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <H2>{t('profile.editProfile')}</H2>
        <View style={{ flexDirection: isWide ? 'row' : 'column', gap: spacing.md }}>
          <View style={{ flexGrow: 1, flexBasis: isWide ? 240 : 'auto' }}>
            <Input label={t('auth.displayName')} value={displayName} onChangeText={setDisplayName} icon="user" />
          </View>
          <View style={{ flexGrow: 1, flexBasis: isWide ? 240 : 'auto' }}>
            <Input label={t('profile.city')} value={city} onChangeText={setCity} icon="location" />
          </View>
        </View>
        <Input
          label={t('profile.bio')}
          value={bio}
          onChangeText={setBio}
          placeholder={t('profile.bioPlaceholder')}
          multiline
        />
        <View style={{ flexDirection: isWide ? 'row' : 'column', gap: spacing.md }}>
          <View style={{ flexGrow: 1, flexBasis: isWide ? 220 : 'auto' }}>
            <Select
              label={t('profile.gender')}
              value={gender}
              options={GENDERS.map((value) => ({ value, label: t(`profile.${value}`) }))}
              onChange={setGender}
              icon="user"
            />
          </View>
          <View style={{ flexGrow: 1, flexBasis: isWide ? 220 : 'auto' }}>
            <Select
              label={t('common.language')}
              value={locale}
              options={LOCALES.map((value) => ({ value, label: LOCALE_LABELS[value as Locale] }))}
              onChange={(value) => setLocale(value as Locale)}
              icon="globe"
            />
          </View>
        </View>
        <View style={{ flexDirection: isWide ? 'row' : 'column', gap: spacing.md }}>
          <View style={{ flexGrow: 1, flexBasis: isWide ? 220 : 'auto' }}>
            <Input
              label={t('profile.contactEmail')}
              value={contactEmail}
              onChangeText={setContactEmail}
              icon="envelope"
              autoCapitalize="none"
            />
          </View>
          <View style={{ flexGrow: 1, flexBasis: isWide ? 200 : 'auto' }}>
            <Input label={t('profile.contactPhone')} value={contactPhone} onChangeText={setContactPhone} icon="phone" />
          </View>
          <View style={{ flexGrow: 1, flexBasis: isWide ? 220 : 'auto' }}>
            <Input
              label={t('profile.website')}
              value={website}
              onChangeText={setWebsite}
              icon="globe"
              autoCapitalize="none"
            />
          </View>
        </View>

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


        <View style={{ flexDirection: isWide ? 'row' : 'column', justifyContent: 'flex-end' }}>
          <Button title={t('common.save')} icon="check" loading={busy} onPress={save} />
        </View>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <H2>{t('block.blockedTitle')}</H2>
        {blocked.length === 0 ? (
          <Muted>{t('block.blockedEmpty')}</Muted>
        ) : (
          blocked.map((entry) => (
            <View key={entry.user.id} style={{ flexDirection: isWide ? 'row' : 'column', justifyContent: 'space-between', gap: spacing.md }}>
              <Row gap={spacing.sm} style={{ flex: 1 }}>
                <Avatar name={entry.user.displayName} uri={absoluteUrl(entry.user.avatarUrl)} size={28} />
                <Body numberOfLines={1} style={{ flex: 1 }}>
                  {entry.user.displayName}
                </Body>
              </Row>
              <Button
                title={t('block.unblock')}
                icon="ban"
                size="sm"
                variant="outline"
                onPress={() => void unblock(entry.user.id)}
              />
            </View>
          ))
        )}
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
