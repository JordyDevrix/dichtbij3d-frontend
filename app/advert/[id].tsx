import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, ApiError } from '../../src/api';
import { absoluteUrl } from '../../src/api/client';
import type { AdvertDetail } from '../../src/api/types';
import { Icon } from '../../src/components/Icon';
import { Page } from '../../src/components/Page';
import {
  Avatar,
  Badge,
  Body,
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  H1,
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
import { advertTypeColor, colors, radius, spacing, statusColor } from '../../src/theme/theme';
import { formatDate, money, timeAgo, toCents } from '../../src/utils/format';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';

export default function AdvertDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useI18n();
  const { user, isAdmin, requireAuth } = useAuth();
  const toast = useToast();
  const { isWide } = useBreakpoint();

  const [advert, setAdvert] = useState<AdvertDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);

  const [reactionBody, setReactionBody] = useState('');
  const [isApplication, setIsApplication] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [bidOpen, setBidOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [activeImage, setActiveImage] = useState(0);

  const openedAt = useRef(Date.now());
  const pinged = useRef(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const detail = await api.advert(id);
      setAdvert(detail);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    pinged.current = false;
    openedAt.current = Date.now();
    void load();
  }, [load]);

  // Smart view counting: only report a view once the visitor actually stayed a moment.
  useEffect(() => {
    if (!id || !advert) return;
    const timer = setTimeout(() => {
      if (pinged.current) return;
      pinged.current = true;
      api.pingView(id, Date.now() - openedAt.current).catch(() => undefined);
    }, 2200);
    return () => clearTimeout(timer);
  }, [id, advert]);

  if (loading) return <Spinner label={t('common.loading')} />;
  if (notFound || !advert)
    return (
      <Page>
        <Card>
          <EmptyState
            icon="warning"
            title={t('errors.notFound')}
            action={<Button title={t('common.back')} icon="back" variant="outline" onPress={() => router.push('/')} />}
          />
        </Card>
      </Page>
    );

  const isOwner = user?.id === advert.author.id;
  const typeTone = advertTypeColor[advert.type];
  const statusTone = statusColor[advert.status] ?? statusColor.OPEN;
  const images = advert.imageUrls.map((url) => absoluteUrl(url)!).filter(Boolean);

  const run = async (action: () => Promise<unknown>, successMessage?: string) => {
    setBusy(true);
    try {
      await action();
      if (successMessage) toast.success(successMessage);
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const submitReaction = () => {
    if (!requireAuth(`/advert/${advert.id}`)) return;
    if (reactionBody.trim().length < 1) return;
    void run(async () => {
      await api.addReaction(advert.id, { body: reactionBody.trim(), isApplication });
      setReactionBody('');
      setIsApplication(false);
    }, t('advert.reactSend'));
  };

  const submitBid = () => {
    const cents = toCents(bidAmount);
    if (!cents || cents <= 0) return;
    void run(async () => {
      await api.placeBid(advert.id, { amountCents: cents, message: bidMessage.trim() || undefined });
      setBidOpen(false);
      setBidAmount('');
      setBidMessage('');
    }, t('advert.placeBid'));
  };

  const submitDelete = () => {
    if (deleteReason.trim().length < 3 && !isOwner) return;
    void run(async () => {
      if (isAdmin && !isOwner) await api.moderateDeleteAdvert(advert.id, deleteReason.trim());
      else await api.deleteAdvert(advert.id, deleteReason.trim() || undefined);
      setDeleteOpen(false);
      router.replace('/');
    });
  };

  const submitReport = () => {
    if (!requireAuth(`/advert/${advert.id}`)) return;
    if (reportReason.trim().length < 3) return;
    void run(async () => {
      await api.report({ advertId: advert.id, reason: reportReason.trim() });
      setReportOpen(false);
      setReportReason('');
    }, t('common.submit'));
  };

  const priceBlock = () => {
    if (advert.priceCents != null)
      return <H1 style={{ color: colors.orange }}>{money(advert.priceCents, locale, advert.currency)}</H1>;
    if (advert.budgetMinCents != null || advert.budgetMaxCents != null)
      return (
        <H2 style={{ color: colors.orange }}>
          {advert.budgetMinCents != null ? money(advert.budgetMinCents, locale) : ''}
          {advert.budgetMinCents != null && advert.budgetMaxCents != null ? ' – ' : ''}
          {advert.budgetMaxCents != null ? money(advert.budgetMaxCents, locale) : ''}
        </H2>
      );
    return null;
  };

  return (
    <Page onRefresh={() => void load()}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm }}>
        <Button title={t('common.back')} icon="back" variant="ghost" size="sm" onPress={() => router.back()} />
        <Row gap={spacing.sm}>
          {!isOwner && user && (
            <Button title={t('advert.report')} icon="flag" variant="ghost" size="sm" onPress={() => setReportOpen(true)} />
          )}
          {(isOwner || advert.canModerate) && (
            <Button
              title={isAdmin && !isOwner ? t('advert.moderationDelete') : t('common.delete')}
              icon="trash"
              variant="outline"
              size="sm"
              onPress={() => setDeleteOpen(true)}
            />
          )}
        </Row>
      </Row>

      <View style={{ flexDirection: isWide ? 'row' : 'column', gap: spacing.lg, alignItems: 'flex-start' }}>
        {/* ------------------------------------------------ main column */}
        <View style={{ flex: 2, gap: spacing.lg, width: '100%' }}>
          <Card padded={false} style={{ overflow: 'hidden' }}>
            <View style={{ height: isWide ? 380 : 220, backgroundColor: colors.orangeSofter }}>
              {images.length > 0 ? (
                <Image source={{ uri: images[activeImage] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="cube" size={52} color={colors.orangeBorder} />
                </View>
              )}
            </View>
            {images.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
              >
                {images.map((uri, index) => (
                  <Pressable key={uri} onPress={() => setActiveImage(index)}>
                    <Image
                      source={{ uri }}
                      style={{
                        width: 72,
                        height: 56,
                        borderRadius: radius.sm,
                        borderWidth: 2,
                        borderColor: index === activeImage ? colors.orange : 'transparent',
                      }}
                    />
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <View style={{ padding: spacing.xl, gap: spacing.md }}>
              <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
                <Badge label={t(`advertTypes.${advert.type}`)} tone={typeTone} />
                <Badge label={t(`status.${advert.status}`)} tone={statusTone} />
              </Row>
              <H1>{advert.title}</H1>
              <Row gap={spacing.lg} style={{ flexWrap: 'wrap' }}>
                <Row gap={6}>
                  <Icon name="clock" size={12} color={colors.textFaint} />
                  <Muted>{timeAgo(advert.createdAt, t, locale)}</Muted>
                </Row>
                <Row gap={6}>
                  <Icon name="eye" size={12} color={colors.textFaint} />
                  <Muted>
                    {advert.viewCount} {t('advert.views')}
                  </Muted>
                </Row>
                {advert.city && (
                  <Row gap={6}>
                    <Icon name="location" size={12} color={colors.textFaint} />
                    <Muted>{advert.city}</Muted>
                  </Row>
                )}
                {advert.deadline && (
                  <Row gap={6}>
                    <Icon name="calendar" size={12} color={colors.textFaint} />
                    <Muted>
                      {t('advert.deadline')}: {formatDate(advert.deadline, locale)}
                    </Muted>
                  </Row>
                )}
              </Row>

              {advert.hiddenAfterAccept && advert.status === 'ACCEPTED' && (
                <Card style={{ backgroundColor: colors.infoSoft, borderColor: colors.infoSoft }}>
                  <Row>
                    <Icon name="eyeOff" size={14} color={colors.info} />
                    <Muted style={{ color: colors.info, flex: 1 }}>{t('advert.hiddenNotice')}</Muted>
                  </Row>
                </Card>
              )}

              <Divider style={{ marginVertical: spacing.sm }} />
              <H3>{t('advert.description')}</H3>
              <Body>{advert.description}</Body>

              {advert.tags.length > 0 && (
                <Row gap={spacing.sm} style={{ flexWrap: 'wrap', marginTop: spacing.sm }}>
                  {advert.tags.map((tag) => (
                    <Chip key={tag.id} label={tag.label} icon="tag" size="sm" />
                  ))}
                </Row>
              )}

              {advert.model && (
                <Pressable onPress={() => router.push(`/model/${advert.model!.id}`)}>
                  <Card style={{ marginTop: spacing.md, backgroundColor: colors.surfaceAlt }}>
                    <Row>
                      <Icon name="cube" size={16} color={colors.orange} />
                      <View style={{ flex: 1 }}>
                        <Muted>{t('advert.linkedModel')}</Muted>
                        <Body style={{ fontWeight: '700' }}>{advert.model.title}</Body>
                      </View>
                      <Icon name="external" size={13} color={colors.textFaint} />
                    </Row>
                  </Card>
                </Pressable>
              )}
            </View>
          </Card>

          {/* ------------------------------------------------ reactions */}
          <Card style={{ gap: spacing.md }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <H2>{t('advert.reactions')}</H2>
              <Badge label={String(advert.reactions.length)} tone={{ bg: colors.orangeSoft, fg: colors.orangeDarker }} />
            </Row>

            {advert.reactions.length === 0 && <Muted>{t('advert.noReactions')}</Muted>}

            {advert.reactions.map((reaction) => (
              <View key={reaction.id} style={{ gap: spacing.sm }}>
                <Divider />
                <Row style={{ alignItems: 'flex-start' }}>
                  <Avatar name={reaction.author.displayName} uri={absoluteUrl(reaction.author.avatarUrl)} size={36} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Pressable onPress={() => router.push(`/user/${reaction.author.id}`)}>
                        <Body style={{ fontWeight: '700' }}>{reaction.author.displayName}</Body>
                      </Pressable>
                      <Muted>{timeAgo(reaction.createdAt, t, locale)}</Muted>
                    </Row>
                    {reaction.isApplication && (
                      <Badge label={t('advert.reactAsApplication')} tone={{ bg: colors.successSoft, fg: colors.success }} />
                    )}
                    <Body>{reaction.body}</Body>
                    <Row gap={spacing.sm} style={{ marginTop: 4 }}>
                      {isOwner && advert.status === 'OPEN' && (
                        <Button
                          title={t('advert.acceptHelper')}
                          icon="handshake"
                          size="sm"
                          loading={busy}
                          onPress={() =>
                            void run(
                              () => api.acceptAdvert(advert.id, { reactionId: reaction.id }),
                              t('advert.acceptedBy', { name: reaction.author.displayName }),
                            )
                          }
                        />
                      )}
                      {reaction.canDelete && (
                        <Button
                          title={t('common.delete')}
                          icon="trash"
                          size="sm"
                          variant="ghost"
                          onPress={() => void run(() => api.deleteReaction(advert.id, reaction.id))}
                        />
                      )}
                    </Row>
                  </View>
                </Row>
              </View>
            ))}

            {advert.status === 'OPEN' && !isOwner && (
              <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                <Divider />
                <H3>{t('advert.reactTitle')}</H3>
                {user ? (
                  <>
                    <Input
                      value={reactionBody}
                      onChangeText={setReactionBody}
                      placeholder={t('advert.reactPlaceholder')}
                      multiline
                    />
                    <SwitchRow
                      label={t('advert.reactAsApplication')}
                      value={isApplication}
                      onValueChange={setIsApplication}
                    />
                    <Button title={t('advert.reactSend')} icon="comments" loading={busy} onPress={submitReaction} />
                  </>
                ) : (
                  <Card style={{ backgroundColor: colors.orangeSofter, borderColor: colors.orangeBorder }}>
                    <H3>{t('common.signInRequired')}</H3>
                    <Muted style={{ marginVertical: spacing.sm }}>{t('common.signInRequiredBody')}</Muted>
                    <Row gap={spacing.sm}>
                      <Button title={t('common.createAccount')} onPress={() => router.push('/auth/register')} />
                      <Button title={t('common.orSignIn')} variant="outline" onPress={() => router.push('/auth/login')} />
                    </Row>
                  </Card>
                )}
              </View>
            )}
          </Card>
        </View>

        {/* ------------------------------------------------ side column */}
        <View style={{ flex: 1, gap: spacing.lg, width: '100%', minWidth: 280 }}>
          <Card style={{ gap: spacing.md }}>
            {priceBlock()}
            {advert.allowBidding && (
              <>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Muted>{t('advert.currentBid')}</Muted>
                  <Body style={{ fontWeight: '700' }}>
                    {advert.highestBidCents != null ? money(advert.highestBidCents, locale) : t('advert.noBids')}
                  </Body>
                </Row>
                {!isOwner && advert.status === 'OPEN' && (
                  <Button
                    title={t('advert.placeBid')}
                    icon="gavel"
                    full
                    onPress={() => {
                      if (!requireAuth(`/advert/${advert.id}`)) return;
                      setBidOpen(true);
                    }}
                  />
                )}
              </>
            )}

            {isOwner && (
              <View style={{ gap: spacing.sm }}>
                {advert.status !== 'COMPLETED' && (
                  <Button
                    title={t('advert.markCompleted')}
                    icon="checkCircle"
                    variant="outline"
                    full
                    loading={busy}
                    onPress={() => void run(() => api.setAdvertStatus(advert.id, 'COMPLETED'))}
                  />
                )}
                {advert.status === 'OPEN' && (
                  <Button
                    title={t('advert.markCancelled')}
                    icon="ban"
                    variant="ghost"
                    full
                    loading={busy}
                    onPress={() => void run(() => api.setAdvertStatus(advert.id, 'CANCELLED'))}
                  />
                )}
              </View>
            )}
          </Card>

          <Card style={{ gap: spacing.md }}>
            <Muted>{t('advert.postedBy')}</Muted>
            <Pressable onPress={() => router.push(`/user/${advert.author.id}`)}>
              <Row>
                <Avatar name={advert.author.displayName} uri={absoluteUrl(advert.author.avatarUrl)} size={44} />
                <View style={{ flex: 1 }}>
                  <H3>{advert.author.displayName}</H3>
                  <Muted>{advert.author.city ?? ''}</Muted>
                </View>
                <Icon name="external" size={13} color={colors.textFaint} />
              </Row>
            </Pressable>
            <Row gap={6} style={{ flexWrap: 'wrap' }}>
              {advert.author.roles.map((role) => (
                <Chip key={role} label={t(`roles.${role}`)} size="sm" />
              ))}
            </Row>
          </Card>

          {advert.acceptedBy && (
            <Card style={{ backgroundColor: colors.infoSoft, borderColor: colors.infoSoft, gap: spacing.sm }}>
              <Row>
                <Icon name="handshake" size={16} color={colors.info} />
                <Body style={{ fontWeight: '700', color: colors.info, flex: 1 }}>
                  {t('advert.acceptedBy', { name: advert.acceptedBy.displayName })}
                </Body>
              </Row>
              {advert.acceptedAt && <Muted>{formatDate(advert.acceptedAt, locale)}</Muted>}
            </Card>
          )}

          {advert.bids.length > 0 && (
            <Card style={{ gap: spacing.sm }}>
              <H3>{t('advert.bids')}</H3>
              {advert.bids.map((bid) => (
                <View key={bid.id} style={{ gap: 4 }}>
                  <Divider />
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Row gap={spacing.sm}>
                      <Avatar name={bid.bidder.displayName} uri={absoluteUrl(bid.bidder.avatarUrl)} size={26} />
                      <Muted>{bid.bidder.displayName}</Muted>
                    </Row>
                    <Body style={{ fontWeight: '700' }}>{money(bid.amountCents, locale)}</Body>
                  </Row>
                  {bid.message ? <Muted>{bid.message}</Muted> : null}
                  {isOwner && bid.status === 'PENDING' && (
                    <Row gap={spacing.sm}>
                      <Button
                        title={t('advert.acceptBid')}
                        size="sm"
                        loading={busy}
                        onPress={() => void run(() => api.acceptBid(advert.id, bid.id))}
                      />
                      <Button
                        title={t('advert.rejectBid')}
                        size="sm"
                        variant="ghost"
                        loading={busy}
                        onPress={() => void run(() => api.rejectBid(advert.id, bid.id))}
                      />
                    </Row>
                  )}
                  {bid.status !== 'PENDING' && (
                    <Badge
                      label={bid.status}
                      tone={
                        bid.status === 'ACCEPTED'
                          ? { bg: colors.successSoft, fg: colors.success }
                          : { bg: colors.surfaceAlt, fg: colors.textMuted }
                      }
                    />
                  )}
                </View>
              ))}
            </Card>
          )}
        </View>
      </View>

      {/* ------------------------------------------------ modals */}
      <Sheet open={bidOpen} onClose={() => setBidOpen(false)} title={t('advert.placeBid')} width={420}>
        <Input
          label={t('advert.bidAmount')}
          value={bidAmount}
          onChangeText={setBidAmount}
          keyboardType="decimal-pad"
          icon="euro"
        />
        <Input label={t('advert.bidMessage')} value={bidMessage} onChangeText={setBidMessage} multiline />
        <Row style={{ justifyContent: 'flex-end' }}>
          <Button title={t('common.cancel')} variant="ghost" onPress={() => setBidOpen(false)} />
          <Button title={t('advert.placeBid')} icon="gavel" loading={busy} onPress={submitBid} />
        </Row>
      </Sheet>

      <Sheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title={t('advert.deleteReason')} width={440}>
        <Muted>{isOwner ? t('advert.deleteOwnConfirm') : t('advert.moderationTitle')}</Muted>
        <Input
          value={deleteReason}
          onChangeText={setDeleteReason}
          placeholder={t('advert.deleteReasonPlaceholder')}
          multiline
        />
        <Row style={{ justifyContent: 'flex-end' }}>
          <Button title={t('common.cancel')} variant="ghost" onPress={() => setDeleteOpen(false)} />
          <Button title={t('common.delete')} variant="danger" loading={busy} onPress={submitDelete} />
        </Row>
      </Sheet>

      <Sheet open={reportOpen} onClose={() => setReportOpen(false)} title={t('advert.reportReason')} width={440}>
        <Input value={reportReason} onChangeText={setReportReason} multiline icon="flag" />
        <Row style={{ justifyContent: 'flex-end' }}>
          <Button title={t('common.cancel')} variant="ghost" onPress={() => setReportOpen(false)} />
          <Button title={t('common.submit')} loading={busy} onPress={submitReport} />
        </Row>
      </Sheet>
    </Page>
  );
}
