import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { api } from '../../src/api';
import type { AdminMetrics, AuditLogEntry } from '../../src/api/types';
import { AdminShell } from '../../src/components/AdminShell';
import { Body, Card, H2, H3, Muted, Row, Spinner, Stat } from '../../src/components/ui';
import { useI18n } from '../../src/i18n';
import { advertTypeColor, colors, radius, spacing } from '../../src/theme/theme';
import { formatDateTime, numberFmt } from '../../src/utils/format';

function BarChart({ data, title }: { data: { day: string; count: number }[]; title: string }) {
  const max = Math.max(1, ...data.map((point) => point.count));
  return (
    <Card style={{ gap: spacing.md, flexGrow: 1, flexBasis: 340 }}>
      <H3>{title}</H3>
      <Row gap={3} style={{ alignItems: 'flex-end', height: 120 }}>
        {data.map((point) => (
          <View
            key={point.day}
            style={{
              flex: 1,
              height: Math.max(3, (point.count / max) * 118),
              backgroundColor: point.count ? colors.orange : colors.border,
              borderRadius: 2,
            }}
          />
        ))}
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        <Muted>{data[0]?.day ?? ''}</Muted>
        <Muted>{data[data.length - 1]?.day ?? ''}</Muted>
      </Row>
    </Card>
  );
}

export default function AdminOverviewScreen() {
  const { t, locale } = useI18n();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [audit, setAudit] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.adminMetrics(), api.adminAuditLog(0, 25)])
      .then(([m, log]) => {
        setMetrics(m);
        setAudit(log.content);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

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
    <AdminShell>
      {loading || !metrics ? (
        <Spinner />
      ) : (
        <>
          <Row gap={spacing.md} style={{ flexWrap: 'wrap' }}>
            <Stat icon="users" value={numberFmt(metrics.totalUsers, locale)} label={t('admin.totalUsers')} />
            <Stat icon="userPlus" value={numberFmt(metrics.newUsers7d, locale)} label={t('admin.newUsers')} />
            <Stat icon="checkCircle" value={numberFmt(metrics.activeUsers, locale)} label={t('admin.activeUsers')} />
            <Stat icon="ban" value={numberFmt(metrics.disabledUsers, locale)} label={t('admin.disabledUsers')} />
          </Row>
          <Row gap={spacing.md} style={{ flexWrap: 'wrap' }}>
            <Stat icon="layers" value={numberFmt(metrics.totalAdverts, locale)} label={t('admin.totalAdverts')} />
            <Stat icon="plus" value={numberFmt(metrics.newAdverts7d, locale)} label={t('admin.newAdverts')} />
            <Stat icon="handshake" value={numberFmt(metrics.acceptedAdverts, locale)} label={t('admin.acceptedAdverts')} />
            <Stat icon="cube" value={numberFmt(metrics.totalModels, locale)} label={t('admin.totalModels')} />
            <Stat icon="eye" value={numberFmt(metrics.totalViews, locale)} label={t('admin.totalViews')} />
            <Stat icon="flag" value={numberFmt(metrics.openReports, locale)} label={t('admin.openReports')} />
          </Row>

          <Row gap={spacing.lg} style={{ flexWrap: 'wrap', alignItems: 'stretch' }}>
            <BarChart data={metrics.signupsPerDay} title={t('admin.signupsChart')} />
            <BarChart data={metrics.advertsPerDay} title={t('admin.advertsChart')} />
          </Row>

          <Card style={{ gap: spacing.md }}>
            <H3>{t('admin.byType')}</H3>
            {typeRows.map((row) => (
              <View key={row.type} style={{ gap: 4 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Body>{t(`advertTypes.${row.type}`)}</Body>
                  <Muted>
                    {numberFmt(row.count, locale)} · {row.pct}%
                  </Muted>
                </Row>
                <View style={{ height: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm }}>
                  <View
                    style={{
                      height: 8,
                      width: `${row.pct}%`,
                      backgroundColor: advertTypeColor[row.type]?.fg ?? colors.orange,
                      borderRadius: radius.sm,
                    }}
                  />
                </View>
              </View>
            ))}
          </Card>

          <Card style={{ gap: spacing.sm }}>
            <H2>{t('admin.auditLog')}</H2>
            {audit.length === 0 ? (
              <Muted>{t('admin.noAuditEntries')}</Muted>
            ) : (
              audit.map((entry) => (
                <Row
                  key={entry.id}
                  style={{
                    justifyContent: 'space-between',
                    paddingVertical: 6,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    flexWrap: 'wrap',
                    gap: spacing.sm,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Body style={{ fontWeight: '600' }}>{entry.action}</Body>
                    <Muted>
                      {entry.actor ?? 'system'}
                      {entry.targetType ? ` · ${entry.targetType}` : ''}
                      {entry.detail ? ` · ${entry.detail}` : ''}
                    </Muted>
                  </View>
                  <Muted>{formatDateTime(entry.createdAt, locale)}</Muted>
                </Row>
              ))
            )}
          </Card>
        </>
      )}
    </AdminShell>
  );
}
