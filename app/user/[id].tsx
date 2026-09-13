import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../src/api';
import { absoluteUrl } from '../../src/api/client';
import type { AdvertSummary, PublicUser } from '../../src/api/types';
import { AdvertCard } from '../../src/components/AdvertCard';
import { Icon } from '../../src/components/Icon';
import { Page } from '../../src/components/Page';
import { Avatar, Badge, Body, Card, EmptyState, H1, H2, Muted, Row, Spinner } from '../../src/components/ui';
import { useI18n } from '../../src/i18n';
import { colors, spacing } from '../../src/theme/theme';
import { formatDate } from '../../src/utils/format';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [adverts, setAdverts] = useState<AdvertSummary[]>([]);
  const [loading, setLoading] = useState(true);

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
    void load();
  }, [load]);

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
        </Row>
      </Card>

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
