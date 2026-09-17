import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../../src/api';
import type { Report } from '../../src/api/types';
import { AdminShell } from '../../src/components/AdminShell';
import { Icon } from '../../src/components/Icon';
import {
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
import { colors, radius, spacing, typography } from '../../src/theme/theme';
import { formatDateTime } from '../../src/utils/format';

type StatusFilter = 'ALL' | 'OPEN' | 'RESOLVED' | 'DISMISSED';
type TargetFilter = 'ALL' | 'ADVERT' | 'USER';

export default function AdminReportsScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const toast = useToast();
  const { isAdmin, booting } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('OPEN');
  const [targetFilter, setTargetFilter] = useState<TargetFilter>('ALL');

  const PAGE_SIZE = 15;

  const load = useCallback(async () => {
    if (booting || !isAdmin) return;
    setLoading(true);
    try {
      const data = await api.adminReports();
      setReports(data);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [booting, isAdmin]);

  useEffect(() => {
    if (!booting && isAdmin) {
      void load();
    }
  }, [booting, isAdmin, load]);

  const handle = async (report: Report, dismiss: boolean) => {
    setBusyId(report.id);
    try {
      await api.adminResolveReport(report.id, dismiss);
      await load();
      toast.success(t('admin.reportHandled'));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('errors.generic'));
    } finally {
      setBusyId(null);
    }
  };

  const openCount = useMemo(() => {
    return reports.filter((r) => r.status === 'OPEN').length;
  }, [reports]);

  const filteredReports = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((report) => {
      if (statusFilter !== 'ALL' && report.status !== statusFilter) return false;
      if (targetFilter === 'ADVERT' && !report.advertId) return false;
      if (targetFilter === 'USER' && !report.userId) return false;
      if (q) {
        const matchReason = report.reason.toLowerCase().includes(q);
        const matchReporter = report.reporter.toLowerCase().includes(q);
        const matchAdvertId = report.advertId?.toLowerCase().includes(q);
        const matchUserId = report.userId?.toLowerCase().includes(q);
        if (!matchReason && !matchReporter && !matchAdvertId && !matchUserId) return false;
      }
      return true;
    });
  }, [reports, query, statusFilter, targetFilter]);

  const totalPages = Math.ceil(filteredReports.length / PAGE_SIZE) || 1;
  const pagedReports = useMemo(() => {
    return filteredReports.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }, [filteredReports, page]);

  return (
    <AdminShell
      title={t('admin.reports')}
      subtitle={t('admin.subtitle')}
      headerActions={
        <Row gap={spacing.xs} style={{ alignItems: 'center' }}>
          {openCount > 0 && (
            <Badge
              label={`${openCount} open`}
              tone={{ bg: colors.dangerSoft, fg: colors.danger }}
            />
          )}
          <Button
            title={t('common.refresh')}
            icon="refresh"
            variant="outline"
            size="sm"
            loading={loading}
            onPress={() => void load()}
          />
        </Row>
      }
    >
      <View style={{ gap: spacing.lg }}>
        {/* Search & Filter Toolbar */}
        <View style={{ gap: spacing.sm }}>
          <View style={{ maxWidth: 420 }}>
            <Input
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                setPage(0);
              }}
              placeholder="Zoek op reden, melder..."
              icon="search"
              autoCapitalize="none"
            />
          </View>

          <Row gap={spacing.xs} style={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              label={openCount > 0 ? `${t('admin.filterOpen')} (${openCount})` : t('admin.filterOpen')}
              selected={statusFilter === 'OPEN'}
              size="sm"
              tone={statusFilter === 'OPEN' ? { bg: colors.orange, fg: colors.white } : undefined}
              onPress={() => {
                setStatusFilter('OPEN');
                setPage(0);
              }}
            />
            <Chip
              label={t('admin.filterResolved')}
              selected={statusFilter === 'RESOLVED'}
              size="sm"
              onPress={() => {
                setStatusFilter('RESOLVED');
                setPage(0);
              }}
            />
            <Chip
              label={t('admin.dismiss')}
              selected={statusFilter === 'DISMISSED'}
              size="sm"
              onPress={() => {
                setStatusFilter('DISMISSED');
                setPage(0);
              }}
            />
            <Chip
              label={t('admin.filterAll')}
              selected={statusFilter === 'ALL'}
              size="sm"
              onPress={() => {
                setStatusFilter('ALL');
                setPage(0);
              }}
            />

            <View style={{ width: 1, height: 16, backgroundColor: colors.border, marginHorizontal: 4 }} />

            <Chip
              label={t('admin.filterAll')}
              selected={targetFilter === 'ALL'}
              size="sm"
              onPress={() => {
                setTargetFilter('ALL');
                setPage(0);
              }}
            />
            <Chip
              label={t('admin.adverts')}
              selected={targetFilter === 'ADVERT'}
              size="sm"
              onPress={() => {
                setTargetFilter('ADVERT');
                setPage(0);
              }}
            />
            <Chip
              label={t('admin.users')}
              selected={targetFilter === 'USER'}
              size="sm"
              onPress={() => {
                setTargetFilter('USER');
                setPage(0);
              }}
            />
          </Row>
        </View>

        {/* Reports Table List (Single clean surface) */}
        {loading ? (
          <Spinner />
        ) : filteredReports.length === 0 ? (
          <EmptyState
            icon="checkCircle"
            title={statusFilter === 'OPEN' && !query ? t('admin.noReports') : 'Geen meldingen gevonden'}
            body={
              statusFilter === 'OPEN' && !query
                ? 'Er zijn momenteel geen openstaande meldingen die actie vereisen.'
                : undefined
            }
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
            {pagedReports.map((report, idx) => {
              const isLast = idx === pagedReports.length - 1;
              return (
                <View
                  key={report.id}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 18,
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: colors.border,
                    opacity: busyId === report.id ? 0.6 : 1,
                    gap: 8,
                  }}
                >
                  <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: spacing.md }}>
                    <View style={{ flex: 1, minWidth: 260, gap: 6 }}>
                      {/* Badges row */}
                      <Row gap={8} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <Badge
                          label={report.advertId ? t('admin.reportedAdvert') : t('admin.reportedUser')}
                          tone={
                            report.advertId
                              ? { bg: colors.orangeSoft, fg: colors.orangeDark }
                              : { bg: colors.infoSoft, fg: colors.info }
                          }
                        />
                        <Badge
                          label={report.status}
                          tone={
                            report.status === 'OPEN'
                              ? { bg: colors.dangerSoft, fg: colors.danger }
                              : report.status === 'RESOLVED'
                              ? { bg: colors.successSoft, fg: colors.success }
                              : { bg: colors.surfaceSunken, fg: colors.textMuted }
                          }
                        />
                      </Row>

                      {/* Reason */}
                      <Body style={{ fontSize: 14, color: colors.ink, fontWeight: '500' }}>
                        {report.reason}
                      </Body>

                      {/* Reporter and Date */}
                      <Row gap={14} style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                        <Row gap={4} style={{ alignItems: 'center' }}>
                          <Icon name="user" size={11} color={colors.textMuted} />
                          <Muted style={{ fontSize: 12 }}>
                            {t('admin.reporter')}: <Body style={{ fontSize: 12, fontWeight: '600', color: colors.ink }}>{report.reporter}</Body>
                          </Muted>
                        </Row>
                        <Row gap={4} style={{ alignItems: 'center' }}>
                          <Icon name="clock" size={11} color={colors.textMuted} />
                          <Muted style={{ fontSize: 12 }}>{formatDateTime(report.createdAt, locale)}</Muted>
                        </Row>
                      </Row>
                    </View>

                    {/* Actions */}
                    <Row gap={4} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      {report.advertId && (
                        <Button
                          title={t('admin.openAdvert')}
                          icon="external"
                          variant="ghost"
                          size="sm"
                          onPress={() => router.push(`/advert/${report.advertId}` as any)}
                        />
                      )}
                      {report.userId && (
                        <Button
                          title=""
                          icon="user"
                          variant="ghost"
                          size="sm"
                          onPress={() => router.push(`/user/${report.userId}` as any)}
                        />
                      )}
                      {report.status === 'OPEN' && (
                        <>
                          <Button
                            title={t('admin.dismiss')}
                            icon="close"
                            variant="outline"
                            size="sm"
                            loading={busyId === report.id}
                            onPress={() => void handle(report, true)}
                          />
                          <Button
                            title={t('admin.resolve')}
                            icon="check"
                            variant="primary"
                            size="sm"
                            loading={busyId === report.id}
                            onPress={() => void handle(report, false)}
                          />
                        </>
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
          totalElements={filteredReports.length}
          onChange={(newPage) => setPage(newPage)}
          loading={loading}
        />
      </View>
    </AdminShell>
  );
}
