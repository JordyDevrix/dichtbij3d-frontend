import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../src/api';
import type { AppNotification, NotificationType } from '../src/api/types';
import { Icon, IconName } from '../src/components/Icon';
import { Page } from '../src/components/Page';
import { Badge, Body, Button, Card, EmptyState, H1, Muted, Row, Spinner } from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';
import { useI18n } from '../src/i18n';
import { useBreakpoint } from '../src/hooks/useBreakpoint';
import { colors, radius, spacing } from '../src/theme/theme';
import { timeAgo } from '../src/utils/format';

const TYPE_ICON: Record<NotificationType, IconName> = {
  ADVERT_REACTION: 'comments',
  ADVERT_ACCEPTED: 'handshake',
  ADVERT_REMOVED: 'trash',
  BID_PLACED: 'gavel',
  ADVERT_PURCHASE_REQUEST: 'cart',
  BID_ACCEPTED: 'checkCircle',
  BID_REJECTED: 'ban',
  MODEL_PURCHASED: 'coins',
  MODEL_PURCHASE_REQUEST: 'cart',
  MODEL_ACCESS_GRANTED: 'checkCircle',
  MODEL_PURCHASE_DECLINED: 'ban',
  MODEL_SHARED: 'share',
  MESSAGE_RECEIVED: 'envelope',
  ACCOUNT_DISABLED: 'ban',
  ACCOUNT_ENABLED: 'checkCircle',
  SYSTEM: 'info',
};

const TYPE_TONE: Partial<Record<NotificationType, string>> = {
  ADVERT_REMOVED: colors.danger,
  ACCOUNT_DISABLED: colors.danger,
  BID_REJECTED: colors.danger,
  ADVERT_ACCEPTED: colors.success,
  BID_ACCEPTED: colors.success,
  ACCOUNT_ENABLED: colors.success,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { isWide } = useBreakpoint();
  const { user, booting, refreshUnread } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const page = await api.notifications(0, 50);
      setItems(page.content);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (booting) return null;

  if (!user)
    return (
      <Page maxWidth={600}>
        <Card>
          <EmptyState
            icon="bell"
            title={t('common.signInRequired')}
            body={t('common.signInRequiredBody')}
            action={
              <Button
                title={t('nav.login')}
                onPress={() => router.push({ pathname: '/auth/login', params: { redirect: '/notifications' } })}
              />
            }
          />
        </Card>
      </Page>
    );

  const unread = items.filter((item) => !item.readAt).length;

  const open = async (item: AppNotification) => {
    if (!item.readAt) {
      await api.markRead(item.id).catch(() => undefined);
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n)));
      await refreshUnread();
    }
    if (item.link) router.push(item.link as any);
  };

  return (
    <Page maxWidth={820} refreshing={loading} onRefresh={() => void load()}>
      <View style={{ flexDirection: isWide ? 'row' : 'column', justifyContent: 'space-between', gap: spacing.md, alignItems: isWide ? 'center' : 'stretch' }}>
        <Row gap={spacing.sm}>
          <H1>{t('notifications.title')}</H1>
          {unread > 0 && (
            <Badge label={`${unread} ${t('notifications.unread')}`} tone={{ bg: colors.orange, fg: colors.white }} />
          )}
        </Row>
        {unread > 0 && (
          <Button
            title={t('notifications.markAllRead')}
            icon="check"
            variant="outline"
            size="sm"
            onPress={async () => {
              await api.markAllRead();
              await load();
              await refreshUnread();
            }}
          />
        )}
      </View>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon="bell" title={t('notifications.empty')} />
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {items.map((item) => {
            const tone = TYPE_TONE[item.type] ?? colors.orange;
            return (
              <Pressable key={item.id} onPress={() => void open(item)}>
                <Card
                  style={{
                    borderColor: item.readAt ? colors.border : colors.orangeBorder,
                    backgroundColor: item.readAt ? colors.surface : colors.orangeSofter,
                  }}
                >
                  <Row style={{ alignItems: 'flex-start' }}>
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: radius.md,
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name={TYPE_ICON[item.type] ?? 'info'} size={14} color={tone} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Body style={{ fontWeight: '700', flex: 1 }}>{item.title}</Body>
                        <Muted>{timeAgo(item.createdAt, t, locale)}</Muted>
                      </Row>
                      {item.body ? <Muted>{item.body}</Muted> : null}
                    </View>
                    <Pressable
                      onPress={async () => {
                        await api.deleteNotification(item.id).catch(() => undefined);
                        setItems((prev) => prev.filter((n) => n.id !== item.id));
                        await refreshUnread();
                      }}
                      style={{ padding: 6 }}
                    >
                      <Icon name="close" size={12} color={colors.textFaint} />
                    </Pressable>
                  </Row>
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
    </Page>
  );
}
