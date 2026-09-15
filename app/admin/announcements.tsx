import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { api, ApiError } from '../../src/api';
import type { AnnouncementType, PlatformAnnouncement } from '../../src/api/types';
import { AdminShell } from '../../src/components/AdminShell';
import { Icon, IconName } from '../../src/components/Icon';
import {
  Badge,
  Body,
  Button,
  Card,
  Chip,
  EmptyState,
  H2,
  H3,
  Input,
  Muted,
  Row,
  Select,
  Sheet,
  Spinner,
  SwitchRow,
} from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { useI18n } from '../../src/i18n';
import { colors, radius, shadow, spacing, typography } from '../../src/theme/theme';
import { formatDate, formatDateTime } from '../../src/utils/format';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';

const ANNOUNCEMENT_TYPES: AnnouncementType[] = ['INFO', 'EVENT', 'UPDATE', 'WARNING'];

export default function AdminAnnouncementsScreen() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const { isAdmin, booting } = useAuth();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PlatformAnnouncement[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PlatformAnnouncement | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<PlatformAnnouncement | null>(null);
  const [busy, setBusy] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<AnnouncementType>('INFO');
  const [eventDate, setEventDate] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [active, setActive] = useState(true);

  const load = useCallback(async () => {
    if (booting || !isAdmin) return;
    setLoading(true);
    try {
      const data = await api.adminAnnouncements();
      setItems(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }, [booting, isAdmin, t, toast]);

  useEffect(() => {
    if (!booting && isAdmin) {
      void load();
    }
  }, [booting, isAdmin, load]);

  const openCreate = () => {
    setEditingItem(null);
    setTitle('');
    setContent('');
    setType('INFO');
    setEventDate('');
    setLinkUrl('');
    setLinkText('');
    setActive(true);
    setSheetOpen(true);
  };

  const openEdit = (item: PlatformAnnouncement) => {
    setEditingItem(item);
    setTitle(item.title);
    setContent(item.content);
    setType(item.type);
    setEventDate(item.eventDate ? item.eventDate.substring(0, 10) : '');
    setLinkUrl(item.linkUrl || '');
    setLinkText(item.linkText || '');
    setActive(item.active);
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error(t('create.fixErrors'));
      return;
    }

    setBusy(true);
    try {
      const body = {
        title: title.trim(),
        content: content.trim(),
        type,
        eventDate: eventDate.trim() ? new Date(eventDate.trim()).toISOString() : null,
        linkUrl: linkUrl.trim() || null,
        linkText: linkText.trim() || null,
        active,
      };

      if (editingItem) {
        await api.adminUpdateAnnouncement(editingItem.id, body);
      } else {
        await api.adminCreateAnnouncement(body);
      }

      toast.success(t('admin.announcementSaved'));
      setSheetOpen(false);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmItem) return;
    setBusy(true);
    try {
      await api.adminDeleteAnnouncement(deleteConfirmItem.id);
      toast.success(t('admin.announcementDeleted'));
      setDeleteConfirmItem(null);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const getAnnouncementBadgeTone = (annType: string) => {
    switch (annType) {
      case 'WARNING':
        return { bg: colors.dangerSoft, fg: colors.danger };
      case 'EVENT':
        return { bg: colors.orangeSoft, fg: colors.orangeDarker };
      case 'UPDATE':
        return { bg: colors.surfaceAlt, fg: colors.orange };
      default:
        return { bg: colors.surfaceAlt, fg: colors.textMuted };
    }
  };

  const getAnnouncementIcon = (annType: string): IconName => {
    switch (annType) {
      case 'WARNING':
        return 'warning';
      case 'EVENT':
        return 'calendar';
      case 'UPDATE':
        return 'bolt';
      default:
        return 'info';
    }
  };

  return (
    <AdminShell>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm }}>
        <View style={{ gap: 4 }}>
          <H2>{t('admin.announcementsTitle')}</H2>
          <Muted>{t('admin.announcementsSubtitle')}</Muted>
        </View>

        <Button
          title={t('admin.newAnnouncement')}
          icon="plus"
          onPress={openCreate}
        />
      </Row>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon="bell"
            title={t('home.noAnnouncements')}
            body={t('admin.announcementsSubtitle')}
            action={
              <Button
                title={t('admin.newAnnouncement')}
                icon="plus"
                onPress={openCreate}
              />
            }
          />
        </Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {items.map((item) => (
            <Card
              key={item.id}
              style={{
                backgroundColor: colors.surface,
                borderColor: item.type === 'WARNING' ? colors.danger : colors.border,
                opacity: item.active ? 1 : 0.65,
              }}
            >
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: spacing.sm }}>
                <Row gap={spacing.sm} style={{ flex: 1, minWidth: 260, alignItems: 'center' }}>
                  <Icon name={getAnnouncementIcon(item.type)} size={16} color={colors.orange} />
                  <H3 style={{ flexShrink: 1 }}>{item.title}</H3>
                  <Badge label={item.type} tone={getAnnouncementBadgeTone(item.type)} />
                  <Badge
                    label={item.active ? t('admin.active') : t('security.disabled')}
                    tone={
                      item.active
                        ? { bg: colors.orangeSoft, fg: colors.orangeDarker }
                        : { bg: colors.surfaceAlt, fg: colors.textMuted }
                    }
                  />
                </Row>

                <Row gap={spacing.xs}>
                  <Button
                    title={t('common.edit')}
                    icon="edit"
                    variant="ghost"
                    size="sm"
                    onPress={() => openEdit(item)}
                  />
                  <Button
                    title={t('common.delete')}
                    icon="trash"
                    variant="danger"
                    size="sm"
                    onPress={() => setDeleteConfirmItem(item)}
                  />
                </Row>
              </Row>

              <Body style={{ color: colors.textMuted, marginTop: spacing.sm }}>{item.content}</Body>

              <Row style={{ justifyContent: 'space-between', marginTop: spacing.md, flexWrap: 'wrap', gap: spacing.sm }}>
                <Row gap={spacing.md} style={{ flexWrap: 'wrap' }}>
                  {item.eventDate && (
                    <Row gap={4} style={{ alignItems: 'center' }}>
                      <Icon name="calendar" size={12} color={colors.orange} />
                      <Muted style={typography.tiny}>
                        {formatDate(item.eventDate, locale)}
                      </Muted>
                    </Row>
                  )}
                  {item.linkUrl && (
                    <Row gap={4} style={{ alignItems: 'center' }}>
                      <Icon name="link" size={12} color={colors.textFaint} />
                      <Muted style={typography.tiny}>
                        {item.linkText || item.linkUrl}
                      </Muted>
                    </Row>
                  )}
                </Row>
                <Muted style={typography.tiny}>
                  {formatDateTime(item.createdAt, locale)}
                </Muted>
              </Row>
            </Card>
          ))}
        </View>
      )}

      {/* Create / Edit Sheet */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingItem ? t('admin.editAnnouncement') : t('admin.newAnnouncement')}
        width={560}
      >
        <View style={{ gap: spacing.lg }}>
          <SwitchRow
            label={t('admin.announcementActive')}
            value={active}
            onValueChange={setActive}
          />

          <Input
            label={t('admin.announcementTitle')}
            value={title}
            onChangeText={setTitle}
            placeholder="Bijv. Onderhoud gepland of Maker Faire 2026"
            icon="bell"
          />

          <Input
            label={t('admin.announcementContent')}
            value={content}
            onChangeText={setContent}
            placeholder="Beschrijf de mededeling, update of evenement details..."
            multiline
          />

          <View style={{ gap: spacing.xs }}>
            <Muted style={{ fontWeight: '600', color: colors.ink }}>
              {t('admin.announcementType')}
            </Muted>
            <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
              {ANNOUNCEMENT_TYPES.map((tVal) => (
                <Chip
                  key={tVal}
                  label={tVal}
                  selected={type === tVal}
                  onPress={() => setType(tVal)}
                  tone={type === tVal ? { bg: colors.orange, fg: colors.white } : undefined}
                />
              ))}
            </Row>
          </View>

          <Input
            label={t('admin.announcementEventDate')}
            value={eventDate}
            onChangeText={setEventDate}
            placeholder="2026-10-15"
            icon="calendar"
          />

          <Row gap={spacing.md} style={{ flexWrap: 'wrap' }}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Input
                label={t('admin.announcementLinkUrl')}
                value={linkUrl}
                onChangeText={setLinkUrl}
                placeholder="/marketplace of https://..."
                icon="link"
              />
            </View>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Input
                label={t('admin.announcementLinkText')}
                value={linkText}
                onChangeText={setLinkText}
                placeholder="Bijv. Lees meer of Bekijk event"
              />
            </View>
          </Row>

          <Row style={{ justifyContent: 'space-between', marginTop: spacing.sm }}>
            <Button
              title={t('common.cancel')}
              variant="ghost"
              onPress={() => setSheetOpen(false)}
            />
            <Button
              title={t('common.save')}
              icon="check"
              loading={busy}
              onPress={handleSave}
            />
          </Row>
        </View>
      </Sheet>

      {/* Delete Confirmation Sheet */}
      <Sheet
        open={!!deleteConfirmItem}
        onClose={() => setDeleteConfirmItem(null)}
        title={t('admin.announcementDeleted')}
        width={420}
      >
        <View style={{ gap: spacing.lg }}>
          <Body>{t('admin.deleteAnnouncementConfirm')}</Body>
          {deleteConfirmItem && (
            <Card style={{ backgroundColor: colors.surfaceAlt }}>
              <H3>{deleteConfirmItem.title}</H3>
            </Card>
          )}
          <Row style={{ justifyContent: 'flex-end', gap: spacing.sm }}>
            <Button
              title={t('common.cancel')}
              variant="ghost"
              onPress={() => setDeleteConfirmItem(null)}
            />
            <Button
              title={t('common.delete')}
              variant="danger"
              icon="trash"
              loading={busy}
              onPress={handleDelete}
            />
          </Row>
        </View>
      </Sheet>
    </AdminShell>
  );
}
