import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../../src/api';
import { SELECTABLE_ROLES } from '../../src/api/types';
import type { AdminUser, Role } from '../../src/api/types';
import { AdminShell } from '../../src/components/AdminShell';
import { Icon } from '../../src/components/Icon';
import {
  Avatar,
  Badge,
  Body,
  Button,
  Chip,
  EmptyState,
  H3,
  Input,
  Muted,
  Pagination,
  Row,
  Sheet,
  Spinner,
} from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { useI18n } from '../../src/i18n';
import { colors, radius, spacing, typography } from '../../src/theme/theme';
import { formatDate } from '../../src/utils/format';

export default function AdminUsersScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const toast = useToast();
  const { isAdmin, booting } = useAuth();

  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [disabling, setDisabling] = useState<AdminUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async (q: string, targetPage = 0) => {
    if (booting || !isAdmin) return;
    setLoading(true);
    try {
      const res = await api.adminUsers(q || undefined, targetPage, 20);
      setUsers(res.content);
      setPage(res.page);
      setTotalPages(res.totalPages);
      setTotal(res.totalElements);
    } catch {
      setUsers([]);
      setTotalPages(0);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [booting, isAdmin]);

  useEffect(() => {
    if (!booting && isAdmin) {
      const handle = setTimeout(() => void load(query.trim(), 0), 250);
      return () => clearTimeout(handle);
    }
  }, [booting, isAdmin, load, query]);

  const run = async (id: string, fn: () => Promise<void>, message: string) => {
    setBusyId(id);
    try {
      await fn();
      await load(query.trim(), page);
      toast.success(message);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('errors.generic'));
    } finally {
      setBusyId(null);
    }
  };

  const toggleRole = (user: AdminUser, role: Role) => {
    const next = user.roles.includes(role) ? user.roles.filter((r) => r !== role) : [...user.roles, role];
    void run(user.id, () => api.adminUpdateUser(user.id, { roles: next }).then(() => undefined), t('admin.rolesSaved'));
  };

  const confirmDisable = () => {
    if (!disabling) return;
    void run(
      disabling.id,
      () => api.adminUpdateUser(disabling.id, { enabled: false, reason: reason.trim() || undefined }).then(() => undefined),
      t('admin.userDisabled'),
    );
    setDisabling(null);
    setReason('');
  };

  const confirmDelete = () => {
    if (!deletingUser) return;
    void run(
      deletingUser.id,
      () => api.adminDeleteUser(deletingUser.id).then(() => undefined),
      t('admin.userDeleted'),
    );
    setDeletingUser(null);
  };

  return (
    <AdminShell
      title={t('admin.users')}
      subtitle={t('admin.subtitle')}
      headerActions={
        <Row gap={spacing.xs} style={{ alignItems: 'center' }}>
          <Muted style={{ fontSize: 13, fontWeight: '600' }}>
            {total} {t('admin.users').toLowerCase()}
          </Muted>
          <Button
            title={t('common.refresh')}
            icon="refresh"
            variant="outline"
            size="sm"
            loading={loading}
            onPress={() => void load(query.trim(), page)}
          />
        </Row>
      }
    >
      <View style={{ gap: spacing.lg }}>
        {/* Inline Search Bar (No container wrapper) */}
        <View style={{ maxWidth: 420 }}>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder={t('admin.searchUsers')}
            icon="search"
            autoCapitalize="none"
          />
        </View>

        {/* Users Table List (Single clean surface with dividing lines) */}
        {loading && users.length === 0 ? (
          <Spinner />
        ) : users.length === 0 ? (
          <EmptyState
            icon="users"
            title={t('admin.noUsers')}
            body={query ? `Geen gebruikers gevonden voor "${query}".` : undefined}
          />
        ) : (
          <View
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.lg,
              overflow: 'hidden',
            }}
          >
            {users.map((user, idx) => {
              const isLast = idx === users.length - 1;
              return (
                <View
                  key={user.id}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 18,
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: colors.border,
                    opacity: busyId === user.id ? 0.6 : 1,
                    gap: 10,
                  }}
                >
                  <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: spacing.md }}>
                    {/* User Identity */}
                    <Row gap={12} style={{ flex: 1, minWidth: 260, alignItems: 'center' }}>
                      <Avatar name={user.displayName} size={38} />
                      <View style={{ gap: 2, flex: 1 }}>
                        <Row gap={8} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                          <Pressable onPress={() => router.push(`/user/${user.id}` as any)}>
                            <Body style={{ fontWeight: '700', fontSize: 14.5, color: colors.ink }}>
                              {user.displayName}
                            </Body>
                          </Pressable>

                          <Badge
                            label={
                              user.deletedAt ? t('admin.deleted') : user.enabled ? t('admin.active') : t('admin.blocked')
                            }
                            tone={
                              user.deletedAt || !user.enabled
                                ? { bg: colors.dangerSoft, fg: colors.danger }
                                : { bg: colors.successSoft, fg: colors.success }
                            }
                          />

                          {user.totpEnabled && (
                            <Badge label="TOTP" tone={{ bg: colors.infoSoft, fg: colors.info }} />
                          )}
                          {user.emailMfaEnabled && (
                            <Badge label="Email MFA" tone={{ bg: colors.warningSoft, fg: colors.orange }} />
                          )}
                        </Row>

                        <Muted style={{ fontSize: 12.5 }}>{user.email}</Muted>
                      </View>
                    </Row>

                    {/* Metadata: Login & Adverts */}
                    <Row gap={spacing.md} style={{ alignItems: 'center' }}>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Muted style={{ fontSize: 11.5 }}>
                          {t('admin.lastLogin')}: {user.lastLoginAt ? formatDate(user.lastLoginAt, locale) : '—'}
                        </Muted>
                        <Muted style={{ fontSize: 11.5 }}>
                          {t('admin.adverts')}: {user.advertCount}
                        </Muted>
                      </View>

                      {/* Action Buttons */}
                      <Row gap={4} style={{ alignItems: 'center' }}>
                        <Button
                          title=""
                          icon="user"
                          variant="ghost"
                          size="sm"
                          onPress={() => router.push(`/user/${user.id}` as any)}
                        />
                        {user.enabled ? (
                          <Button
                            title={t('admin.disable')}
                            icon="ban"
                            variant="ghost"
                            size="sm"
                            onPress={() => {
                              setDisabling(user);
                              setReason('');
                            }}
                          />
                        ) : (
                          <Button
                            title={t('admin.enable')}
                            icon="check"
                            variant="ghost"
                            size="sm"
                            onPress={() =>
                              void run(
                                user.id,
                                () => api.adminUpdateUser(user.id, { enabled: true }).then(() => undefined),
                                t('admin.userEnabled'),
                              )
                            }
                          />
                        )}
                        <Button
                          title=""
                          icon="trash"
                          variant="danger"
                          size="sm"
                          onPress={() => setDeletingUser(user)}
                        />
                      </Row>
                    </Row>
                  </Row>

                  {/* Role Selection Chips row */}
                  <Row gap={6} style={{ flexWrap: 'wrap', alignItems: 'center', paddingLeft: 50 }}>
                    <Muted style={{ fontSize: 11, fontWeight: '600' }}>{t('admin.roles')}:</Muted>
                    {SELECTABLE_ROLES.map((role) => {
                      const hasRole = user.roles.includes(role);
                      return (
                        <Chip
                          key={role}
                          label={role}
                          size="sm"
                          selected={hasRole}
                          onPress={() => toggleRole(user, role)}
                        />
                      );
                    })}

                    {user.disabledReason && (
                      <Muted style={{ fontSize: 11, color: colors.danger, marginLeft: 8 }}>
                        {t('admin.reason')}: {user.disabledReason}
                      </Muted>
                    )}
                  </Row>
                </View>
              );
            })}
          </View>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          totalElements={total}
          onChange={(newPage) => void load(query.trim(), newPage)}
          loading={loading}
        />
      </View>

      {/* Disable User Modal */}
      <Sheet
        open={Boolean(disabling)}
        onClose={() => setDisabling(null)}
        title={t('admin.disable')}
        footer={
          <Row style={{ justifyContent: 'flex-end', gap: spacing.sm }}>
            <Button title={t('common.cancel')} variant="outline" onPress={() => setDisabling(null)} />
            <Button
              title={t('admin.disable')}
              variant="danger"
              onPress={confirmDisable}
            />
          </Row>
        }
      >
        <View style={{ gap: spacing.md, padding: spacing.md }}>
          <Body>
            {t('admin.disable')}: <Body style={{ fontWeight: '700' }}>{disabling?.displayName}</Body>
          </Body>
          <Input
            label={t('admin.disableReason')}
            value={reason}
            onChangeText={setReason}
            placeholder="Bijv. overtreding van marktplaatsregels"
          />
        </View>
      </Sheet>

      {/* Delete User Modal */}
      <Sheet
        open={Boolean(deletingUser)}
        onClose={() => setDeletingUser(null)}
        title={t('admin.deleteUser')}
        footer={
          <Row style={{ justifyContent: 'flex-end', gap: spacing.sm }}>
            <Button title={t('common.cancel')} variant="outline" onPress={() => setDeletingUser(null)} />
            <Button
              title={t('common.delete')}
              variant="danger"
              onPress={confirmDelete}
            />
          </Row>
        }
      >
        <View style={{ gap: spacing.md, padding: spacing.md }}>
          <Body style={{ color: colors.danger, fontWeight: '600' }}>
            {t('admin.deleteUserConfirm')}
          </Body>
          <Body>
            Gebruiker: <Body style={{ fontWeight: '700' }}>{deletingUser?.displayName}</Body> ({deletingUser?.email})
          </Body>
        </View>
      </Sheet>
    </AdminShell>
  );
}
