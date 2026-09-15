import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../src/api';
import { absoluteUrl } from '../../src/api/client';
import type { Conversation } from '../../src/api/types';
import { Icon } from '../../src/components/Icon';
import { Page } from '../../src/components/Page';
import { Avatar, Badge, Body, Button, Card, EmptyState, H1, Muted, Pagination, Row, Spinner } from '../../src/components/ui';
import { UserSearchModal } from '../../src/components/UserSearchModal';
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
  const [searchModalOpen, setSearchModalOpen] = useState(false);

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
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }} gap={spacing.md}>
        <View style={{ gap: 4, flex: 1 }}>
          <H1>{t('chat.title')}</H1>
          <Muted>{t('chat.subtitle')}</Muted>
        </View>
        <Button
          title={t('chat.newChat')}
          icon="plus"
          size="sm"
          onPress={() => setSearchModalOpen(true)}
        />
      </Row>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon="envelope"
            title={t('chat.empty')}
            body={t('chat.emptyBody')}
            action={
              <Button
                title={t('chat.collaborate')}
                icon="users"
                onPress={() => setSearchModalOpen(true)}
              />
            }
          />
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

      <UserSearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        mode="new-chat"
        onChatCreated={() => void load(0)}
      />
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
  const { t } = useI18n();
  const [hovered, setHovered] = useState(false);
  const unread = conversation.unreadCount > 0;
  const isGroup = !!conversation.isGroup || !!conversation.title || (conversation.participants && conversation.participants.length > 2);

  const displayTitle = conversation.title ||
    (isGroup && conversation.participants && conversation.participants.length > 0
      ? conversation.participants.map((p) => p.displayName).join(', ')
      : conversation.peer.displayName);

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
      {isGroup ? (
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: radius.pill,
            backgroundColor: colors.orangeSoft,
            borderWidth: 1,
            borderColor: colors.orangeBorder,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="users" size={17} color={colors.orange} />
        </View>
      ) : (
        <Avatar name={conversation.peer.displayName} uri={absoluteUrl(conversation.peer.avatarUrl)} size={42} />
      )}

      <View style={{ flex: 1, gap: 2 }}>
        <Row style={{ justifyContent: 'space-between' }} gap={spacing.sm}>
          <Row gap={spacing.xs} style={{ flex: 1, alignItems: 'center' }}>
            <Body style={{ fontWeight: unread ? '700' : '600', flexShrink: 1 }} numberOfLines={1}>
              {displayTitle}
            </Body>
            {isGroup && (
              <Badge
                label={
                  conversation.participants && conversation.participants.length > 0
                    ? `${conversation.participants.length} ${t('chat.participantsCount')}`
                    : t('chat.collaborators')
                }
                tone={{ bg: colors.orangeSoft, fg: colors.orangeDark }}
              />
            )}
          </Row>
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
