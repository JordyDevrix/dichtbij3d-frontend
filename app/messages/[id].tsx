import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, ApiError } from '../../src/api';
import { absoluteUrl } from '../../src/api/client';
import type { ChatMessage, Conversation } from '../../src/api/types';
import { Icon } from '../../src/components/Icon';
import { Avatar, Body, Button, Card, EmptyState, Muted, Row, Spinner } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useI18n } from '../../src/i18n';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';
import { colors, radius, shadow, spacing } from '../../src/theme/theme';
import { formatDateTime } from '../../src/utils/format';

const PAGE_SIZE = 40;
const POLL_MS = 6000;

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, locale } = useI18n();
  const { isWide } = useBreakpoint();
  const { user, booting, refreshUnread } = useAuth();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [missing, setMissing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const listRef = useRef<ScrollView>(null);
  const pinnedToBottom = useRef(true);

  const merge = useCallback((incoming: ChatMessage[]) => {
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      incoming.forEach((m) => byId.set(m.id, m));
      return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
  }, []);

  const load = useCallback(
    async (initial: boolean) => {
      if (!id || !user) return;
      try {
        const [detail, page] = await Promise.all([api.conversation(id), api.chatMessages(id, 0, PAGE_SIZE)]);
        setConversation(detail);
        setHasMore(page.totalPages > 1);
        merge(page.content);
        if (detail.unreadCount > 0 || initial) {
          await api.markConversationRead(id).catch(() => undefined);
          await refreshUnread();
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) setMissing(true);
      } finally {
        if (initial) setLoading(false);
      }
    },
    [id, merge, refreshUnread, user],
  );

  useEffect(() => {
    void load(true);
  }, [load]);

  // Light polling keeps the thread live without a websocket connection.
  useEffect(() => {
    if (!user || missing) return;
    const timer = setInterval(() => void load(false), POLL_MS);
    return () => clearInterval(timer);
  }, [load, missing, user]);

  const loadOlder = async () => {
    if (!id || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = Math.floor(messages.length / PAGE_SIZE);
      const page = await api.chatMessages(id, nextPage, PAGE_SIZE);
      pinnedToBottom.current = false;
      merge(page.content);
      setHasMore(nextPage + 1 < page.totalPages);
    } catch {
      /* keep what we already have */
    } finally {
      setLoadingMore(false);
    }
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || !id || sending) return;
    setSending(true);
    setDraft('');
    try {
      const message = await api.sendChatMessage(id, body);
      pinnedToBottom.current = true;
      merge([message]);
    } catch (err) {
      // Give the text back so nothing is lost.
      setDraft(body);
      if (err instanceof ApiError && err.status === 404) setMissing(true);
    } finally {
      setSending(false);
    }
  };

  if (booting) return null;

  if (!user)
    return (
      <Centered>
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
      </Centered>
    );

  if (missing)
    return (
      <Centered>
        <EmptyState
          icon="envelope"
          title={t('chat.notFound')}
          action={<Button title={t('chat.title')} onPress={() => router.replace('/messages')} />}
        />
      </Centered>
    );

  const peer = conversation?.peer;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 58}
    >
      {/* ----------------------------------------------------------- thread header */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Row
          gap={spacing.sm}
          style={{
            width: '100%',
            maxWidth: 760,
            alignSelf: 'center',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() => router.replace('/messages')}
            style={{ padding: 8, marginLeft: -4 }}
          >
            <Icon name="back" size={15} color={colors.textMuted} />
          </Pressable>
          {peer ? (
            <Pressable
              onPress={() => router.push(`/user/${peer.id}` as any)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}
            >
              <Avatar name={peer.displayName} uri={absoluteUrl(peer.avatarUrl)} size={34} />
              <View style={{ flex: 1 }}>
                <Body style={{ fontWeight: '700' }} numberOfLines={1}>
                  {peer.displayName}
                </Body>
                {!!peer.city && <Muted numberOfLines={1}>{peer.city}</Muted>}
              </View>
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {conversation?.advert && (
            <Button
              title={isWide ? conversation.advert.title : t('chat.about')}
              variant="outline"
              size="sm"
              icon="tag"
              onPress={() => router.push(`/advert/${conversation.advert!.id}` as any)}
              style={{ maxWidth: 280 }}
            />
          )}
        </Row>
      </View>

      {/* ----------------------------------------------------------- messages */}
      <ScrollView
        ref={listRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          width: '100%',
          maxWidth: 760,
          alignSelf: 'center',
          padding: spacing.md,
          gap: spacing.xs,
        }}
        onScroll={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          pinnedToBottom.current =
            contentOffset.y + layoutMeasurement.height >= contentSize.height - 80;
        }}
        scrollEventThrottle={100}
        onContentSizeChange={() => {
          if (pinnedToBottom.current) listRef.current?.scrollToEnd({ animated: false });
        }}
      >
        {loading ? (
          <Spinner />
        ) : (
          <>
            {hasMore && (
              <Button
                title={t('chat.older')}
                variant="ghost"
                size="sm"
                loading={loadingMore}
                onPress={() => void loadOlder()}
              />
            )}
            {messages.length === 0 && <Muted style={{ textAlign: 'center' }}>{t('chat.startHint')}</Muted>}
            {messages.map((message, index) => (
              <Bubble
                key={message.id}
                message={message}
                previous={messages[index - 1]}
                next={messages[index + 1]}
                locale={locale}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* ----------------------------------------------------------- composer */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: spacing.sm,
        }}
      >
        <Row
          gap={spacing.sm}
          style={{
            width: '100%',
            maxWidth: 760,
            alignSelf: 'center',
            paddingHorizontal: spacing.md,
            paddingTop: spacing.sm,
            alignItems: 'flex-end',
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={colors.textFaint}
            multiline
            maxLength={4000}
            onSubmitEditing={Platform.OS === 'web' ? undefined : () => void send()}
            onKeyPress={(event: any) => {
              // Enter sends, shift+enter makes a new line — the usual chat contract.
              if (Platform.OS === 'web' && event.nativeEvent?.key === 'Enter' && !event.nativeEvent?.shiftKey) {
                event.preventDefault?.();
                void send();
              }
            }}
            style={{
              flex: 1,
              minHeight: 44,
              maxHeight: 140,
              paddingHorizontal: spacing.md,
              paddingVertical: 11,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surfaceAlt,
              color: colors.ink,
              fontSize: 14,
              ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('chat.send')}
            disabled={!draft.trim() || sending}
            onPress={() => void send()}
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: draft.trim() ? colors.orange : colors.surfaceAlt,
              borderWidth: draft.trim() ? 0 : 1,
              borderColor: colors.border,
            }}
          >
            <Icon name="send" size={15} color={draft.trim() ? colors.white : colors.textFaint} />
          </Pressable>
        </Row>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Only the last bubble of a burst carries a timestamp, which keeps the thread calm. */
function endsBurst(message: ChatMessage, next?: ChatMessage) {
  if (!next || next.kind === 'SYSTEM' || next.senderId !== message.senderId) return true;
  return Date.parse(next.createdAt) - Date.parse(message.createdAt) > 5 * 60 * 1000;
}

function clock(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function Bubble({
  message,
  previous,
  next,
  locale,
}: {
  message: ChatMessage;
  previous?: ChatMessage;
  next?: ChatMessage;
  locale: string;
}) {
  if (message.kind === 'SYSTEM')
    return (
      <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
        <View
          style={{
            maxWidth: '90%',
            paddingHorizontal: spacing.md,
            paddingVertical: 6,
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>{message.body}</Text>
        </View>
      </View>
    );

  const grouped = previous?.senderId === message.senderId && previous?.kind === 'TEXT';
  return (
    <View
      style={{
        alignItems: message.mine ? 'flex-end' : 'flex-start',
        marginTop: grouped ? 2 : spacing.sm,
      }}
    >
      <View
        style={{
          maxWidth: '82%',
          paddingHorizontal: spacing.md,
          paddingVertical: 9,
          borderRadius: radius.lg,
          borderBottomRightRadius: message.mine ? 4 : radius.lg,
          borderBottomLeftRadius: message.mine ? radius.lg : 4,
          backgroundColor: message.mine ? colors.orange : colors.surface,
          borderWidth: message.mine ? 0 : 1,
          borderColor: colors.border,
          ...shadow.card,
        }}
      >
        <Text style={{ fontSize: 14, lineHeight: 20, color: message.mine ? colors.white : colors.ink }}>
          {message.body}
        </Text>
      </View>
      {endsBurst(message, next) && (
        <Text style={{ fontSize: 10, color: colors.textFaint, marginTop: 3, marginHorizontal: 4 }}>
          {isToday(message.createdAt)
            ? clock(message.createdAt, locale)
            : formatDateTime(message.createdAt, locale)}
        </Text>
      )}
    </View>
  );
}

function isToday(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center' }}>
      <Card style={{ width: '100%', maxWidth: 520, alignSelf: 'center' }}>{children}</Card>
    </View>
  );
}
