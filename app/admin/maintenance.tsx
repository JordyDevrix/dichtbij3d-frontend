import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { api, ApiError } from '../../src/api';
import type { MaintenanceStatus } from '../../src/api/types';
import { AdminShell } from '../../src/components/AdminShell';
import { Icon } from '../../src/components/Icon';
import {
  Badge,
  Body,
  Button,
  Card,
  Chip,
  H1,
  H2,
  H3,
  Input,
  Muted,
  Row,
  Spinner,
  SwitchRow,
} from '../../src/components/ui';
import { useMaintenance } from '../../src/context/MaintenanceContext';
import { useToast } from '../../src/context/ToastContext';
import { useI18n } from '../../src/i18n';
import { colors, radius, shadow, spacing, typography } from '../../src/theme/theme';
import { formatDateTime } from '../../src/utils/format';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';

export default function AdminMaintenanceScreen() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const { setMaintenance } = useMaintenance();
  const { isWide } = useBreakpoint();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [until, setUntil] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = await api.adminMaintenance();
      setEnabled(status.enabled);
      setTitle(status.title || '');
      setMessage(status.message || '');
      setUntil(status.until);
      setMaintenance(status);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }, [t, toast, setMaintenance]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async (overrideEnabled?: boolean) => {
    setSaving(true);
    const targetEnabled = overrideEnabled !== undefined ? overrideEnabled : enabled;
    try {
      const updated = await api.adminUpdateMaintenance({
        enabled: targetEnabled,
        title: title.trim() || null,
        message: message.trim() || null,
        until: until || null,
      });
      setEnabled(updated.enabled);
      setTitle(updated.title || '');
      setMessage(updated.message || '');
      setUntil(updated.until);
      setMaintenance(updated);
      toast.success(
        targetEnabled
          ? t('admin.maintenanceActivated')
          : t('admin.maintenanceDeactivated'),
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  const setPresetDuration = (hours: number) => {
    const target = new Date(Date.now() + hours * 3600 * 1000);
    setUntil(target.toISOString());
  };

  return (
    <AdminShell>
      {loading ? (
        <Spinner />
      ) : (
        <View style={{ gap: spacing.xl }}>
          <View style={{ gap: 4 }}>
            <H2>{t('admin.maintenanceTitle')}</H2>
            <Muted>{t('admin.maintenanceSubtitle')}</Muted>
          </View>

          {/* Current Status Overview Banner */}
          <Card
            style={{
              backgroundColor: enabled ? colors.dangerSoft : colors.orangeSofter,
              borderColor: enabled ? colors.danger : colors.orangeBorder,
              borderWidth: 1.5,
              gap: spacing.md,
            }}
          >
            <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md }}>
              <Row gap={spacing.md} style={{ flex: 1, minWidth: 260 }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: radius.md,
                    backgroundColor: enabled ? colors.danger : colors.orange,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon
                    name={enabled ? 'powerOff' : 'checkCircle'}
                    size={24}
                    color={colors.white}
                  />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Row gap={spacing.xs}>
                    <H3 style={{ color: colors.ink }}>
                      {enabled
                        ? t('admin.maintenanceStatusActive')
                        : t('admin.maintenanceStatusInactive')}
                    </H3>
                    <Badge
                      label={enabled ? t('admin.statusOffline') : t('admin.statusOnline')}
                      tone={
                        enabled
                          ? { bg: colors.danger, fg: colors.white }
                          : { bg: colors.orange, fg: colors.white }
                      }
                    />
                  </Row>
                  <Muted style={{ color: colors.textMuted }}>
                    {enabled
                      ? t('admin.maintenanceActiveDesc')
                      : t('admin.maintenanceInactiveDesc')}
                  </Muted>
                </View>
              </Row>

              <Button
                title={
                  enabled
                    ? t('admin.deactivateMaintenance')
                    : t('admin.activateMaintenance')
                }
                icon={enabled ? 'check' : 'powerOff'}
                variant={enabled ? 'outline' : 'danger'}
                loading={saving}
                onPress={() => {
                  const nextState = !enabled;
                  setEnabled(nextState);
                  void handleSave(nextState);
                }}
              />
            </Row>
          </Card>

          {/* Settings Form Card */}
          <Card style={{ gap: spacing.lg }}>
            <H3>{t('admin.maintenanceSettings')}</H3>

            <SwitchRow
              label={t('admin.maintenanceToggleLabel')}
              hint={t('admin.maintenanceToggleHint')}
              value={enabled}
              onValueChange={setEnabled}
            />

            <View style={{ height: 1, backgroundColor: colors.border }} />

            <Input
              label={t('admin.maintenanceHeadingLabel')}
              value={title}
              onChangeText={setTitle}
              placeholder="Tijdelijk offline voor onderhoud"
              icon="wrench"
            />

            <Input
              label={t('admin.maintenanceMessageLabel')}
              hint={t('admin.maintenanceMessageHint')}
              value={message}
              onChangeText={setMessage}
              placeholder="Dichtbij3D is momenteel niet bereikbaar wegens gepland onderhoud. We zijn zo snel mogelijk weer terug!"
              multiline
            />

            {/* Estimated Completion Time */}
            <View style={{ gap: spacing.sm }}>
              <Text style={typography.label}>{t('admin.maintenanceUntilLabel')}</Text>
              <Muted>{t('admin.maintenanceUntilHint')}</Muted>

              <Row gap={spacing.xs} style={{ flexWrap: 'wrap', marginVertical: spacing.xs }}>
                <Chip
                  label="+30 min"
                  size="sm"
                  onPress={() => setPresetDuration(0.5)}
                />
                <Chip
                  label="+1 uur"
                  size="sm"
                  onPress={() => setPresetDuration(1)}
                />
                <Chip
                  label="+2 uur"
                  size="sm"
                  onPress={() => setPresetDuration(2)}
                />
                <Chip
                  label="+4 uur"
                  size="sm"
                  onPress={() => setPresetDuration(4)}
                />
                <Chip
                  label="+12 uur"
                  size="sm"
                  onPress={() => setPresetDuration(12)}
                />
                <Chip
                  label="+24 uur"
                  size="sm"
                  onPress={() => setPresetDuration(24)}
                />
                {until && (
                  <Chip
                    label={t('admin.clearUntil')}
                    size="sm"
                    tone={{ bg: colors.surfaceAlt, fg: colors.danger }}
                    onPress={() => setUntil(null)}
                  />
                )}
              </Row>

              <Input
                value={until || ''}
                onChangeText={(val) => setUntil(val.trim() || null)}
                placeholder="ISO-8601 formaat (bijv. 2026-09-16T12:00:00Z)"
                icon="clock"
              />

              {until && (
                <Muted style={{ color: colors.orangeDarker }}>
                  {t('maintenance.estimatedUntil')}: {formatDateTime(until, locale)}
                </Muted>
              )}
            </View>

            <Row style={{ justifyContent: 'flex-end', marginTop: spacing.md }}>
              <Button
                title={t('common.save')}
                icon="check"
                loading={saving}
                onPress={() => handleSave()}
              />
            </Row>
          </Card>

          {/* Live Preview of visitor screen */}
          <View style={{ gap: spacing.md }}>
            <H3>{t('admin.livePreview')}</H3>
            <Muted>{t('admin.livePreviewDesc')}</Muted>

            <Card
              style={{
                backgroundColor: colors.background,
                padding: isWide ? spacing.xxl : spacing.xl,
                gap: spacing.lg,
                alignItems: 'center',
                borderColor: colors.orangeBorder,
                borderWidth: 1.5,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: colors.orangeSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: colors.orangeBorder,
                }}
              >
                <Icon name="wrench" size={28} color={colors.orange} />
              </View>

              <View style={{ gap: spacing.sm, alignItems: 'center' }}>
                <H1 style={{ textAlign: 'center', fontSize: 22, color: colors.ink }}>
                  {title.trim() || t('maintenance.defaultTitle')}
                </H1>
                <Text
                  style={{
                    ...typography.body,
                    textAlign: 'center',
                    color: colors.textMuted,
                    lineHeight: 22,
                    maxWidth: 480,
                  }}
                >
                  {message.trim() || t('maintenance.defaultMessage')}
                </Text>
              </View>

              {until && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    backgroundColor: colors.surfaceAlt,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Icon name="clock" size={15} color={colors.orange} />
                  <Muted style={{ fontWeight: '600', color: colors.ink }}>
                    {t('maintenance.estimatedUntil')}:{' '}
                    <Text style={{ color: colors.orangeDarker }}>
                      {formatDateTime(until, locale)}
                    </Text>
                  </Muted>
                </View>
              )}

              <Row gap={spacing.md} style={{ marginTop: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button
                  title={t('maintenance.checkStatus')}
                  icon="refresh"
                  size="md"
                  disabled
                />
                <Button
                  title={t('maintenance.adminLogin')}
                  icon="userShield"
                  variant="outline"
                  size="md"
                  disabled
                />
              </Row>
            </Card>
          </View>
        </View>
      )}
    </AdminShell>
  );
}
