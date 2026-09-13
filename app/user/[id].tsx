import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api, ApiError } from '../../src/api';
import { absoluteUrl } from '../../src/api/client';
import type { AdvertSummary, PublicUser } from '../../src/api/types';
import { AdvertCard } from '../../src/components/AdvertCard';
import { Icon } from '../../src/components/Icon';
import { Page } from '../../src/components/Page';
import {
  Avatar,
  Badge,
  Body,
  Button,
  Card,
  EmptyState,
  H1,
  H2,
  Input,
  Muted,
  Row,
  Sheet,
  Spinner,
} from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { useStartChat } from '../../src/hooks/useStartChat';
import { useI18n } from '../../src/i18n';
import { colors, spacing } from '../../src/theme/theme';
import { formatDate } from '../../src/utils/format';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { user: me, booting } = useAuth();
  const { startChat, starting } = useStartChat();
  const toast = useToast();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [adverts, setAdverts] = useState<AdvertSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [profile, page] = await Promise.all([api.publicProfile(id), api.adverts({ authorId: id, size: 24 })]);
      setUser(profile);
      setAdverts(page.content);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // The profile carries "did I block this person", which only the backend knows
    // once the stored tokens are loaded.
    if (booting) return;
    void load();
  }, [load, booting]);

  const toggleBlock = async () => {
    if (!user) return;
    setBusy(true);
    try {
      if (user.blocked) {
        await api.unblockUser(user.id);
        toast.success(t('block.unblockedDone'));
      } else {
        await api.blockUser(user.id);
        toast.success(t('block.blockedDone'));
      }
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const submitReport = async () => {
    if (!user || reportReason.trim().length < 3) return;
    setBusy(true);
    try {
      await api.report({ userId: user.id, reason: reportReason.trim() });
      toast.success(t('block.reportSent'));
      setReportOpen(false);
      setReportReason('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Page maxWidth={980}><Spinner /></Page>;

  if (!user)
    return (
      <Page maxWidth={600}>
        <Card>
          <EmptyState icon="user" title={t('errors.notFound')} />
        </Card>
      </Page>
    );

  return (
    <Page maxWidth={980}>
      <Card style={{ gap: spacing.lg }}>
        <Row style={{ flexWrap: 'wrap', gap: spacing.lg, alignItems: 'flex-start' }}>
          <Avatar name={user.displayName} uri={absoluteUrl(user.avatarUrl)} size={78} />
          <View style={{ flex: 1, gap: 6, minWidth: 220 }}>
            <H1>{user.displayName}</H1>
            <Row gap={6} style={{ flexWrap: 'wrap' }}>
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
            {user.bio ? <Body>{user.bio}</Body> : null}
            <Row gap={spacing.md} style={{ flexWrap: 'wrap', marginTop: 2 }}>
              {user.city ? (
                <Row gap={6}>
                  <Icon name="location" size={12} color={colors.textFaint} />
                  <Muted>{user.city}</Muted>
                </Row>
              ) : null}
              <Row gap={6}>
                <Icon name="calendar" size={12} color={colors.textFaint} />
                <Muted>
                  {t('profile.memberSince')}: {user.memberSince ? formatDate(user.memberSince, locale) : '—'}
                </Muted>
              </Row>
            </Row>
          </View>
          {me && me.id !== user.id && (
            <View style={{ gap: spacing.sm, alignItems: 'flex-end' }}>
              {!user.blocked && (
                <Button
                  title={t('chat.contact')}
                  icon="envelope"
                  variant="outline"
                  loading={starting}
                  onPress={() => void startChat(user.id)}
                />
              )}
              <Row gap={spacing.sm}>
                <Button
                  title={t('block.report')}
                  icon="flag"
                  size="sm"
                  variant="ghost"
                  onPress={() => setReportOpen(true)}
                />
                <Button
                  title={user.blocked ? t('block.unblock') : t('block.block')}
                  icon="ban"
                  size="sm"
                  variant={user.blocked ? 'outline' : 'ghost'}
                  loading={busy}
                  onPress={() => void toggleBlock()}
                />
              </Row>
              {user.blocked && <Muted style={{ maxWidth: 260, textAlign: 'right' }}>{t('block.blockedHint')}</Muted>}
            </View>
          )}
        </Row>
      </Card>

      <Sheet open={reportOpen} onClose={() => setReportOpen(false)} title={t('block.report')} width={480}>
        <View style={{ gap: spacing.md }}>
          <Muted>{t('block.reportReason')}</Muted>
          <Input
            value={reportReason}
            onChangeText={setReportReason}
            placeholder={t('block.reportPlaceholder')}
            multiline
          />
          <Row style={{ justifyContent: 'flex-end' }} gap={spacing.sm}>
            <Button title={t('common.cancel')} variant="ghost" onPress={() => setReportOpen(false)} />
            <Button
              title={t('block.report')}
              icon="flag"
              loading={busy}
              disabled={reportReason.trim().length < 3}
              onPress={() => void submitReport()}
            />
          </Row>
        </View>
      </Sheet>

      <H2>{t('profile.publicAdverts')}</H2>
      {adverts.length === 0 ? (
        <Card>
          <EmptyState icon="layers" title={t('profile.noAdverts')} />
        </Card>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
          {adverts.map((advert) => (
            <AdvertCard key={advert.id} advert={advert} onChanged={() => void load()} />
          ))}
        </View>
      )}
    </Page>
  );
}
