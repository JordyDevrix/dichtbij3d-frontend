import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, ApiError } from '../../src/api';
import { absoluteUrl, request } from '../../src/api/client';
import type { ModelDetail } from '../../src/api/types';
import { Icon } from '../../src/components/Icon';
import { AppImage } from '../../src/components/AppImage';
import { Page } from '../../src/components/Page';
import {
  Avatar,
  Badge,
  Body,
  Button,
  Card,
  Divider,
  EmptyState,
  H1,
  H3,
  Muted,
  Input,
  Row,
  Sheet,
  Spinner,
} from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { useGoBack } from '../../src/hooks/useGoBack';
import { useI18n } from '../../src/i18n';
import { colors, radius, spacing } from '../../src/theme/theme';
import { fileSize, formatDate, money } from '../../src/utils/format';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';

export default function ModelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useGoBack('/models');
  const { t, locale } = useI18n();
  const { user, requireAuth, booting } = useAuth();
  const toast = useToast();
  const { isWide } = useBreakpoint();

  const [detail, setDetail] = useState<ModelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [buyMessage, setBuyMessage] = useState('');

  const load = useCallback(async () => {
    if (!id || booting) return;
    try {
      setDetail(await api.model(id));
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
    // Waiting for the stored token keeps the answer viewer-aware: an anonymous
    // request would report no access and hide the owner's own actions.
  }, [id, booting]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  if (loading) return <Spinner label={t('common.loading')} />;
  if (!detail)
    return (
      <Page>
        <Card>
          <EmptyState
            icon="warning"
            title={t('errors.notFound')}
            action={<Button title={t('common.back')} icon="back" variant="outline" onPress={() => router.push('/models')} />}
          />
        </Card>
      </Page>
    );

  const { model, files, purchaseRequests, myPurchaseStatus } = detail;
  const isOwner = user?.id === model.owner.id;
  const isPaid = model.priceCents > 0;

  /** Paid models are never handed out automatically: the owner has to release them. */
  const requestPurchase = async () => {
    if (!requireAuth(`/model/${model.id}`)) return;
    setBusy(true);
    try {
      const result = await api.purchaseModel(model.id, buyMessage.trim() || undefined);
      setBuyOpen(false);
      setBuyMessage('');
      toast.success(t('models.purchaseSent'));
      router.push(`/messages/${result.conversationId}`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const decide = async (requestId: string, grant: boolean) => {
    setBusy(true);
    try {
      if (grant) await api.grantModelPurchase(model.id, requestId);
      else await api.declineModelPurchase(model.id, requestId);
      toast.success(grant ? t('models.accessGranted') : t('models.requestDeclined'));
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const acquire = async () => {
    if (!requireAuth(`/model/${model.id}`)) return;
    setBusy(true);
    try {
      await api.acquireModel(model.id);
      toast.success(t('models.owned'));
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const download = async (fileId: string, fileName: string) => {
    if (!requireAuth(`/model/${model.id}`)) return;
    setBusy(true);
    try {
      const response = await request<Response>(`/api/models/${model.id}/files/${fileId}/download`, { raw: true });
      if (Platform.OS === 'web') {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      } else {
        toast.toast(t('models.download'));
      }
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Button title={t('common.back')} icon="back" variant="ghost" size="sm" onPress={goBack} />

      <View
        style={{
          flexDirection: isWide ? 'row' : 'column',
          gap: spacing.lg,
          alignItems: isWide ? 'flex-start' : 'stretch',
        }}
      >
        <View style={{ flex: isWide ? 2 : undefined, gap: spacing.lg, width: '100%' }}>
          <Card padded={false} style={{ overflow: 'hidden' }}>
            <View style={{ height: isWide ? 340 : 200, backgroundColor: colors.orangeSofter }}>
              {model.thumbnailUrl ? (
                <AppImage
                  uri={absoluteUrl(model.thumbnailUrl)}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="cubes" size={50} color={colors.orangeBorder} />
                </View>
              )}
            </View>
            <View style={{ padding: spacing.xl, gap: spacing.md }}>
              <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
                <Badge label={model.license.replace(/_/g, ' ')} tone={{ bg: colors.orangeSoft, fg: colors.orangeDarker }} />
                <Badge label={t(`models.${model.visibility}`)} tone={{ bg: colors.surfaceAlt, fg: colors.textMuted }} />
              </Row>
              <H1>{model.title}</H1>
              <Row gap={spacing.lg} style={{ flexWrap: 'wrap' }}>
                <Row gap={6}>
                  <Icon name="download" size={12} color={colors.textFaint} />
                  <Muted>
                    {model.downloadCount} {t('models.downloads')}
                  </Muted>
                </Row>
                <Row gap={6}>
                  <Icon name="layers" size={12} color={colors.textFaint} />
                  <Muted>
                    {model.fileCount} {t('models.files')}
                  </Muted>
                </Row>
                <Row gap={6}>
                  <Icon name="clock" size={12} color={colors.textFaint} />
                  <Muted>{formatDate(model.createdAt, locale)}</Muted>
                </Row>
              </Row>
              {model.description ? (
                <>
                  <Divider style={{ marginVertical: spacing.sm }} />
                  <Body>{model.description}</Body>
                </>
              ) : null}
            </View>
          </Card>

          <Card style={{ gap: spacing.sm }}>
            <H3>{t('models.files')}</H3>
            {files.map((file) => (
              <View key={file.id}>
                <Divider />
                <Row style={{ justifyContent: 'space-between', paddingVertical: spacing.sm }}>
                  <Row gap={spacing.sm} style={{ flex: 1 }}>
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: radius.sm,
                        backgroundColor: colors.orangeSoft,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name="cube" size={13} color={colors.orange} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Body numberOfLines={1} style={{ fontWeight: '600' }}>
                        {file.fileName}
                      </Body>
                      <Muted>{fileSize(file.sizeBytes)}</Muted>
                    </View>
                  </Row>
                  {file.downloadUrl ? (
                    <Button
                      title={t('models.download')}
                      icon="download"
                      size="sm"
                      variant="outline"
                      loading={busy}
                      onPress={() => void download(file.id, file.fileName)}
                    />
                  ) : (
                    <Icon name="lock" size={13} color={colors.textFaint} />
                  )}
                </Row>
              </View>
            ))}
          </Card>
        </View>

        <View
          style={{
            flex: isWide ? 1 : undefined,
            gap: spacing.lg,
            width: '100%',
            minWidth: isWide ? 280 : undefined,
          }}
        >
          <Card style={{ gap: spacing.md }}>
            <H1 style={{ color: colors.orange }}>
              {model.priceCents > 0 ? money(model.priceCents, locale, model.currency) : t('common.free')}
            </H1>
            {model.hasAccess ? (
              <Badge label={t('models.owned')} tone={{ bg: colors.successSoft, fg: colors.success }} />
            ) : isOwner ? null : isPaid ? (
              myPurchaseStatus === 'PENDING' ? (
                <>
                  <Badge label={t('models.purchasePending')} tone={{ bg: colors.warningSoft, fg: colors.warning }} />
                  <Muted style={{ fontSize: 12 }}>{t('models.purchasePendingHint')}</Muted>
                </>
              ) : (
                <>
                  <Button
                    title={t('models.buy', { price: money(model.priceCents, locale, model.currency) })}
                    icon="cart"
                    full
                    loading={busy}
                    onPress={() => {
                      if (!requireAuth(`/model/${model.id}`)) return;
                      setBuyOpen(true);
                    }}
                  />
                  <Muted style={{ fontSize: 12 }}>{t('models.buyHint')}</Muted>
                  {myPurchaseStatus === 'DECLINED' && <Muted>{t('models.purchaseDeclined')}</Muted>}
                </>
              )
            ) : (
              <Button title={t('models.getFree')} icon="download" full loading={busy} onPress={acquire} />
            )}
            {isOwner && (
              <Button
                title={t('common.delete')}
                icon="trash"
                variant="outline"
                full
                loading={busy}
                onPress={async () => {
                  setBusy(true);
                  try {
                    await api.deleteModel(model.id);
                    router.replace('/models');
                  } catch (error) {
                    toast.error(error instanceof ApiError ? error.message : t('errors.generic'));
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            )}
          </Card>

          {isOwner && purchaseRequests.length > 0 && (
            <Card style={{ gap: spacing.md }}>
              <H3>{t('models.buyers')}</H3>
              <Muted style={{ fontSize: 12 }}>{t('models.buyersHint')}</Muted>
              {purchaseRequests.map((purchase) => (
                <View key={purchase.id} style={{ gap: spacing.sm }}>
                  <Divider />
                  <Row style={{ alignItems: 'flex-start' }}>
                    <Avatar name={purchase.buyer.displayName} uri={absoluteUrl(purchase.buyer.avatarUrl)} size={32} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Pressable onPress={() => router.push(`/user/${purchase.buyer.id}`)}>
                        <Body style={{ fontWeight: '700' }}>{purchase.buyer.displayName}</Body>
                      </Pressable>
                      {purchase.message ? <Muted>{purchase.message}</Muted> : null}
                      {purchase.status === 'PENDING' ? (
                        <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
                          <Button
                            title={t('models.grantAccess')}
                            icon="check"
                            size="sm"
                            loading={busy}
                            onPress={() => void decide(purchase.id, true)}
                          />
                          <Button
                            title={t('models.declineAccess')}
                            icon="ban"
                            size="sm"
                            variant="ghost"
                            loading={busy}
                            onPress={() => void decide(purchase.id, false)}
                          />
                          {purchase.conversationId && (
                            <Button
                              title={t('chat.contact')}
                              icon="envelope"
                              size="sm"
                              variant="outline"
                              onPress={() => router.push(`/messages/${purchase.conversationId}`)}
                            />
                          )}
                        </Row>
                      ) : (
                        <Badge
                          label={
                            purchase.status === 'GRANTED' ? t('models.accessGranted') : t('models.requestDeclined')
                          }
                          tone={
                            purchase.status === 'GRANTED'
                              ? { bg: colors.successSoft, fg: colors.success }
                              : { bg: colors.surfaceAlt, fg: colors.textMuted }
                          }
                        />
                      )}
                    </View>
                  </Row>
                </View>
              ))}
            </Card>
          )}

          <Card style={{ gap: spacing.md }}>
            <Muted>{t('advert.postedBy')}</Muted>
            <Pressable onPress={() => router.push(`/user/${model.owner.id}`)}>
              <Row>
                <Avatar name={model.owner.displayName} uri={absoluteUrl(model.owner.avatarUrl)} size={44} />
                <View style={{ flex: 1 }}>
                  <H3>{model.owner.displayName}</H3>
                  <Muted>{model.owner.city ?? ''}</Muted>
                </View>
                <Icon name="external" size={13} color={colors.textFaint} />
              </Row>
            </Pressable>
          </Card>
        </View>
      </View>

      <Sheet open={buyOpen} onClose={() => setBuyOpen(false)} title={t('models.buyTitle')} width={440}>
        <Body style={{ fontWeight: '700' }}>{model.title}</Body>
        <H1 style={{ color: colors.orange }}>{money(model.priceCents, locale, model.currency)}</H1>
        <Muted>{t('models.buyIntro')}</Muted>
        <Input
          label={t('advert.buyMessage')}
          value={buyMessage}
          onChangeText={setBuyMessage}
          placeholder={t('advert.buyMessagePlaceholder')}
          multiline
        />
        <Row style={{ justifyContent: 'flex-end' }}>
          <Button title={t('common.cancel')} variant="ghost" onPress={() => setBuyOpen(false)} />
          <Button title={t('models.buyConfirm')} icon="cart" loading={busy} onPress={requestPurchase} />
        </Row>
      </Sheet>
    </Page>
  );
}
