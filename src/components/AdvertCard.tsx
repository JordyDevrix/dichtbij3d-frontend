import React, { useCallback, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../api';
import { absoluteUrl } from '../api/client';
import type { AdvertSummary } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { advertTypeColor, colors, radius, shadow, spacing, statusColor, typography } from '../theme/theme';
import { money, timeAgo } from '../utils/format';
import { useContextMenu } from '../hooks/useContextMenu';
import { Icon } from './Icon';
import { Avatar, Badge, Body, Button, Chip, H3, Input, Muted, Row, Sheet } from './ui';

interface Props {
  advert: AdvertSummary;
  onChanged?: () => void;
}

export function AdvertCard({ advert, onChanged }: Props) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const isOwner = user?.id === advert.author.id;
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
            borderColor: hovered ? colors.orangeBorder : colors.border,
            overflow: 'hidden',
            transform: [{ translateY: hovered ? -2 : 0 }],
          },
          shadow.card,
        ]}
      >
        <View style={{ height: 168, backgroundColor: colors.orangeSofter }}>
          {cover ? (
            <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="cube" size={38} color={colors.orangeBorder} />
            </View>
          )}
          <View style={{ position: 'absolute', top: spacing.md, left: spacing.md, flexDirection: 'row', gap: 6 }}>
            <Badge label={t(`advertTypes.${advert.type}`)} tone={typeTone} />
            {advert.status !== 'OPEN' && <Badge label={t(`status.${advert.status}`)} tone={statusTone} />}
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
              {advert.tags.length > 3 && <Muted>+{advert.tags.length - 3}</Muted>}
            </Row>
          )}

          <Row style={{ justifyContent: 'space-between', marginTop: 2 }}>
            <Row gap={6}>
              <Icon name="euro" size={13} color={colors.orange} />
              <Body style={{ fontWeight: '700', color: colors.ink }}>{priceLabel()}</Body>
            </Row>
            {advert.allowBidding && (
              <Row gap={5}>
                <Icon name="gavel" size={12} color={colors.textFaint} />
                <Muted>
                  {advert.bidCount} {t('advert.bids')}
                </Muted>
              </Row>
            )}
          </Row>

          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 2 }} />

          <Row style={{ justifyContent: 'space-between' }}>
            <Pressable
              onPress={() => router.push(`/user/${advert.author.id}`)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 }}
            >
              <Avatar name={advert.author.displayName} uri={absoluteUrl(advert.author.avatarUrl)} size={26} />
              <Muted numberOfLines={1} style={{ flexShrink: 1 }}>
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

          <Muted style={{ ...typography.tiny }}>{timeAgo(advert.createdAt, t, locale)}</Muted>
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
    </View>
  );
}

export default AdvertCard;
