import React, { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
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
  const { isWide } = useBreakpoint();

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
        return { bg: colors.infoSoft, fg: colors.info };
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
    <AdminShell
      title={t('admin.announcementsTitle')}
      subtitle={t('admin.announcementsSubtitle')}
      headerActions={
        <Button
          title={t('admin.newAnnouncement')}
          icon="plus"
          size="sm"
          onPress={openCreate}
        />
      }
    >
      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState
          icon="bell"
          title="Geen aankondigingen"
          body="Er zijn momenteel geen aankondigingen geplaatst. Maak er een aan om nieuws of evenementen op de homepage te tonen."
          action={
            <Button
              title={t('admin.newAnnouncement')}
              icon="plus"
              variant="primary"
              onPress={openCreate}
            />
          }
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
          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            return (
              <View
                key={item.id}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 18,
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: colors.border,
                  borderLeftWidth: 4,
                  borderLeftColor: item.active
                    ? item.type === 'WARNING'
                      ? colors.danger
                      : colors.orange
                    : colors.border,
                  gap: 8,
                }}
              >
                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: spacing.sm }}>
                  <Row gap={spacing.sm} style={{ flex: 1, minWidth: 240, alignItems: 'center' }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: radius.md,
                        backgroundColor: colors.surfaceAlt,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon
                        name={getAnnouncementIcon(item.type)}
                        size={15}
                        color={item.type === 'WARNING' ? colors.danger : colors.orange}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Row gap={spacing.xs} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <H3 style={{ fontSize: 15 }}>{item.title}</H3>
                        <Badge label={item.type} tone={getAnnouncementBadgeTone(item.type)} />
                        <Badge
                          label={item.active ? t('admin.active') : 'Inactief'}
                          tone={
                            item.active
                              ? { bg: colors.successSoft, fg: colors.success }
                              : { bg: colors.surfaceAlt, fg: colors.textMuted }
                          }
                        />
                      </Row>
                    </View>
                  </Row>

                  <Row gap={spacing.xs}>
                    <Button
                      title={t('advert.edit')}
                      icon="edit"
                      variant="ghost"
                      size="sm"
                      onPress={() => openEdit(item)}
                    />
                    <Button
                      title=""
                      icon="trash"
                      variant="danger"
                      size="sm"
                      onPress={() => setDeleteConfirmItem(item)}
                    />
                  </Row>
                </Row>

                <Body style={{ color: colors.textMuted, fontSize: 13.5 }}>{item.content}</Body>

                {(item.eventDate || item.linkUrl) && (
                  <Row gap={spacing.md} style={{ flexWrap: 'wrap', marginTop: 2 }}>
                    {item.eventDate && (
                      <Row gap={4} style={{ alignItems: 'center' }}>
                        <Icon name="calendar" size={11} color={colors.orange} />
                        <Muted style={typography.tiny}>
                          {formatDate(item.eventDate, locale)}
                        </Muted>
                      </Row>
                    )}
                    {item.linkUrl && (
                      <Row gap={4} style={{ alignItems: 'center' }}>
                        <Icon name="link" size={11} color={colors.textFaint} />
                        <Muted style={typography.tiny}>
                          {item.linkText || item.linkUrl}
                        </Muted>
                      </Row>
                    )}
                  </Row>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* ----------------- CREATE / EDIT SHEET WITH ACCURATE LIVE PREVIEW ----------------- */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingItem ? t('admin.editAnnouncement') : t('admin.newAnnouncement')}
        width={620}
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
            placeholder="Bijv. Gepland onderhoud of Maker Faire 2026"
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
            placeholder="JJJJ-MM-DD (bijv. 2026-10-15)"
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

          {/* ACCURATE LIVE PREVIEW CARD */}
          <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
            <Row gap={spacing.xs} style={{ alignItems: 'center' }}>
              <Icon name="eye" size={13} color={colors.orange} />
              <Muted style={{ fontWeight: '700', color: colors.ink, fontSize: 13 }}>
                {t('admin.livePreview')}
              </Muted>
            </Row>
            <Muted style={typography.tiny}>
              {t('admin.announcementPreviewHint')}
            </Muted>

            <Card
              style={{
                backgroundColor: colors.surface,
                borderColor: type === 'WARNING' ? colors.danger : colors.border,
                borderWidth: 1.5,
                padding: spacing.md,
                marginTop: 4,
              }}
            >
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: spacing.sm }}>
                <Row gap={spacing.sm} style={{ flex: 1, minWidth: 200, alignItems: 'center' }}>
                  <Icon name={getAnnouncementIcon(type)} size={15} color={colors.orange} />
                  <H3 style={{ flexShrink: 1, fontSize: 15 }}>{title || 'Titel van aankondiging'}</H3>
                  <Badge label={type} tone={getAnnouncementBadgeTone(type)} />
                </Row>
                {eventDate ? (
                  <Row gap={4} style={{ alignItems: 'center' }}>
                    <Icon name="calendar" size={12} color={colors.textFaint} />
                    <Muted style={typography.tiny}>
                      {eventDate}
                    </Muted>
                  </Row>
                ) : null}
              </Row>

              <Body style={{ color: colors.textMuted, marginTop: spacing.sm, fontSize: 13.5 }}>
                {content || 'De inhoud van de mededeling wordt hier weergegeven...'}
              </Body>

              {linkUrl ? (
                <Row style={{ marginTop: spacing.md }}>
                  <Button
                    title={linkText || t('home.readMore')}
                    icon="arrowRight"
                    variant="ghost"
                    size="sm"
                  />
                </Row>
              ) : null}
            </Card>
          </View>

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
              <H3 style={{ fontSize: 15 }}>{deleteConfirmItem.title}</H3>
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
