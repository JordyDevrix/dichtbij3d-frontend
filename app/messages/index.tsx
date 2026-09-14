import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../src/api';
import { absoluteUrl } from '../../src/api/client';
import type { Conversation } from '../../src/api/types';
import { Icon } from '../../src/components/Icon';
import { Page } from '../../src/components/Page';
import { Avatar, Body, Button, Card, EmptyState, H1, Muted, Pagination, Row, Spinner } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useI18n } from '../../src/i18n';
import { colors, radius, spacing } from '../../src/theme/theme';
import { timeAgo } from '../../src/utils/format';

export default function ConversationsScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { user, booting, refreshUnread } = useAuth();
  const [items, setItems] = useState<Conversation[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (targetPage = page) => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.conversations(targetPage, 15);
      setItems(res.content);
      setPage(res.page);
      setTotalPages(res.totalPages);
      setTotal(res.totalElements);
    } catch {
      setItems([]);
      setTotalPages(0);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [user, page]);

  // Runs on mount and every time the tab regains focus, so coming back from a
  // thread immediately shows the freshly read state.
  useFocusEffect(
    useCallback(() => {
      void load(page);
      void refreshUnread();
    }, [load, page, refreshUnread]),
  );

  if (booting) return null;

  if (!user)
    return (
      <Page maxWidth={600}>
        <Card>
          <EmptyState
            icon="envelope"
            title={t('chat.signInTitle')}
            body={t('chat.signIn')}
            action={
              <Button
                title={t('nav.login')}
                onPress={() => router.push({ pathname: '/auth/login', params: { redirect: '/messages' } })}
              />
            }
          />
        </Card>
      </Page>
    );

  return (
    <Page maxWidth={760} refreshing={loading} onRefresh={() => void load()}>
      <View style={{ gap: 4 }}>
        <H1>{t('chat.title')}</H1>
        <Muted>{t('chat.subtitle')}</Muted>
      </View>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon="envelope" title={t('chat.empty')} body={t('chat.emptyBody')} />
        </Card>
      ) : (
        <>
          <Card flat style={{ padding: 0, overflow: 'hidden' }}>
            {items.map((item, index) => (
              <ConversationRow
                key={item.id}
                conversation={item}
                first={index === 0}
                onPress={() => router.push(`/messages/${item.id}` as any)}
                timeLabel={timeAgo(item.lastMessageAt, t, locale)}
              />
            ))}
          </Card>
          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={total}
            onChange={(newPage) => setPage(newPage)}
            loading={loading}
          />
        </>
      )}
    </Page>
  );
}

function ConversationRow({
  conversation,
  first,
  onPress,
  timeLabel,
}: {
  conversation: Conversation;
  first: boolean;
  onPress: () => void;
  timeLabel: string;
}) {
  const [hovered, setHovered] = useState(false);
  const unread = conversation.unreadCount > 0;
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.border,
        backgroundColor: hovered ? colors.surfaceAlt : 'transparent',
      }}
    >
      <Avatar name={conversation.peer.displayName} uri={absoluteUrl(conversation.peer.avatarUrl)} size={42} />
      <View style={{ flex: 1, gap: 2 }}>
        <Row style={{ justifyContent: 'space-between' }} gap={spacing.sm}>
          <Body style={{ fontWeight: unread ? '700' : '600', flex: 1 }} numberOfLines={1}>
            {conversation.peer.displayName}
          </Body>
          <Muted>{timeLabel}</Muted>
        </Row>
        {conversation.advert && (
          <Row gap={5}>
            <Icon name="tag" size={10} color={colors.textFaint} />
            <Muted numberOfLines={1}>{conversation.advert.title}</Muted>
          </Row>
        )}
        <Row gap={spacing.sm} style={{ justifyContent: 'space-between' }}>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 13,
              color: unread ? colors.ink : colors.textMuted,
              fontWeight: unread ? '600' : '400',
            }}
          >
            {conversation.lastMessage ?? ''}
          </Text>
          {unread && (
            <View
              style={{
                minWidth: 20,
                height: 20,
                paddingHorizontal: 6,
                borderRadius: radius.pill,
                backgroundColor: colors.orange,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.white, fontSize: 11, fontWeight: '800' }}>
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Text>
            </View>
          )}
        </Row>
      </View>
    </Pressable>
  );
}
