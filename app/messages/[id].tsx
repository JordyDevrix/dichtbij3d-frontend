import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { Avatar, Badge, Body, Button, Card, EmptyState, IconButton, Muted, Row, Sheet, Spinner } from '../../src/components/ui';
import { UserSearchModal } from '../../src/components/UserSearchModal';
import { MaintenanceScreen } from '../../src/components/MaintenanceScreen';
import { useMaintenance } from '../../src/context/MaintenanceContext';
import { useAuth } from '../../src/context/AuthContext';
import { useI18n } from '../../src/i18n';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';
import { colors, radius, shadow, spacing } from '../../src/theme/theme';
import { formatDateTime } from '../../src/utils/format';
import { pickAndUploadFiles } from '../../src/utils/upload';
import { downloadFile } from '../../src/utils/download';
import { useToast } from '../../src/context/ToastContext';
import { useHeaderScroll } from '../../src/context/HeaderScrollContext';

const PAGE_SIZE = 40;
const POLL_MS = 6000;

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, locale } = useI18n();
  const { isWide } = useBreakpoint();
  const { user, isAdmin, booting, refreshUnread } = useAuth();
  const { isMaintenanceActive } = useMaintenance();
  const { headerHeight: contextHeaderHeight } = useHeaderScroll();
  const headerHeight = contextHeaderHeight > 0 ? contextHeaderHeight : insets.top + 58;

  const toast = useToast();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [missing, setMissing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [addCollaboratorOpen, setAddCollaboratorOpen] = useState(false);
  const [participantsListOpen, setParticipantsListOpen] = useState(false);
  const [processingInvite, setProcessingInvite] = useState<'accept' | 'decline' | null>(null);

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

  const handleAcceptInvite = async () => {
    if (!id || processingInvite) return;
    setProcessingInvite('accept');
    try {
      const updated = await api.acceptInvite(id);
      setConversation(updated);
      toast.success(t('chat.inviteAccepted'));
      void load(false);
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setProcessingInvite(null);
    }
  };

  const handleDeclineInvite = async () => {
    if (!id || processingInvite) return;
    setProcessingInvite('decline');
    try {
      await api.declineInvite(id);
      toast.success(t('chat.inviteDeclined'));
      router.replace('/messages');
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
      setProcessingInvite(null);
    }
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || !id || sending || conversation?.myStatus === 'INVITED') return;
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

  const attachFile = async () => {
    if (!id || uploadingFile || conversation?.myStatus === 'INVITED') return;
    setUploadingFile(true);
    try {
      const uploads = await pickAndUploadFiles('chat');
      if (uploads.length > 0) {
        for (const upload of uploads) {
          const message = await api.sendChatMessage(id, {
            kind: 'FILE',
            fileName: upload.fileName,
            fileSize: upload.sizeBytes,
            objectKey: upload.objectKey,
            body: upload.fileName,
          });
          pinnedToBottom.current = true;
          merge([message]);
        }
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      await downloadFile(url, fileName);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    }
  };

  if (booting) return null;

  if (isMaintenanceActive && !isAdmin) {
    return <MaintenanceScreen />;
  }

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
  const isGroup = !!conversation?.isGroup || !!conversation?.title || ((conversation?.participants?.length ?? 0) > 2);
  const displayTitle = conversation?.title ||
    (isGroup && conversation?.participants && conversation.participants.length > 0
      ? conversation.participants.filter((p) => p.id !== user?.id).map((p) => p.displayName).join(', ')
      : peer?.displayName);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: headerHeight }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
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
            alignItems: 'center',
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
          {isGroup ? (
            <Pressable
              onPress={() => setParticipantsListOpen(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                flex: 1,
                ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null),
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.pill,
                  backgroundColor: colors.orangeSoft,
                  borderWidth: 1,
                  borderColor: colors.orangeBorder,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="users" size={16} color={colors.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Body style={{ fontWeight: '700' }} numberOfLines={1}>
                  {displayTitle}
                </Body>
                <Row gap={4} style={{ alignItems: 'center' }}>
                  <Muted numberOfLines={1} style={{ fontSize: 12 }}>
                    {conversation?.participants?.length ?? 0} {t('chat.participantsCount')}
                  </Muted>
                  <Icon name="chevronDown" size={10} color={colors.textMuted} />
                </Row>
              </View>
            </Pressable>
          ) : peer ? (
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

          {isWide ? (
            <Button
              title={t('chat.addCollaborator')}
              variant="outline"
              size="sm"
              icon="userPlus"
              onPress={() => setAddCollaboratorOpen(true)}
            />
          ) : (
            <IconButton
              name="userPlus"
              label={t('chat.addCollaborator')}
              onPress={() => setAddCollaboratorOpen(true)}
            />
          )}

          {conversation?.advert && (
            <Button
              title={isWide ? conversation.advert.title : t('chat.about')}
              variant="outline"
              size="sm"
              icon="tag"
              onPress={() => router.push(`/advert/${conversation.advert!.id}` as any)}
              style={{ maxWidth: 220 }}
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
                isGroup={isGroup}
                onDownload={handleDownload}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* ----------------------------------------------------------- composer or invite banner */}
      {conversation?.myStatus === 'INVITED' ? (
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 760,
              alignSelf: 'center',
              backgroundColor: colors.infoSoft,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.info,
              padding: spacing.md,
              gap: spacing.sm,
            }}
          >
            <Row gap={spacing.xs} style={{ alignItems: 'center' }}>
              <Icon name="envelope" size={18} color={colors.info} />
              <Body style={{ fontWeight: '700', color: colors.info }}>
                {t('chat.inviteTitle')}
              </Body>
            </Row>
            <Text style={{ fontSize: 13, color: colors.text, lineHeight: 18 }}>
              {t('chat.inviteSubtitle')}
            </Text>
            <Row gap={spacing.sm} style={{ marginTop: spacing.xs, justifyContent: 'flex-end' }}>
              <Button
                title={t('chat.declineInvite')}
                variant="outline"
                size="sm"
                icon="close"
                loading={processingInvite === 'decline'}
                disabled={processingInvite !== null}
                onPress={() => void handleDeclineInvite()}
                style={{ borderColor: colors.border }}
              />
              <Button
                title={t('chat.acceptInvite')}
                size="sm"
                icon="check"
                loading={processingInvite === 'accept'}
                disabled={processingInvite !== null}
                onPress={() => void handleAcceptInvite()}
              />
            </Row>
          </View>
        </View>
      ) : (
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('chat.attachFile')}
              disabled={uploadingFile || sending}
              onPress={() => void attachFile()}
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.lg,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surfaceAlt,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: uploadingFile ? 0.6 : 1,
                flexShrink: 0,
                ...(Platform.OS === 'web' ? ({ boxSizing: 'border-box' } as any) : null),
              }}
            >
              {uploadingFile ? (
                <ActivityIndicator size="small" color={colors.orange} />
              ) : (
                <Icon name="cube" size={17} color={colors.orange} />
              )}
            </Pressable>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t('chat.placeholder')}
              placeholderTextColor={colors.textFaint}
              multiline
              numberOfLines={1}
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
                paddingTop: 10,
                paddingBottom: 10,
                lineHeight: 20,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surfaceAlt,
                color: colors.ink,
                fontSize: 14,
                textAlignVertical: 'center',
                ...(Platform.OS === 'web'
                  ? ({
                      outlineStyle: 'none',
                      boxSizing: 'border-box',
                      resize: 'none',
                      height: draft.includes('\n') ? undefined : 44,
                    } as any)
                  : null),
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
                borderWidth: 1,
                borderColor: draft.trim() ? colors.orange : colors.border,
                flexShrink: 0,
                ...(Platform.OS === 'web' ? ({ boxSizing: 'border-box' } as any) : null),
              }}
            >
              <Icon name="send" size={15} color={draft.trim() ? colors.white : colors.textFaint} />
            </Pressable>
          </Row>
        </View>
      )}

      {/* ----------------------------------------------------------- participants sheet */}
      <Sheet
        open={participantsListOpen}
        onClose={() => setParticipantsListOpen(false)}
        title={t('chat.collaborators')}
        width={480}
      >
        <View style={{ gap: spacing.md }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Muted style={{ fontSize: 13 }}>
              {conversation?.participants?.length ?? 0} {t('chat.participantsCount')}
            </Muted>
            <Button
              title={t('chat.addCollaborator')}
              variant="outline"
              size="sm"
              icon="userPlus"
              onPress={() => {
                setParticipantsListOpen(false);
                setAddCollaboratorOpen(true);
              }}
            />
          </Row>

          <View style={{ gap: spacing.xs }}>
            {conversation?.participants?.map((p) => {
              const detail = conversation.participantDetails?.find((d) => d.user.id === p.id);
              const isInvited = detail?.status === 'INVITED';
              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    setParticipantsListOpen(false);
                    router.push(`/user/${p.id}` as any);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.sm,
                    borderRadius: radius.md,
                    backgroundColor: colors.surfaceAlt,
                  }}
                >
                  <Row gap={spacing.sm} style={{ alignItems: 'center', flex: 1 }}>
                    <Avatar name={p.displayName} uri={absoluteUrl(p.avatarUrl)} size={36} />
                    <View style={{ flex: 1 }}>
                      <Row gap={spacing.xs} style={{ alignItems: 'center' }}>
                        <Body style={{ fontWeight: '600' }} numberOfLines={1}>
                          {p.displayName}
                        </Body>
                        {p.id === user?.id && (
                          <Muted style={{ fontSize: 11 }}>(jij)</Muted>
                        )}
                      </Row>
                      {!!p.city && (
                        <Muted style={{ fontSize: 11 }}>{p.city}</Muted>
                      )}
                    </View>
                  </Row>

                  <View>
                    {isInvited ? (
                      <Badge
                        label={t('chat.invitedStatus')}
                        tone={{ bg: colors.infoSoft, fg: colors.info }}
                      />
                    ) : (
                      <Badge
                        label={t('chat.joinedStatus')}
                        tone={{ bg: colors.surface, fg: colors.textMuted }}
                      />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Sheet>

      <UserSearchModal
        open={addCollaboratorOpen}
        onClose={() => setAddCollaboratorOpen(false)}
        mode="add-to-chat"
        conversationId={typeof id === 'string' ? id : undefined}
        existingParticipantIds={
          conversation?.participants?.map((p) => p.id) ||
          ([conversation?.peer.id].filter(Boolean) as string[])
        }
        onParticipantAdded={(updated) => {
          setConversation(updated);
          void load(false);
        }}
      />
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
  isGroup,
  onDownload,
}: {
  message: ChatMessage;
  previous?: ChatMessage;
  next?: ChatMessage;
  locale: string;
  isGroup?: boolean;
  onDownload?: (url: string, fileName: string) => void;
}) {
  const { t } = useI18n();

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

  const grouped = previous?.senderId === message.senderId && previous?.kind === message.kind;
  const isMine = message.mine;

  if (message.kind === 'FILE') {
    const fileName = message.fileName || message.body;
    return (
      <View
        style={{
          alignItems: isMine ? 'flex-end' : 'flex-start',
          marginTop: grouped ? 2 : spacing.sm,
        }}
      >
        {!isMine && !grouped && isGroup && message.sender && (
          <Row gap={6} style={{ alignItems: 'center', marginBottom: 2, marginLeft: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>
              {message.sender.displayName}
            </Text>
            {message.sender.roles?.includes('MODELLER' as any) && (
              <Badge label={t('chat.designers')} tone={{ bg: colors.violetSoft, fg: colors.violet }} />
            )}
            {message.sender.roles?.includes('PRINTER' as any) && (
              <Badge label={t('chat.printers')} tone={{ bg: colors.orangeSoft, fg: colors.orangeDark }} />
            )}
          </Row>
        )}
        <View
          style={{
            maxWidth: '82%',
            padding: spacing.sm,
            borderRadius: radius.lg,
            borderBottomRightRadius: isMine ? 4 : radius.lg,
            borderBottomLeftRadius: isMine ? radius.lg : 4,
            backgroundColor: isMine ? colors.orangeSofter : colors.surface,
            borderWidth: 1,
            borderColor: isMine ? colors.orangeBorder : colors.border,
            gap: spacing.xs,
            ...shadow.card,
          }}
        >
          <Row gap={spacing.sm} style={{ alignItems: 'center' }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.md,
                backgroundColor: isMine ? colors.surface : colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="cube" size={18} color={colors.orange} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Body style={{ fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                {fileName}
              </Body>
              {message.fileSize ? (
                <Muted style={{ fontSize: 11 }}>
                  {(message.fileSize / 1024 / 1024).toFixed(1)} MB
                </Muted>
              ) : null}
            </View>
          </Row>
          {message.body && message.body !== fileName && (
            <Text style={{ fontSize: 13, color: colors.ink }}>{message.body}</Text>
          )}
          <Button
            title={t('chat.downloadFile')}
            icon="download"
            size="sm"
            variant="outline"
            onPress={() => {
              const url =
                message.fileUrl ||
                api.chatFileDownloadUrl(message.conversationId, message.id);
              onDownload?.(url, fileName);
            }}
          />
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

  return (
    <View
      style={{
        alignItems: message.mine ? 'flex-end' : 'flex-start',
        marginTop: grouped ? 2 : spacing.sm,
      }}
    >
      {!isMine && !grouped && isGroup && message.sender && (
        <Row gap={6} style={{ alignItems: 'center', marginBottom: 2, marginLeft: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>
            {message.sender.displayName}
          </Text>
          {message.sender.roles?.includes('MODELLER' as any) && (
            <Badge label={t('chat.designers')} tone={{ bg: colors.violetSoft, fg: colors.violet }} />
          )}
          {message.sender.roles?.includes('PRINTER' as any) && (
            <Badge label={t('chat.printers')} tone={{ bg: colors.orangeSoft, fg: colors.orangeDark }} />
          )}
        </Row>
      )}
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
    <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center', alignItems: 'center' }}>
      <Card style={{ width: '100%', maxWidth: 520, alignSelf: 'center' }}>{children}</Card>
    </View>
  );
}
