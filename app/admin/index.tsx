import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/api';
import type { AdminMetrics, AuditLogEntry } from '../../src/api/types';
import { AdminShell } from '../../src/components/AdminShell';
import { Icon } from '../../src/components/Icon';
import {
  Badge,
  Body,
  Button,
  Card,
  EmptyState,
  H2,
  H3,
  Muted,
  Row,
  Spinner,
  Stat,
} from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useMaintenance } from '../../src/context/MaintenanceContext';
import { useI18n } from '../../src/i18n';
import { advertTypeColor, colors, radius, shadow, spacing, typography } from '../../src/theme/theme';
import { formatDateTime, numberFmt } from '../../src/utils/format';

function BarChart({ data, title, icon }: { data: { day: string; count: number }[]; title: string; icon: any }) {
  const max = Math.max(1, ...data.map((point) => point.count));
  const total = data.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <Card style={{ gap: spacing.md, flex: 1, minWidth: 300 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Row gap={spacing.xs} style={{ alignItems: 'center' }}>
          <Icon name={icon} size={14} color={colors.orange} />
          <H3 style={{ fontSize: 16 }}>{title}</H3>
        </Row>
        <Badge label={`${total} totaal`} tone={{ bg: colors.surfaceAlt, fg: colors.textMuted }} />
      </Row>

      <Row gap={4} style={{ alignItems: 'flex-end', height: 110, paddingTop: 10 }}>
        {data.map((point) => (
          <View
            key={point.day}
            style={{
              flex: 1,
              height: Math.max(4, (point.count / max) * 98),
              backgroundColor: point.count ? colors.orange : colors.border,
              borderRadius: radius.sm,
              opacity: point.count ? 1 : 0.4,
            }}
          />
        ))}
      </Row>

      <Row style={{ justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 }}>
        <Muted style={typography.tiny}>{data[0]?.day ?? ''}</Muted>
        <Muted style={typography.tiny}>{data[data.length - 1]?.day ?? ''}</Muted>
      </Row>
    </Card>
  );
}

export default function AdminOverviewScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { isAdmin, booting } = useAuth();
  const { maintenance, isMaintenanceActive } = useMaintenance();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [audit, setAudit] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (booting || !isAdmin) return;
    setLoading(true);
    setFailed(false);
    setErrorMessage(null);
    try {
      const [metricsRes, auditRes] = await Promise.allSettled([
        api.adminMetrics(),
        api.adminAuditLog(0, 25),
      ]);

      if (metricsRes.status === 'fulfilled') {
        setMetrics(metricsRes.value);
      } else {
        setFailed(true);
        const err = metricsRes.reason;
        setErrorMessage(err instanceof Error ? err.message : t('errors.generic'));
      }

      if (auditRes.status === 'fulfilled') {
        setAudit(auditRes.value.content);
      } else {
        setAudit([]);
      }
    } catch (err: any) {
      setFailed(true);
      setErrorMessage(err?.message || t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }, [booting, isAdmin, t]);

  useEffect(() => {
    if (!booting && isAdmin) {
      void load();
    }
  }, [booting, isAdmin, load]);

  const typeRows = useMemo(() => {
    if (!metrics) return [];
    const total = Object.values(metrics.advertsByType).reduce((sum, value) => sum + value, 0) || 1;
    return Object.entries(metrics.advertsByType).map(([type, count]) => ({
      type,
      count,
      pct: Math.round((count / total) * 100),
    }));
  }, [metrics]);

  return (
    <AdminShell
      title={t('admin.overview')}
      subtitle={t('admin.subtitle')}
      headerActions={
        <Button
          title={t('common.refresh')}
          icon="refresh"
          variant="outline"
          size="sm"
          loading={loading}
          onPress={() => void load()}
        />
      }
    >
      {loading ? (
        <Spinner />
      ) : !metrics ? (
        <Card>
          <EmptyState
            icon="warning"
            title={t('common.somethingWentWrong')}
            body={errorMessage || (failed ? t('errors.generic') : undefined)}
            action={<Button title={t('common.retry')} icon="refresh" variant="outline" onPress={() => void load()} />}
          />
        </Card>
      ) : (
        <View style={{ gap: spacing.lg }}>
          {/* Global Maintenance Alert Card */}
          {isMaintenanceActive && (
            <Card
              style={{
                backgroundColor: colors.dangerSoft,
                borderColor: colors.danger,
                borderWidth: 1.5,
                padding: spacing.md,
              }}
            >
              <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md, alignItems: 'center' }}>
                <Row gap={spacing.md} style={{ flex: 1, minWidth: 240, alignItems: 'center' }}>
                  <Badge label={t('admin.statusOffline')} tone={{ bg: colors.danger, fg: colors.white }} />
                  <View style={{ flex: 1 }}>
                    <Body style={{ fontWeight: '700', color: colors.danger }}>
                      {t('admin.maintenanceStatusActive')}
                    </Body>
                    <Muted numberOfLines={1}>
                      {maintenance?.message || t('admin.maintenanceActiveDesc')}
                    </Muted>
                  </View>
                </Row>

                <Button
                  title={t('admin.maintenance')}
                  icon="wrench"
                  size="sm"
                  variant="danger"
                  onPress={() => router.push('/admin/maintenance')}
                />
              </Row>
            </Card>
          )}

          {/* User Metrics Stats Row */}
          <View style={{ gap: spacing.sm }}>
            <Muted style={{ ...typography.tiny, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('admin.users')}
            </Muted>
            <Row gap={spacing.md} style={{ flexWrap: 'wrap' }}>
              <Stat icon="users" value={numberFmt(metrics.totalUsers, locale)} label={t('admin.totalUsers')} />
              <Stat icon="userPlus" value={numberFmt(metrics.newUsers7d, locale)} label={t('admin.newUsers')} />
              <Stat icon="checkCircle" value={numberFmt(metrics.activeUsers, locale)} label={t('admin.activeUsers')} />
              <Stat icon="ban" value={numberFmt(metrics.disabledUsers, locale)} label={t('admin.disabledUsers')} />
            </Row>
          </View>

          {/* Content & Platform Stats Row */}
          <View style={{ gap: spacing.sm }}>
            <Muted style={{ ...typography.tiny, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('admin.adverts')} & Activiteit
            </Muted>
            <Row gap={spacing.md} style={{ flexWrap: 'wrap' }}>
              <Stat icon="layers" value={numberFmt(metrics.totalAdverts, locale)} label={t('admin.totalAdverts')} />
              <Stat icon="plus" value={numberFmt(metrics.newAdverts7d, locale)} label={t('admin.newAdverts')} />
              <Stat icon="handshake" value={numberFmt(metrics.acceptedAdverts, locale)} label={t('admin.acceptedAdverts')} />
              <Stat icon="cube" value={numberFmt(metrics.totalModels, locale)} label={t('admin.totalModels')} />
              <Stat icon="eye" value={numberFmt(metrics.totalViews, locale)} label={t('admin.totalViews')} />
              <Stat icon="flag" value={numberFmt(metrics.openReports, locale)} label={t('admin.openReports')} />
            </Row>
          </View>

          {/* Charts Row */}
          <Row gap={spacing.md} style={{ flexWrap: 'wrap', alignItems: 'stretch' }}>
            <BarChart data={metrics.signupsPerDay} title={t('admin.signupsChart')} icon="userPlus" />
            <BarChart data={metrics.advertsPerDay} title={t('admin.advertsChart')} icon="layers" />
          </Row>

          {/* Advert Category Distribution */}
          <Card style={{ gap: spacing.md }}>
            <Row gap={spacing.xs} style={{ alignItems: 'center' }}>
              <Icon name="chart" size={15} color={colors.orange} />
              <H3 style={{ fontSize: 16 }}>{t('admin.byType')}</H3>
            </Row>

            <View style={{ gap: spacing.sm }}>
              {typeRows.map((row) => (
                <View key={row.type} style={{ gap: 4 }}>
                  <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Body style={{ fontWeight: '600', fontSize: 13.5 }}>{t(`advertTypes.${row.type}`)}</Body>
                    <Muted style={typography.tiny}>
                      {numberFmt(row.count, locale)} · {row.pct}%
                    </Muted>
                  </Row>
                  <View style={{ height: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, overflow: 'hidden' }}>
                    <View
                      style={{
                        height: 8,
                        width: `${Math.max(2, row.pct)}%`,
                        backgroundColor: advertTypeColor[row.type]?.fg ?? colors.orange,
                        borderRadius: radius.sm,
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </Card>

          {/* Audit Log Card */}
          <Card style={{ gap: spacing.md }}>
            <Row gap={spacing.xs} style={{ alignItems: 'center' }}>
              <Icon name="clock" size={15} color={colors.orange} />
              <H2 style={{ fontSize: 18 }}>{t('admin.auditLog')}</H2>
            </Row>

            {audit.length === 0 ? (
              <Muted>{t('admin.noAuditEntries')}</Muted>
            ) : (
              <View style={{ gap: 0 }}>
                {audit.map((entry, idx) => (
                  <Row
                    key={entry.id}
                    style={{
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 10,
                      borderBottomWidth: idx < audit.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                      flexWrap: 'wrap',
                      gap: spacing.sm,
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 200, gap: 2 }}>
                      <Body style={{ fontWeight: '600', fontSize: 13.5 }}>{entry.action}</Body>
                      <Muted style={typography.tiny}>
                        {entry.actor ?? 'system'}
                        {entry.targetType ? ` · ${entry.targetType}` : ''}
                        {entry.detail ? ` · ${entry.detail}` : ''}
                      </Muted>
                    </View>
                    <Muted style={typography.tiny}>{formatDateTime(entry.createdAt, locale)}</Muted>
                  </Row>
                ))}
              </View>
            )}
          </Card>
        </View>
      )}
    </AdminShell>
  );
}
