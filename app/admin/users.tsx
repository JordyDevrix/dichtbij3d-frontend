import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
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
  Card,
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
import { colors, radius, shadow, spacing, typography } from '../../src/theme/theme';
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
          <Badge label={`${total} ${t('admin.users').toLowerCase()}`} tone={{ bg: colors.surfaceAlt, fg: colors.textMuted }} />
        </Row>
      }
    >
      <Card style={{ gap: spacing.md }}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={t('admin.searchUsers')}
          icon="search"
          autoCapitalize="none"
        />

        {loading && users.length === 0 ? (
          <Spinner />
        ) : users.length === 0 ? (
          <EmptyState icon="users" title={t('admin.noUsers')} />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {users.map((user) => (
              <Card
                key={user.id}
                flat
                style={{
                  gap: spacing.md,
                  opacity: busyId === user.id ? 0.6 : 1,
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                }}
              >
                <Row style={{ flexWrap: 'wrap', gap: spacing.md, alignItems: 'flex-start' }}>
                  <Avatar name={user.displayName} size={42} />

                  <View style={{ flex: 1, minWidth: 220, gap: 4 }}>
                    <Row gap={spacing.sm} style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                      <Body style={{ fontWeight: '700', fontSize: 15 }}>{user.displayName}</Body>
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

                    <Muted style={typography.tiny}>{user.email}</Muted>
                    <Muted style={typography.tiny}>
                      {t('admin.lastLogin')}: {user.lastLoginAt ? formatDate(user.lastLoginAt, locale) : '—'} ·{' '}
                      {t('admin.adverts')}: {user.advertCount}
                    </Muted>

                    {user.disabledReason ? (
                      <Muted style={{ ...typography.tiny, color: colors.danger }}>
                        {t('admin.reason')}: {user.disabledReason}
                      </Muted>
                    ) : null}
                  </View>

                  <Row gap={spacing.xs} style={{ flexWrap: 'wrap' }}>
                    <Button
                      title={t('profile.title')}
                      icon="user"
                      variant="ghost"
                      size="sm"
                      onPress={() => router.push(`/user/${user.id}` as any)}
                    />
                    {user.enabled ? (
                      <Button
                        title={t('admin.disable')}
                        icon="ban"
                        variant="outline"
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
                        variant="outline"
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

                {/* Role Management Chips */}
                <View style={{ gap: 4, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
                  <Muted style={typography.tiny}>{t('admin.roles')}:</Muted>
                  <Row gap={6} style={{ flexWrap: 'wrap' }}>
                    {SELECTABLE_ROLES.map((role) => {
                      const hasRole = user.roles.includes(role);
                      return (
                        <Chip
                          key={role}
                          label={role}
                          selected={hasRole}
                          onPress={() => toggleRole(user, role)}
                        />
                      );
                    })}
                  </Row>
                </View>
              </Card>
            ))}

            <Pagination
              page={page}
              totalPages={totalPages}
              totalElements={total}
              onChange={(newPage) => void load(query.trim(), newPage)}
              loading={loading}
            />
          </View>
        )}
      </Card>

      {/* Disable Reason Modal Sheet */}
      <Sheet
        open={!!disabling}
        onClose={() => setDisabling(null)}
        title={t('admin.disable')}
        width={440}
      >
        <View style={{ gap: spacing.lg }}>
          <Body>{disabling?.displayName}</Body>
          <Input
            label={t('admin.disableReason')}
            value={reason}
            onChangeText={setReason}
            placeholder="Geef reden voor blokkering..."
            multiline
          />
          <Row style={{ justifyContent: 'flex-end', gap: spacing.sm }}>
            <Button
              title={t('common.cancel')}
              variant="ghost"
              onPress={() => setDisabling(null)}
            />
            <Button
              title={t('admin.disable')}
              variant="danger"
              icon="ban"
              onPress={confirmDisable}
            />
          </Row>
        </View>
      </Sheet>

      {/* Delete User Modal Sheet */}
      <Sheet
        open={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        title={t('admin.deleteUser')}
        width={440}
      >
        <View style={{ gap: spacing.lg }}>
          <Body>{t('admin.deleteUserConfirm')}</Body>
          {deletingUser && (
            <Card style={{ backgroundColor: colors.surfaceAlt }}>
              <Body style={{ fontWeight: '700' }}>{deletingUser.displayName}</Body>
              <Muted>{deletingUser.email}</Muted>
            </Card>
          )}
          <Row style={{ justifyContent: 'flex-end', gap: spacing.sm }}>
            <Button
              title={t('common.cancel')}
              variant="ghost"
              onPress={() => setDeletingUser(null)}
            />
            <Button
              title={t('common.delete')}
              variant="danger"
              icon="trash"
              onPress={confirmDelete}
            />
          </Row>
        </View>
      </Sheet>
    </AdminShell>
  );
}
