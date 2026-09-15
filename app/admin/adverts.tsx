import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../../src/api';
import type { AdminAdvert } from '../../src/api/types';
import { AdminShell } from '../../src/components/AdminShell';
import { Badge, Body, Button, Card, EmptyState, Muted, Pagination, Row, Spinner } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { useI18n } from '../../src/i18n';
import { advertTypeColor, colors, spacing, statusColor } from '../../src/theme/theme';
import { formatDate, numberFmt } from '../../src/utils/format';

export default function AdminAdvertsScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const toast = useToast();
  const { isAdmin, booting } = useAuth();
  const [adverts, setAdverts] = useState<AdminAdvert[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const load = useCallback(async (nextPage: number) => {
    if (booting || !isAdmin) return;
    setLoading(true);
    try {
      const result = await api.adminAdverts(nextPage, 20);
      setAdverts(result.content);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setTotal(result.totalElements);
    } catch {
      setAdverts([]);
      setTotalPages(0);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [booting, isAdmin]);

  useEffect(() => {
    if (!booting && isAdmin) {
      void load(0);
    }
  }, [booting, isAdmin, load]);

  const restore = async (advert: AdminAdvert) => {
    try {
      await api.adminRestoreAdvert(advert.id);
      await load(page);
      toast.success(t('admin.advertRestored'));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('errors.generic'));
    }
  };

  return (
    <AdminShell>
      {loading && adverts.length === 0 ? (
        <Spinner />
      ) : adverts.length === 0 ? (
        <Card>
          <EmptyState icon="layers" title={t('admin.noAdverts')} />
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {adverts.map((advert) => (
            <Card key={advert.id} style={{ gap: spacing.sm }}>
              <Row style={{ flexWrap: 'wrap', gap: spacing.md, alignItems: 'flex-start' }}>
                <View style={{ flex: 1, minWidth: 220, gap: 4 }}>
                  <Body style={{ fontWeight: '700' }} numberOfLines={1}>
                    {advert.title}
                  </Body>
                  <Row gap={6} style={{ flexWrap: 'wrap' }}>
                    <Badge
                      label={t(`advertTypes.${advert.type}`)}
                      tone={advertTypeColor[advert.type] ?? { bg: colors.surfaceAlt, fg: colors.textMuted }}
                    />
                    <Badge
                      label={t(`status.${advert.status}`)}
                      tone={statusColor[advert.status] ?? { bg: colors.surfaceAlt, fg: colors.textMuted }}
                    />
                    {advert.deletedAt && (
                      <Badge label={t('admin.deleted')} tone={{ bg: colors.dangerSoft, fg: colors.danger }} />
                    )}
                  </Row>
                  <Muted>
                    {advert.author} · {formatDate(advert.createdAt, locale)} · {t('admin.views')}:{' '}
                    {numberFmt(advert.viewCount, locale)}
                  </Muted>
                  {advert.deletedReason ? (
                    <Muted style={{ color: colors.danger }}>
                      {t('admin.reason')}: {advert.deletedReason}
                    </Muted>
                  ) : null}
                </View>
                <Row gap={spacing.sm}>
                  <Button
                    title={t('admin.openAdvert')}
                    icon="external"
                    variant="ghost"
                    size="sm"
                    onPress={() => router.push(`/advert/${advert.id}` as any)}
                  />
                  {advert.deletedAt && (
                    <Button
                      title={t('admin.restore')}
                      icon="refresh"
                      variant="outline"
                      size="sm"
                      onPress={() => void restore(advert)}
                    />
                  )}
                </Row>
              </Row>
            </Card>
          ))}

          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={total}
            onChange={(newPage) => void load(newPage)}
            loading={loading}
          />
        </View>
      )}
    </AdminShell>
  );
}
