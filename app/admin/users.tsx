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
  Divider,
  H3,
  Input,
  Muted,
  Pagination,
  Row,
  Sheet,
  Spinner,
} from '../../src/components/ui';
import { useToast } from '../../src/context/ToastContext';
import { useI18n } from '../../src/i18n';
import { colors, spacing } from '../../src/theme/theme';
import { formatDate } from '../../src/utils/format';

export default function AdminUsersScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [disabling, setDisabling] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async (q: string, targetPage = 0) => {
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
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => void load(query.trim(), 0), 250);
    return () => clearTimeout(handle);
  }, [query, load]);

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

  return (
    <AdminShell>
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder={t('admin.searchUsers')}
        icon="search"
        autoCapitalize="none"
      />

      {loading ? (
        <Spinner />
      ) : users.length === 0 ? (
        <Card>
          <Muted>{t('admin.noUsers')}</Muted>
        </Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {users.map((user) => (
            <Card key={user.id} style={{ gap: spacing.md, opacity: busyId === user.id ? 0.6 : 1 }}>
              <Row style={{ flexWrap: 'wrap', gap: spacing.md, alignItems: 'flex-start' }}>
                <Avatar name={user.displayName} size={44} />
                <View style={{ flex: 1, minWidth: 200, gap: 2 }}>
                  <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
                    <Body style={{ fontWeight: '700' }}>{user.displayName}</Body>
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
                  </Row>
                  <Muted>{user.email}</Muted>
                  <Muted>
                    {t('admin.lastLogin')}: {user.lastLoginAt ? formatDate(user.lastLoginAt, locale) : '—'} ·{' '}
                    {t('admin.adverts')}: {user.advertCount}
                  </Muted>
                  {user.disabledReason ? (
                    <Muted style={{ color: colors.danger }}>
                      {t('admin.reason')}: {user.disabledReason}
                    </Muted>
                  ) : null}
                </View>
                <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
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
                      icon="checkCircle"
                      variant="outline"
                      size="sm"
                      onPress={() =>
                        run(
                          user.id,
                          () => api.adminUpdateUser(user.id, { enabled: true }).then(() => undefined),
                          t('admin.userEnabled'),
                        )
                      }
                    />
                  )}
                  <Button
                    title={t('common.delete')}
                    icon="trash"
                    variant="danger"
                    size="sm"
                    onPress={() =>
                      run(
                        user.id,
                        () => api.adminDeleteUser(user.id, t('admin.deleteUser')).then(() => undefined),
                        t('admin.userDeleted'),
                      )
                    }
                  />
                </Row>
              </Row>

              <Divider />
              <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
                <Row gap={6}>
                  <Icon name="userGear" size={12} color={colors.textFaint} />
                  <Muted>{t('admin.roles')}</Muted>
                </Row>
                {SELECTABLE_ROLES.map((role) => (
                  <Chip
                    key={role}
                    label={t(`roles.${role}`)}
                    size="sm"
                    selected={user.roles.includes(role)}
                    onPress={() => toggleRole(user, role)}
                  />
                ))}
                <Chip
                  label={t('roles.ADMIN')}
                  size="sm"
                  selected={user.roles.includes('ADMIN')}
                  onPress={() => toggleRole(user, 'ADMIN')}
                />
              </Row>
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

      <Sheet open={!!disabling} onClose={() => setDisabling(null)} title={t('admin.disable')}>
        <H3>{disabling?.displayName}</H3>
        <Input
          label={t('admin.disableReason')}
          value={reason}
          onChangeText={setReason}
          multiline
          icon="flag"
        />
        <Row gap={spacing.sm} style={{ justifyContent: 'flex-end' }}>
          <Button title={t('common.cancel')} variant="ghost" onPress={() => setDisabling(null)} />
          <Button
            title={t('admin.disable')}
            icon="ban"
            variant="danger"
            onPress={() => {
              const target = disabling;
              if (!target) return;
              setDisabling(null);
              void run(
                target.id,
                () =>
                  api
                    .adminUpdateUser(target.id, { enabled: false, reason: reason.trim() || undefined })
                    .then(() => undefined),
                t('admin.userDisabled'),
              );
            }}
          />
        </Row>
      </Sheet>
    </AdminShell>
  );
}
