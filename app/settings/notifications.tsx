import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../../src/api';
import type { NotificationType } from '../../src/api/types';
import { Page } from '../../src/components/Page';
import { Button, Card, Chip, H1, H2, H3, Muted, Row } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { useI18n } from '../../src/i18n';
import { spacing } from '../../src/theme/theme';

const NOTIFICATION_CATEGORIES: { labelKey: string; types: NotificationType[] }[] = [
  { labelKey: 'categoryBids', types: ['BID_PLACED', 'BID_ACCEPTED', 'BID_REJECTED'] },
  { labelKey: 'categoryChat', types: ['MESSAGE_RECEIVED'] },
  { labelKey: 'categoryReactions', types: ['ADVERT_REACTION'] },
  { labelKey: 'categorySales', types: ['ADVERT_ACCEPTED', 'ADVERT_PURCHASE_REQUEST', 'MODEL_PURCHASED', 'MODEL_PURCHASE_REQUEST', 'MODEL_ACCESS_GRANTED', 'MODEL_PURCHASE_DECLINED'] },
  { labelKey: 'categorySystem', types: ['ADVERT_REMOVED', 'MODEL_SHARED', 'SYSTEM'] }
];

export default function NotificationsSettingsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { user, booting, refreshProfile } = useAuth();
  const toast = useToast();

  const [mutedNotifications, setMutedNotifications] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setMutedNotifications(user.mutedNotifications ?? []);
    }
  }, [user]);

  if (booting) return null;

  if (!user) {
    return (
      <Page>
        <Muted>{t('common.signInRequired')}</Muted>
      </Page>
    );
  }

  const save = async () => {
    setBusy(true);
    try {
      await api.updateMe({
        displayName: user.displayName,
        roles: user.roles,
        mutedNotifications: mutedNotifications as NotificationType[],
      });
      await refreshProfile();
      toast.success(t('common.save'));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page maxWidth={600}>
      <Card style={{ gap: spacing.lg }}>
        <View>
          <H1>{t('notifications.settingsTitle', 'Notification Settings')}</H1>
          <Muted>Choose which notifications you want to receive.</Muted>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
            {NOTIFICATION_CATEGORIES.map((cat) => {
              const isEnabled = !cat.types.every((type) => mutedNotifications.includes(type));
              return (
                <Chip
                  key={cat.labelKey}
                  label={t(`notifications.${cat.labelKey}` as any)}
                  selected={isEnabled}
                  onPress={() => {
                    if (isEnabled) {
                      setMutedNotifications((prev) => Array.from(new Set([...prev, ...cat.types])));
                    } else {
                      setMutedNotifications((prev) => prev.filter((t) => !cat.types.includes(t as any)));
                    }
                  }}
                />
              );
            })}
          </Row>
        </View>

        <Row style={{ justifyContent: 'flex-end', marginTop: spacing.md }}>
          <Button title={t('common.save')} icon="check" loading={busy} onPress={save} />
        </Row>
      </Card>
    </Page>
  );
}
