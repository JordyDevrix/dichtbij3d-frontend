import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from './Icon';
import { Button, Row } from './ui';
import { useMaintenance } from '../context/MaintenanceContext';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { colors, radius, spacing } from '../theme/theme';
import { useBreakpoint } from '../hooks/useBreakpoint';

export function AdminMaintenanceBanner() {
  const { t } = useI18n();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { isMaintenanceActive } = useMaintenance();
  const { isWide } = useBreakpoint();

  if (!isAdmin || !isMaintenanceActive) return null;

  return (
    <View
      style={{
        backgroundColor: colors.danger,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.15)',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        zIndex: 9999,
      }}
    >
      <View
        style={{
          maxWidth: 1200,
          width: '100%',
          alignSelf: 'center',
          flexDirection: isWide ? 'row' : 'column',
          alignItems: isWide ? 'center' : 'flex-start',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        <Row gap={spacing.sm} style={{ flex: 1 }}>
          <Icon name="warning" size={16} color={colors.white} />
          <Text
            style={{
              color: colors.white,
              fontSize: 13,
              fontWeight: '700',
              flex: 1,
            }}
          >
            {t('maintenance.adminWarning')}
          </Text>
        </Row>

        <Button
          title={t('maintenance.manage')}
          icon="gear"
          size="sm"
          variant="outline"
          onPress={() => router.push('/admin/maintenance')}
          style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderColor: colors.white,
            alignSelf: isWide ? 'auto' : 'flex-end',
          }}
        />
      </View>
    </View>
  );
}
