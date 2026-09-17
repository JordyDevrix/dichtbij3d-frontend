import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../../src/api';
import { ADVERT_TYPES } from '../../src/api/types';
import type { AdminAdvert, AdvertType } from '../../src/api/types';
import { AdminShell } from '../../src/components/AdminShell';
import { Icon } from '../../src/components/Icon';
import {
  Avatar,
  Badge,
  Body,
  Button,
  Chip,
  EmptyState,
  Input,
  Muted,
  Pagination,
  Row,
  Spinner,
} from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { useI18n } from '../../src/i18n';
import { advertTypeColor, colors, radius, spacing, statusColor, typography } from '../../src/theme/theme';
import { formatDate, numberFmt } from '../../src/utils/format';

type StatusFilter = 'ALL' | 'ACTIVE' | 'DELETED';

export default function AdminAdvertsScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const toast = useToast();
  const { isAdmin, booting } = useAuth();

  const [adverts, setAdverts] = useState<AdminAdvert[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedType, setSelectedType] = useState<AdvertType | 'ALL'>('ALL');

  const load = useCallback(async (nextPage: number) => {
    if (booting || !isAdmin) return;
    setLoading(true);
    try {
      const result = await api.adminAdverts(nextPage, 25);
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
    setBusyId(advert.id);
    try {
      await api.adminRestoreAdvert(advert.id);
      await load(page);
      toast.success(t('admin.advertRestored'));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('errors.generic'));
    } finally {
      setBusyId(null);
    }
  };

  const filteredAdverts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return adverts.filter((adv) => {
      if (statusFilter === 'ACTIVE' && adv.deletedAt) return false;
      if (statusFilter === 'DELETED' && !adv.deletedAt) return false;
      if (selectedType !== 'ALL' && adv.type !== selectedType) return false;
      if (q) {
        const matchTitle = adv.title.toLowerCase().includes(q);
        const matchAuthor = adv.author.toLowerCase().includes(q);
        if (!matchTitle && !matchAuthor) return false;
      }
      return true;
    });
  }, [adverts, query, statusFilter, selectedType]);

  return (
    <AdminShell
      title={t('admin.adverts')}
      subtitle={t('admin.subtitle')}
      headerActions={
        <Row gap={spacing.xs} style={{ alignItems: 'center' }}>
          <Muted style={{ fontSize: 13, fontWeight: '600' }}>
            {total} {t('admin.adverts').toLowerCase()}
          </Muted>
          <Button
            title={t('common.refresh')}
            icon="refresh"
            variant="outline"
            size="sm"
            loading={loading}
            onPress={() => void load(page)}
          />
        </Row>
      }
    >
      <View style={{ gap: spacing.lg }}>
        {/* Search & Filter Toolbar (Flat on background) */}
        <View style={{ gap: spacing.sm }}>
          <View style={{ maxWidth: 420 }}>
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder={t('admin.searchAdverts')}
              icon="search"
              autoCapitalize="none"
            />
          </View>

          {/* Filter Chips */}
          <Row gap={spacing.xs} style={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              label={t('admin.filterAll')}
              selected={statusFilter === 'ALL'}
              size="sm"
              onPress={() => setStatusFilter('ALL')}
            />
            <Chip
              label={t('admin.active')}
              selected={statusFilter === 'ACTIVE'}
              size="sm"
              onPress={() => setStatusFilter('ACTIVE')}
            />
            <Chip
              label={t('admin.deleted')}
              selected={statusFilter === 'DELETED'}
              size="sm"
              tone={statusFilter === 'DELETED' ? { bg: colors.danger, fg: colors.white } : undefined}
              onPress={() => setStatusFilter('DELETED')}
            />

            <View style={{ width: 1, height: 16, backgroundColor: colors.border, marginHorizontal: 4 }} />

            <Chip
              label={t('admin.filterAll')}
              selected={selectedType === 'ALL'}
              size="sm"
              onPress={() => setSelectedType('ALL')}
            />
            {ADVERT_TYPES.map((type) => (
              <Chip
                key={type}
                label={t(`advertTypes.${type}`)}
                selected={selectedType === type}
                size="sm"
                onPress={() => setSelectedType(type)}
              />
            ))}
          </Row>
        </View>

        {/* Adverts Table List (Single clean surface) */}
        {loading && adverts.length === 0 ? (
          <Spinner />
        ) : filteredAdverts.length === 0 ? (
          <EmptyState
            icon="layers"
            title={t('admin.noAdverts')}
            body={query || statusFilter !== 'ALL' || selectedType !== 'ALL' ? 'Geen advertenties gevonden voor de gekozen filters.' : undefined}
          />
        ) : (
          <View
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.lg,
              overflow: 'hidden',
            }}
          >
            {filteredAdverts.map((advert, idx) => {
              const isLast = idx === filteredAdverts.length - 1;
              return (
                <View
                  key={advert.id}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 18,
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: colors.border,
                    opacity: busyId === advert.id ? 0.6 : 1,
                    gap: 6,
                  }}
                >
                  <Row style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md }}>
                    {/* Advert Title & Badges */}
                    <View style={{ flex: 1, minWidth: 260, gap: 6 }}>
                      <Row gap={8} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <Pressable onPress={() => router.push(`/advert/${advert.id}` as any)}>
                          <Body style={{ fontWeight: '700', fontSize: 14.5, color: colors.ink }}>
                            {advert.title}
                          </Body>
                        </Pressable>

                        <Badge
                          label={t(`advertTypes.${advert.type}`)}
                          tone={advertTypeColor[advert.type] ?? { bg: colors.surfaceAlt, fg: colors.textMuted }}
                        />
                        <Badge
                          label={t(`status.${advert.status}`)}
                          tone={statusColor[advert.status] ?? { bg: colors.surfaceAlt, fg: colors.textMuted }}
                        />
                        {advert.deletedAt && (
                          <Badge
                            label={t('admin.deleted')}
                            tone={{ bg: colors.dangerSoft, fg: colors.danger }}
                          />
                        )}
                      </Row>

                      {/* Author, Date & Views info */}
                      <Row gap={14} style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                        <Row gap={4} style={{ alignItems: 'center' }}>
                          <Icon name="user" size={11} color={colors.textMuted} />
                          <Muted style={{ fontSize: 12 }}>{advert.author}</Muted>
                        </Row>
                        <Row gap={4} style={{ alignItems: 'center' }}>
                          <Icon name="calendar" size={11} color={colors.textMuted} />
                          <Muted style={{ fontSize: 12 }}>{formatDate(advert.createdAt, locale)}</Muted>
                        </Row>
                        <Row gap={4} style={{ alignItems: 'center' }}>
                          <Icon name="eye" size={11} color={colors.textMuted} />
                          <Muted style={{ fontSize: 12 }}>
                            {numberFmt(advert.viewCount, locale)} {t('advert.views')}
                          </Muted>
                        </Row>
                      </Row>

                      {advert.deletedReason && (
                        <Muted style={{ fontSize: 11.5, color: colors.danger }}>
                          {t('admin.reason')}: {advert.deletedReason}
                        </Muted>
                      )}
                    </View>

                    {/* Action Buttons */}
                    <Row gap={4} style={{ alignItems: 'center' }}>
                      <Button
                        title={t('admin.openAdvert')}
                        icon="external"
                        variant="ghost"
                        size="sm"
                        onPress={() => router.push(`/advert/${advert.id}` as any)}
                      />
                      {advert.authorId && (
                        <Button
                          title=""
                          icon="user"
                          variant="ghost"
                          size="sm"
                          onPress={() => router.push(`/user/${advert.authorId}` as any)}
                        />
                      )}
                      {advert.deletedAt && (
                        <Button
                          title={t('admin.restore')}
                          icon="refresh"
                          variant="outline"
                          size="sm"
                          loading={busyId === advert.id}
                          onPress={() => void restore(advert)}
                        />
                      )}
                    </Row>
                  </Row>
                </View>
              );
            })}
          </View>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          totalElements={total}
          onChange={(newPage) => void load(newPage)}
          loading={loading}
        />
      </View>
    </AdminShell>
  );
}
