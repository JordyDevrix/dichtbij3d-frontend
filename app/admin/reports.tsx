import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../../src/api';
import type { Report } from '../../src/api/types';
import { AdminShell } from '../../src/components/AdminShell';
import { Icon } from '../../src/components/Icon';
import { Badge, Body, Button, Card, Muted, Pagination, Row, Spinner } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { useI18n } from '../../src/i18n';
import { colors, radius, spacing } from '../../src/theme/theme';
import { formatDateTime } from '../../src/utils/format';

export default function AdminReportsScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const toast = useToast();
  const { isAdmin, booting } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const PAGE_SIZE = 15;
  const totalPages = Math.ceil(reports.length / PAGE_SIZE);
  const pagedReports = reports.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const load = useCallback(async () => {
    if (booting || !isAdmin) return;
    setLoading(true);
    try {
      setReports(await api.adminReports());
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

  return (
    <AdminShell>
      {loading ? (
        <Spinner />
      ) : reports.length === 0 ? (
        <Card>
          <Row gap={spacing.sm}>
            <Icon name="checkCircle" size={16} color={colors.success} />
            <Muted>{t('admin.noReports')}</Muted>
          </Row>
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {pagedReports.map((report) => (
            <Card key={report.id} style={{ gap: spacing.sm, opacity: busyId === report.id ? 0.6 : 1 }}>
              <Row style={{ flexWrap: 'wrap', gap: spacing.md, alignItems: 'flex-start' }}>
                <View style={{ flex: 1, minWidth: 220, gap: 4 }}>
                  <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
                    <Badge
                      label={report.advertId ? t('admin.reportedAdvert') : t('admin.reportedUser')}
                      tone={{ bg: colors.warningSoft, fg: colors.warning }}
                    />
                    <Badge
                      label={report.status}
                      tone={
                        report.status === 'OPEN'
                          ? { bg: colors.dangerSoft, fg: colors.danger }
                          : { bg: colors.surfaceAlt, fg: colors.textMuted }
                      }
                    />
                  </Row>
                  <Body>{report.reason}</Body>
                  <Muted>
                    {t('admin.reporter')}: {report.reporter} · {formatDateTime(report.createdAt, locale)}
                  </Muted>
                </View>
                <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
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
                        onPress={() => void handle(report, true)}
                      />
                      <Button
                        title={t('admin.resolve')}
                        icon="check"
                        size="sm"
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
            totalElements={reports.length}
            onChange={(newPage) => setPage(newPage)}
            loading={loading}
          />
        </View>
      )}
    </AdminShell>
  );
}
