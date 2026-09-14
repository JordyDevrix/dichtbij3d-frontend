import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../src/api';
import type { AdvertSummary } from '../src/api/types';
import { AdvertCard } from '../src/components/AdvertCard';
import { Page } from '../src/components/Page';
import {
  Button,
  Card,
  EmptyState,
  H1,
  Muted,
  Pagination,
  Row,
  Spinner,
} from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';
import { useBreakpoint } from '../src/hooks/useBreakpoint';
import { useI18n } from '../src/i18n';
import { colors, spacing } from '../src/theme/theme';
import { numberFmt } from '../src/utils/format';

const PAGE_SIZE = 12;

export default function MyAdvertsScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { user, booting } = useAuth();
  const { isPhone } = useBreakpoint();

  const [items, setItems] = useState<AdvertSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (targetPage: number) => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const result = await api.adverts({
          authorId: user.id,
          page: targetPage,
          size: PAGE_SIZE,
        });
        setItems(result.content);
        setTotal(result.totalElements);
        setPage(result.page);
        setTotalPages(result.totalPages);
      } catch (err) {
        setError(err instanceof ApiError && err.isNetwork ? t('errors.network') : t('errors.generic'));
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [user, t],
  );

  useEffect(() => {
    if (user) {
      void load(page);
    }
  }, [user, page, load]);

  if (booting) return null;

  if (!user) {
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
  }

  return (
    <Page maxWidth={1200}>
      <View style={{ gap: spacing.lg }}>
        <View
          style={{
            flexDirection: isPhone ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isPhone ? 'flex-start' : 'center',
            gap: spacing.md,
          }}
        >
          <View style={{ gap: 4 }}>
            <Row gap={spacing.sm}>
              <Button
                icon="back"
                variant="ghost"
                size="sm"
                title=""
                onPress={() => router.push('/profile')}
              />
              <H1>{t('profile.myAdverts')}</H1>
            </Row>
            <Muted style={{ marginLeft: spacing.xl }}>
              {numberFmt(total, locale)} {t('common.results')}
            </Muted>
          </View>

          <Button
            title={t('marketplace.heroCtaCreate')}
            icon="plus"
            onPress={() => router.push('/create')}
          />
        </View>

        {error && (
          <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.danger }}>
            <Muted style={{ color: colors.danger }}>{error}</Muted>
          </Card>
        )}

        {loading && items.length === 0 ? (
          <Spinner label={t('common.loading')} />
        ) : items.length === 0 ? (
          <Card>
            <EmptyState
              icon="layers"
              title={t('profile.noAdverts')}
              action={
                <Button
                  title={t('marketplace.heroCtaCreate')}
                  icon="plus"
                  onPress={() => router.push('/create')}
                />
              }
            />
          </Card>
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
              {items.map((advert) => (
                <AdvertCard
                  key={advert.id}
                  advert={advert}
                  onChanged={() => void load(page)}
                />
              ))}
            </View>

            <Pagination
              page={page}
              totalPages={totalPages}
              totalElements={total}
              onChange={(newPage) => setPage(newPage)}
              loading={loading}
            />
          </>
        )}
      </View>
    </Page>
  );
}
