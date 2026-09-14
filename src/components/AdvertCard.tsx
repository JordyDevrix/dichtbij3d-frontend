import React, { useCallback, useState } from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../api';
import { absoluteUrl } from '../api/client';
import type { AdvertSummary } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { useLists } from '../context/ListsContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { advertTypeColor, colors, radius, shadow, spacing, statusColor, typography } from '../theme/theme';
import { money, timeAgo } from '../utils/format';
import { useContextMenu } from '../hooks/useContextMenu';
import { Icon } from './Icon';
import { Avatar, Badge, Body, Button, Chip, H2, H3, Input, Muted, Row, Sheet } from './ui';

interface Props {
  advert: AdvertSummary;
  onChanged?: () => void;
}

export function AdvertCard({ advert, onChanged }: Props) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { user, isAdmin } = useAuth();
  const { lists, defaultList, addToList, removeFromList, createList } = useLists();
  const toast = useToast();
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

  const isOwner = user?.id === advert.author.id;
  const isFavorite = defaultList?.advertIds.includes(advert.id) ?? false;
  const openMenu = useCallback(() => setMenuOpen(true), []);
  const ref = useContextMenu(openMenu);

  const cover = absoluteUrl(advert.coverImageUrl);
  const typeTone = advertTypeColor[advert.type];
  const statusTone = statusColor[advert.status] ?? statusColor.OPEN;

  const priceLabel = () => {
    if (advert.priceCents != null) return money(advert.priceCents, locale, advert.currency);
    if (advert.budgetMinCents != null || advert.budgetMaxCents != null) {
      const min = advert.budgetMinCents != null ? money(advert.budgetMinCents, locale) : '';
      const max = advert.budgetMaxCents != null ? money(advert.budgetMaxCents, locale) : '';
      return min && max ? `${min} – ${max}` : min || max;
    }
    return advert.allowBidding ? t('create.allowBidding') : '—';
  };

  const moderateDelete = async () => {
    if (reason.trim().length < 3) return;
    setBusy(true);
    try {
      if (isAdmin && !isOwner) {
        await api.moderateDeleteAdvert(advert.id, reason.trim());
      } else {
        await api.deleteAdvert(advert.id, reason.trim() || undefined);
      }
      toast.success(t('common.save'));
      setReasonOpen(false);
      setReason('');
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const submitReport = async () => {
    if (reportReason.trim().length < 3) return;
    setBusy(true);
    try {
      await api.report({ advertId: advert.id, reason: reportReason.trim() });
      toast.success(t('common.submit'));
      setReportOpen(false);
      setReportReason('');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View ref={ref} style={{ flexGrow: 1, flexBasis: 320, maxWidth: 460 }}>
      <Pressable
        onPress={() => router.push(`/advert/${advert.id}`)}
        onLongPress={openMenu}
        delayLongPress={400}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={[
          {
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: hovered ? colors.borderStrong : colors.border,
            overflow: 'hidden',
            transform: [{ translateY: hovered ? -3 : 0 }],
            ...(Platform.OS === 'web'
              ? ({
                  transitionDuration: '180ms',
                  transitionProperty: 'transform, border-color, box-shadow',
                } as any)
              : null),
          },
          hovered ? shadow.raised : shadow.card,
        ]}
      >
        <View style={{ aspectRatio: 16 / 10, backgroundColor: colors.surfaceAlt, overflow: 'hidden', position: 'relative' }}>
          {cover ? (
            <Image
              source={{ uri: cover }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="cube" size={34} color={colors.borderStrong} />
            </View>
          )}
          <View style={{ position: 'absolute', top: spacing.md, left: spacing.md, flexDirection: 'row', gap: 6 }}>
            <Badge label={t(`advertTypes.${advert.type}`)} tone={typeTone} />
            {advert.status !== 'OPEN' && <Badge label={t(`status.${advert.status}`)} tone={statusTone} />}
            {advert.category !== 'OTHER' && (
              <Badge label={t(`categories.${advert.category}`)} tone={{ bg: colors.surfaceAlt, fg: colors.textMuted }} />
            )}
          </View>
          <View style={{ position: 'absolute', top: spacing.md, right: spacing.md, flexDirection: 'row', gap: 6 }}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (!user) return toast.error(t('common.signInRequired'));
                if (isFavorite) {
                  void removeFromList(defaultList!.id, advert.id);
                } else {
                  void addToList(defaultList!.id, advert.id).then(() => toast.success(t('lists.addedToFavorites')));
                }
              }}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 6,
                ...shadow.card,
              }}
            >
              <Icon name="star" size={14} color={isFavorite ? colors.danger : colors.textMuted} />
            </Pressable>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (!user) return toast.error(t('common.signInRequired'));
                setListMenuOpen(true);
              }}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 6,
                ...shadow.card,
              }}
            >
              <Icon name="plus" size={14} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>

        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <H3 numberOfLines={2}>{advert.title}</H3>
          <Muted numberOfLines={2}>{advert.excerpt}</Muted>

          {advert.tags.length > 0 && (
            <Row gap={6} style={{ flexWrap: 'wrap' }}>
              {advert.tags.slice(0, 3).map((tag) => (
                <Chip key={tag.id} label={tag.label} size="sm" />
              ))}
              {advert.tags.length > 3 && (
                <Muted style={typography.tiny}>+{advert.tags.length - 3}</Muted>
              )}
            </Row>
          )}

          <Row style={{ marginTop: spacing.xs, justifyContent: 'space-between' }}>
            <H2>{priceLabel()}</H2>
            {advert.allowBidding && (
              <Row gap={spacing.xs}>
                <Muted>{t('advert.highestBid')}</Muted>
                <H3>{advert.highestBidCents ? money(advert.highestBidCents, locale, advert.currency) : '—'}</H3>
                <Muted>
                  {advert.bidCount} {t('advert.bids')}
                </Muted>
              </Row>
            )}
          </Row>

          <View style={{ height: 1, backgroundColor: colors.border, marginTop: spacing.xs }} />

          <Row style={{ justifyContent: 'space-between' }}>
            <Pressable
              onPress={() => router.push(`/user/${advert.author.id}`)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 }}
            >
              <Avatar name={advert.author.displayName} uri={absoluteUrl(advert.author.avatarUrl)} size={22} />
              <Muted numberOfLines={1} style={{ flexShrink: 1, fontSize: 12 }}>
                {advert.author.displayName}
                {advert.city ? ` · ${advert.city}` : ''}
              </Muted>
            </Pressable>
            <Row gap={spacing.md}>
              <Row gap={4}>
                <Icon name="eye" size={11} color={colors.textFaint} />
                <Muted>{advert.viewCount}</Muted>
              </Row>
              <Row gap={4}>
                <Icon name="comments" size={11} color={colors.textFaint} />
                <Muted>{advert.reactionCount}</Muted>
              </Row>
            </Row>
          </Row>

          <Muted style={typography.tiny}>{timeAgo(advert.createdAt, t, locale)}</Muted>
        </View>
      </Pressable>

      {/* Right-click / long-press quick actions */}
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={advert.title} width={420}>
        <Muted>{t('advert.moderationHint')}</Muted>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button
            title={t('common.readMore')}
            icon="external"
            variant="outline"
            full
            onPress={() => {
              setMenuOpen(false);
              router.push(`/advert/${advert.id}`);
            }}
          />
          {user && !isOwner && (
            <Button
              title={t('advert.report')}
              icon="flag"
              variant="outline"
              full
              onPress={() => {
                setMenuOpen(false);
                setReportOpen(true);
              }}
            />
          )}
          {(isOwner || isAdmin) && (
            <Button
              title={isAdmin && !isOwner ? t('advert.moderationDelete') : t('common.delete')}
              icon="trash"
              variant="danger"
              full
              onPress={() => {
                setMenuOpen(false);
                setReasonOpen(true);
              }}
            />
          )}
        </View>
      </Sheet>

      <Sheet open={reasonOpen} onClose={() => setReasonOpen(false)} title={t('advert.deleteReason')} width={440}>
        <Muted>{isOwner ? t('advert.deleteOwnConfirm') : t('advert.moderationTitle')}</Muted>
        <Input
          value={reason}
          onChangeText={setReason}
          placeholder={t('advert.deleteReasonPlaceholder')}
          multiline
          icon="flag"
        />
        <Row style={{ justifyContent: 'flex-end' }}>
          <Button title={t('common.cancel')} variant="ghost" onPress={() => setReasonOpen(false)} />
          <Button title={t('common.delete')} variant="danger" loading={busy} onPress={moderateDelete} />
        </Row>
      </Sheet>

      <Sheet open={reportOpen} onClose={() => setReportOpen(false)} title={t('advert.reportReason')} width={440}>
        <Input value={reportReason} onChangeText={setReportReason} multiline icon="flag" />
        <Row style={{ justifyContent: 'flex-end' }}>
          <Button title={t('common.cancel')} variant="ghost" onPress={() => setReportOpen(false)} />
          <Button title={t('common.submit')} loading={busy} onPress={submitReport} />
        </Row>
      </Sheet>

      <Sheet open={listMenuOpen} onClose={() => setListMenuOpen(false)} title={t('lists.saveToList')} width={400}>
        <View style={{ gap: spacing.md }}>
          <View style={{ gap: spacing.xs }}>
            {lists.map((list) => {
              const inList = list.advertIds.includes(advert.id);
              return (
                <Pressable
                  key={list.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: spacing.sm,
                    backgroundColor: colors.surfaceAlt,
                    borderRadius: radius.md,
                    justifyContent: 'space-between',
                  }}
                  onPress={() => {
                    if (inList) void removeFromList(list.id, advert.id);
                    else void addToList(list.id, advert.id);
                  }}
                >
                  <H3>{list.name}</H3>
                  <Icon name={inList ? 'checkCircle' : 'plus'} color={inList ? colors.orange : colors.textMuted} size={18} />
                </Pressable>
              );
            })}
          </View>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Input
                value={newListTitle}
                onChangeText={setNewListTitle}
                placeholder={t('lists.newListName')}
              />
            </View>
            <Button
              title={t('common.save')}
              disabled={!newListTitle.trim()}
              onPress={async () => {
                try {
                  setBusy(true);
                  await createList(newListTitle.trim());
                  setNewListTitle('');
                } finally {
                  setBusy(false);
                }
              }}
              loading={busy}
            />
          </Row>
        </View>
      </Sheet>
    </View>
  );
}

export default AdvertCard;
