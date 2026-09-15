import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../api';
import { absoluteUrl } from '../api/client';
import type { Conversation, PublicUser, Role } from '../api/types';
import { Icon } from './Icon';
import { Avatar, Badge, Body, Button, Card, EmptyState, H3, Muted, Row, Sheet, Spinner } from './ui';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { useToast } from '../context/ToastContext';
import { colors, radius, shadow, spacing, typography } from '../theme/theme';

export interface UserSearchModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'add-to-chat' | 'new-chat';
  conversationId?: string;
  existingParticipantIds?: string[];
  advertId?: string;
  onParticipantAdded?: (conversation: Conversation) => void;
  onChatCreated?: (conversation: Conversation) => void;
}

export function UserSearchModal({
  open,
  onClose,
  mode,
  conversationId,
  existingParticipantIds = [],
  advertId,
  onParticipantAdded,
  onChatCreated,
}: UserSearchModalProps) {
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const { user: currentUser } = useAuth();

  const [query, setQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(false);

  // For 'new-chat' mode
  const [selectedUsers, setSelectedUsers] = useState<PublicUser[]>([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);

  const debounceTimer = useRef<any>(null);

  const search = useCallback(
    async (q: string, role: Role | null) => {
      setLoading(true);
      try {
        const res = await api.searchUsers({
          q: q.trim().length > 0 ? q.trim() : undefined,
          role: role || undefined,
          page: 0,
          size: 30,
        });
        // Filter out current user if returned
        const filtered = (res.content || []).filter((u) => u.id !== currentUser?.id);
        setUsers(filtered);
      } catch (err) {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    [currentUser?.id]
  );

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelectedRole(null);
      setSelectedUsers([]);
      setGroupTitle('');
      setFirstMessage('');
      setUsers([]);
      return;
    }

    void search('', null);
  }, [open, search]);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      void search(text, selectedRole);
    }, 300);
  };

  const handleRoleToggle = (role: Role | null) => {
    setSelectedRole(role);
    void search(query, role);
  };

  const toggleSelectUser = (u: PublicUser) => {
    if (selectedUsers.some((item) => item.id === u.id)) {
      setSelectedUsers((prev) => prev.filter((item) => item.id !== u.id));
    } else {
      setSelectedUsers((prev) => [...prev, u]);
    }
  };

  const handleAddParticipant = async (targetUser: PublicUser) => {
    if (!conversationId || addingUserId) return;
    setAddingUserId(targetUser.id);
    try {
      const updated = await api.addParticipant(conversationId, targetUser.id);
      toast.success(`${targetUser.displayName} ${t('chat.invitedSuccess')}`);
      onParticipantAdded?.(updated);
      onClose();
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setAddingUserId(null);
    }
  };

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const conversation = await api.startConversation({
        userIds: selectedUsers.map((u) => u.id),
        title: groupTitle.trim().length > 0 ? groupTitle.trim() : undefined,
        advertId,
        message: firstMessage.trim().length > 0 ? firstMessage.trim() : undefined,
      });

      onChatCreated?.(conversation);
      onClose();
      router.push(`/messages/${conversation.id}` as any);
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  const roleFilterButtons: { label: string; role: Role | null; icon?: any }[] = [
    { label: t('chat.allRoles'), role: null },
    { label: t('chat.designers'), role: 'MODELLER' as Role, icon: 'cube' },
    { label: t('chat.printers'), role: 'PRINTER' as Role, icon: 'print' },
    { label: t('chat.customers'), role: 'CUSTOMER' as Role, icon: 'user' },
  ];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={mode === 'add-to-chat' ? t('chat.inviteCollaborator') : t('chat.collaborate')}
      width={600}
    >
      <View style={{ gap: spacing.md }}>
        <Muted>{t('chat.collaborateSubtitle')}</Muted>

        {/* ----------------- Search input ----------------- */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceAlt,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: spacing.sm,
          }}
        >
          <Icon name="search" size={15} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={handleQueryChange}
            placeholder={t('chat.searchUsers')}
            placeholderTextColor={colors.textFaint}
            style={{
              flex: 1,
              height: 42,
              paddingHorizontal: spacing.sm,
              fontSize: 14,
              color: colors.ink,
              ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
            }}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => {
                setQuery('');
                void search('', selectedRole);
              }}
              style={{ padding: 4 }}
            >
              <Icon name="close" size={14} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* ----------------- Role Filter Chips ----------------- */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xs }}
        >
          {roleFilterButtons.map((item) => {
            const active = selectedRole === item.role;
            return (
              <Pressable
                key={item.label}
                onPress={() => handleRoleToggle(item.role)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: radius.pill,
                  backgroundColor: active ? colors.orange : colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: active ? colors.orangeDark : colors.border,
                }}
              >
                {item.icon && (
                  <Icon
                    name={item.icon}
                    size={12}
                    color={active ? colors.white : colors.textMuted}
                  />
                )}
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: active ? '700' : '600',
                    color: active ? colors.white : colors.ink,
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ----------------- Selected Users Chips (in new-chat mode) ----------------- */}
        {mode === 'new-chat' && selectedUsers.length > 0 && (
          <View style={{ gap: spacing.xs }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>
                {t('chat.collaborators')} ({selectedUsers.length})
              </Text>
              <Pressable onPress={() => setSelectedUsers([])}>
                <Text style={{ fontSize: 11, color: colors.orange, fontWeight: '600' }}>
                  {t('common.clear')}
                </Text>
              </Pressable>
            </Row>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.xs, paddingVertical: 2 }}
            >
              {selectedUsers.map((u) => (
                <Pressable
                  key={u.id}
                  onPress={() => toggleSelectUser(u)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingLeft: 4,
                    paddingRight: 10,
                    paddingVertical: 4,
                    borderRadius: radius.pill,
                    backgroundColor: colors.orangeSoft,
                    borderWidth: 1,
                    borderColor: colors.orangeBorder,
                  }}
                >
                  <Avatar name={u.displayName} uri={absoluteUrl(u.avatarUrl)} size={22} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.orangeDark }}>
                    {u.displayName}
                  </Text>
                  <Icon name="close" size={10} color={colors.orangeDark} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ----------------- User Results List ----------------- */}
        <View style={{ minHeight: 180, maxHeight: 320 }}>
          {loading ? (
            <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
              <Spinner />
            </View>
          ) : users.length === 0 ? (
            <EmptyState
              icon="users"
              title={t('chat.noUsersFound')}
              body={t('chat.noUsersFoundBody')}
            />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator
              contentContainerStyle={{ gap: spacing.xs, paddingBottom: spacing.sm }}
            >
              {users.map((target) => {
                const isExisting = existingParticipantIds.includes(target.id);
                const isSelected = selectedUsers.some((u) => u.id === target.id);
                const isAdding = addingUserId === target.id;

                return (
                  <Pressable
                    key={target.id}
                    disabled={mode === 'add-to-chat' && isExisting}
                    onPress={() => {
                      if (mode === 'new-chat') {
                        toggleSelectUser(target);
                      }
                    }}
                    style={({ hovered }: any) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      padding: spacing.sm,
                      borderRadius: radius.md,
                      backgroundColor: isSelected
                        ? colors.orangeSofter
                        : hovered
                        ? colors.surfaceAlt
                        : colors.surface,
                      borderWidth: 1,
                      borderColor: isSelected ? colors.orangeBorder : colors.border,
                      opacity: isExisting ? 0.6 : 1,
                    })}
                  >
                    <Avatar
                      name={target.displayName}
                      uri={absoluteUrl(target.avatarUrl)}
                      size={40}
                    />

                    <View style={{ flex: 1, gap: 2 }}>
                      <Row gap={spacing.xs} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>
                          {target.displayName}
                        </Text>
                        {target.roles.includes('MODELLER' as Role) && (
                          <Badge
                            label={t('chat.designers')}
                            tone={{ bg: colors.violetSoft, fg: colors.violet }}
                          />
                        )}
                        {target.roles.includes('PRINTER' as Role) && (
                          <Badge
                            label={t('chat.printers')}
                            tone={{ bg: colors.orangeSoft, fg: colors.orangeDark }}
                          />
                        )}
                      </Row>

                      <Row gap={spacing.sm} style={{ alignItems: 'center' }}>
                        {!!target.city && (
                          <Row gap={4} style={{ alignItems: 'center' }}>
                            <Icon name="location" size={11} color={colors.textMuted} />
                            <Muted style={{ fontSize: 12 }}>{target.city}</Muted>
                          </Row>
                        )}
                        {!!target.bio && (
                          <Muted style={{ fontSize: 12, flex: 1 }} numberOfLines={1}>
                            {target.bio}
                          </Muted>
                        )}
                      </Row>
                    </View>

                    {/* Action in add-to-chat mode */}
                    {mode === 'add-to-chat' && (
                      <View>
                        {isExisting ? (
                          <Badge
                            label={t('chat.alreadyParticipant')}
                            tone={{ bg: colors.surfaceAlt, fg: colors.textMuted }}
                          />
                        ) : (
                          <Button
                            title={t('chat.invitePerson')}
                            icon="userPlus"
                            variant="outline"
                            size="sm"
                            loading={isAdding}
                            onPress={() => void handleAddParticipant(target)}
                          />
                        )}
                      </View>
                    )}

                    {/* Checkbox in new-chat mode */}
                    {mode === 'new-chat' && (
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: radius.pill,
                          borderWidth: 1.5,
                          borderColor: isSelected ? colors.orange : colors.borderStrong,
                          backgroundColor: isSelected ? colors.orange : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isSelected && <Icon name="check" size={12} color={colors.white} />}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ----------------- New Chat Creation Controls ----------------- */}
        {mode === 'new-chat' && selectedUsers.length > 0 && (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: spacing.md,
              gap: spacing.sm,
            }}
          >
            {selectedUsers.length > 1 && (
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.ink }}>
                  {t('chat.groupTitleLabel')}
                </Text>
                <TextInput
                  value={groupTitle}
                  onChangeText={setGroupTitle}
                  placeholder={t('chat.groupTitlePlaceholder')}
                  placeholderTextColor={colors.textFaint}
                  maxLength={140}
                  style={{
                    height: 40,
                    paddingHorizontal: spacing.sm,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceAlt,
                    color: colors.ink,
                    fontSize: 13,
                    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
                  }}
                />
              </View>
            )}

            <View style={{ gap: 4 }}>
              <TextInput
                value={firstMessage}
                onChangeText={setFirstMessage}
                placeholder={t('chat.placeholder')}
                placeholderTextColor={colors.textFaint}
                multiline
                maxLength={2000}
                style={{
                  minHeight: 44,
                  maxHeight: 90,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 8,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceAlt,
                  color: colors.ink,
                  fontSize: 13,
                  ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
                }}
              />
            </View>

            <Button
              title={
                selectedUsers.length > 1
                  ? t('chat.startCollaboration')
                  : t('chat.createGroupChat')
              }
              icon="send"
              loading={submitting}
              onPress={() => void handleCreateChat()}
            />
          </View>
        )}
      </View>
    </Sheet>
  );
}

export default UserSearchModal;
