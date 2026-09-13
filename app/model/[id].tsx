import React, { useCallback, useEffect, useState } from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, ApiError } from '../../src/api';
import { absoluteUrl, request } from '../../src/api/client';
import type { ModelDetail } from '../../src/api/types';
import { Icon } from '../../src/components/Icon';
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
  Row,
  Spinner,
} from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { useI18n } from '../../src/i18n';
import { colors, radius, spacing } from '../../src/theme/theme';
import { fileSize, formatDate, money } from '../../src/utils/format';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';

export default function ModelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useI18n();
  const { user, requireAuth } = useAuth();
  const toast = useToast();
  const { isWide } = useBreakpoint();

  const [detail, setDetail] = useState<ModelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setDetail(await api.model(id));
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  const { model, files } = detail;
  const isOwner = user?.id === model.owner.id;

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
      <Button title={t('common.back')} icon="back" variant="ghost" size="sm" onPress={() => router.back()} />

      <View style={{ flexDirection: isWide ? 'row' : 'column', gap: spacing.lg, alignItems: 'flex-start' }}>
        <View style={{ flex: 2, gap: spacing.lg, width: '100%' }}>
          <Card padded={false} style={{ overflow: 'hidden' }}>
            <View style={{ height: isWide ? 340 : 200, backgroundColor: colors.orangeSofter }}>
              {model.thumbnailUrl ? (
                <Image
                  source={{ uri: absoluteUrl(model.thumbnailUrl) }}
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

        <View style={{ flex: 1, gap: spacing.lg, width: '100%', minWidth: 280 }}>
          <Card style={{ gap: spacing.md }}>
            <H1 style={{ color: colors.orange }}>
              {model.priceCents > 0 ? money(model.priceCents, locale, model.currency) : t('common.free')}
            </H1>
            {model.hasAccess ? (
              <Badge label={t('models.owned')} tone={{ bg: colors.successSoft, fg: colors.success }} />
            ) : (
              <Button
                title={model.priceCents > 0 ? t('models.buy', { price: money(model.priceCents, locale) }) : t('models.getFree')}
                icon="coins"
                full
                loading={busy}
                onPress={acquire}
              />
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
    </Page>
  );
}
