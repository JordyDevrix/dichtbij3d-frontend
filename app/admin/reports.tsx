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
  Card,
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
          <Badge
            label={`${openCount} ${t('admin.openReports').toLowerCase()}`}
            tone={
              openCount > 0
                ? { bg: colors.dangerSoft, fg: colors.danger }
                : { bg: colors.successSoft, fg: colors.success }
            }
          />
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
      <Card style={{ gap: spacing.md }}>
        {/* Search & Filters */}
        <View style={{ gap: spacing.sm }}>
          <Input
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setPage(0);
            }}
            placeholder="Zoek op reden, melder of ID..."
            icon="search"
            autoCapitalize="none"
          />

          <Row gap={spacing.xs} style={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <Muted style={typography.tiny}>{t('admin.status')}:</Muted>
            <Chip
              label={t('admin.filterAll')}
              selected={statusFilter === 'ALL'}
              size="sm"
              onPress={() => {
                setStatusFilter('ALL');
                setPage(0);
              }}
            />
            <Chip
              label={`${t('admin.filterOpen')} (${openCount})`}
              selected={statusFilter === 'OPEN'}
              size="sm"
              tone={
                statusFilter === 'OPEN'
                  ? { bg: colors.danger, fg: colors.white }
                  : openCount > 0
                  ? { bg: colors.dangerSoft, fg: colors.danger }
                  : undefined
              }
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

            <View style={{ width: 1, height: 16, backgroundColor: colors.border, marginHorizontal: 4 }} />

            <Muted style={typography.tiny}>{t('admin.target')}:</Muted>
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

        {loading ? (
          <Spinner />
        ) : filteredReports.length === 0 ? (
          <EmptyState
            icon="checkCircle"
            title={statusFilter === 'OPEN' && !query ? t('admin.noReports') : 'Geen meldingen gevonden'}
            body={
              statusFilter === 'OPEN' && !query
                ? 'Er zijn momenteel geen openstaande meldingen die actie vereisen.'
                : 'Geen resultaten gevonden voor de gekozen filters.'
            }
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {pagedReports.map((report) => (
              <Card
                key={report.id}
                flat
                style={{
                  gap: spacing.md,
                  opacity: busyId === report.id ? 0.6 : 1,
                  backgroundColor: colors.surfaceAlt,
                  borderColor: report.status === 'OPEN' ? colors.borderStrong : colors.border,
                  borderLeftWidth: report.status === 'OPEN' ? 4 : 1,
                  borderLeftColor: report.status === 'OPEN' ? colors.danger : colors.border,
                }}
              >
                <Row style={{ flexWrap: 'wrap', gap: spacing.md, alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, minWidth: 240, gap: 8 }}>
                    {/* Header Badges */}
                    <Row gap={spacing.sm} style={{ flexWrap: 'wrap', alignItems: 'center' }}>
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

                    {/* Report Reason Box */}
                    <View
                      style={{
                        backgroundColor: colors.surface,
                        borderRadius: radius.md,
                        padding: spacing.md,
                        borderWidth: 1,
                        borderColor: colors.border,
                        gap: 4,
                      }}
                    >
                      <Row gap={6} style={{ alignItems: 'center' }}>
                        <Icon name="flag" size={13} color={report.status === 'OPEN' ? colors.danger : colors.textMuted} />
                        <Muted style={{ ...typography.tiny, fontWeight: '700' }}>{t('admin.reason')}:</Muted>
                      </Row>
                      <Body style={{ fontSize: 14, color: colors.text }}>{report.reason}</Body>
                    </View>

                    {/* Reporter info and timestamp */}
                    <Row gap={spacing.md} style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                      <Row gap={4} style={{ alignItems: 'center' }}>
                        <Icon name="user" size={12} color={colors.textMuted} />
                        <Muted style={typography.tiny}>
                          {t('admin.reporter')}: <Body style={{ fontSize: 12, fontWeight: '600' }}>{report.reporter}</Body>
                        </Muted>
                      </Row>
                      <Row gap={4} style={{ alignItems: 'center' }}>
                        <Icon name="clock" size={12} color={colors.textMuted} />
                        <Muted style={typography.tiny}>{formatDateTime(report.createdAt, locale)}</Muted>
                      </Row>
                    </Row>
                  </View>

                  {/* Actions Column */}
                  <Row gap={spacing.xs} style={{ flexWrap: 'wrap', alignItems: 'center' }}>
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
                        title={t('admin.user')}
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
              </Card>
            ))}

            <Pagination
              page={page}
              totalPages={totalPages}
              totalElements={filteredReports.length}
              onChange={(newPage) => setPage(newPage)}
              loading={loading}
            />
          </View>
        )}
      </Card>
    </AdminShell>
  );
}
