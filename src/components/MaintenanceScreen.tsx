import React, { useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from './Icon';
import { Badge, Button, Card, H1, H3, Muted, Row } from './ui';
import { useMaintenance } from '../context/MaintenanceContext';
import { useI18n } from '../i18n';
import { colors, radius, shadow, spacing, typography } from '../theme/theme';
import { formatDateTime } from '../utils/format';
import { useBreakpoint } from '../hooks/useBreakpoint';

export function MaintenanceScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { maintenance, checkMaintenance } = useMaintenance();
  const { isWide } = useBreakpoint();
  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    try {
      await checkMaintenance();
    } finally {
      setTimeout(() => setChecking(false), 400);
    }
  };

  const title = maintenance?.title?.trim() || t('maintenance.defaultTitle');
  const message = maintenance?.message?.trim() || t('maintenance.defaultMessage');
  const until = maintenance?.until;

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        backgroundColor: colors.background,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          width: '100%',
          maxWidth: 620,
          gap: spacing.xl,
          alignItems: 'center',
        }}
      >
        {/* Brand Header */}
        <Row gap={spacing.sm} style={{ alignItems: 'center' }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.md,
              backgroundColor: colors.orange,
              alignItems: 'center',
              justifyContent: 'center',
              ...shadow.card,
            }}
          >
            <Icon name="cube" size={24} color={colors.white} />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 }}>
            Dichtbij<Text style={{ color: colors.orange }}>3D</Text>
          </Text>
        </Row>

        {/* Maintenance Card */}
        <Card
          style={{
            width: '100%',
            padding: isWide ? spacing.xxl : spacing.xl,
            gap: spacing.lg,
            alignItems: 'center',
            borderColor: colors.orangeBorder,
            borderWidth: 1.5,
          }}
        >
          {/* Animated/Glowing Icon */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.orangeSoft,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: colors.orangeBorder,
            }}
          >
            <Icon name="wrench" size={36} color={colors.orange} />
          </View>

          {/* Status Badge */}
          <Badge
            label={t('maintenance.badge')}
            tone={{ bg: colors.orangeSoft, fg: colors.orangeDarker }}
          />

          {/* Title & Message */}
          <View style={{ gap: spacing.sm, alignItems: 'center' }}>
            <H1 style={{ textAlign: 'center', fontSize: isWide ? 26 : 22, color: colors.ink }}>
              {title}
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
              {message}
            </Text>
          </View>

          {/* Estimated End Time */}
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

          {/* Action Buttons */}
          <View
            style={{
              flexDirection: isWide ? 'row' : 'column',
              gap: spacing.md,
              width: '100%',
              marginTop: spacing.sm,
              justifyContent: 'center',
            }}
          >
            <Button
              title={t('maintenance.checkStatus')}
              icon="refresh"
              size="lg"
              loading={checking}
              onPress={handleRefresh}
              style={{ flex: isWide ? 1 : undefined, alignSelf: 'stretch' }}
            />
            <Button
              title={t('maintenance.adminLogin')}
              icon="userShield"
              variant="outline"
              size="lg"
              onPress={() => router.push('/auth/login')}
              style={{ flex: isWide ? 1 : undefined, alignSelf: 'stretch' }}
            />
          </View>
        </Card>

        {/* Footer note */}
        <Muted style={{ textAlign: 'center', fontSize: 12 }}>
          {t('maintenance.footerNote')}
        </Muted>
      </View>
    </ScrollView>
  );
}
