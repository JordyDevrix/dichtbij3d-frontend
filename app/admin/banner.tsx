import React, { useCallback, useEffect, useState } from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import { api, ApiError } from '../../src/api';
import { absoluteUrl } from '../../src/api/client';
import type { PlatformBanner } from '../../src/api/types';
import { AdminShell } from '../../src/components/AdminShell';
import { Icon } from '../../src/components/Icon';
import {
  Badge,
  Body,
  Button,
  Card,
  H2,
  H3,
  Input,
  Muted,
  Row,
  Spinner,
  SwitchRow,
} from '../../src/components/ui';
import { useToast } from '../../src/context/ToastContext';
import { useI18n } from '../../src/i18n';
import { colors, radius, spacing } from '../../src/theme/theme';
import { pickAndUploadImage } from '../../src/utils/upload';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';

export default function AdminBannerScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const { isWide } = useBreakpoint();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [badgeText, setBadgeText] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const banner = await api.adminBanner();
      setEnabled(banner.enabled);
      setTitle(banner.title || '');
      setSubtitle(banner.subtitle || '');
      setBadgeText(banner.badgeText || '');
      setButtonText(banner.buttonText || '');
      setLinkUrl(banner.linkUrl || '');
      setImageKey(banner.imageKey);
      setImageUrl(banner.imageUrl);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUploadImage = async () => {
    setUploading(true);
    try {
      const uploaded = await pickAndUploadImage('banners');
      if (uploaded) {
        setImageKey(uploaded.objectKey);
        setImageUrl(uploaded.url);
        toast.success(t('common.save'));
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageKey(null);
    setImageUrl(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.adminUpdateBanner({
        enabled,
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        badgeText: badgeText.trim() || null,
        buttonText: buttonText.trim() || null,
        linkUrl: linkUrl.trim() || null,
        imageKey,
        imageUrl: imageUrl?.trim() || null,
      });
      toast.success(t('admin.bannerSaved'));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  const previewImgUrl = imageUrl ? absoluteUrl(imageUrl) : null;

  return (
    <AdminShell>
      {loading ? (
        <Spinner />
      ) : (
        <View style={{ gap: spacing.xl }}>
          <View style={{ gap: 4 }}>
            <H2>{t('admin.bannerTitle')}</H2>
            <Muted>{t('admin.bannerSubtitle')}</Muted>
          </View>

          {/* Form Card */}
          <Card style={{ gap: spacing.lg }}>
            <SwitchRow
              label={t('admin.bannerEnabled')}
              value={enabled}
              onValueChange={setEnabled}
            />

            <View style={{ height: 1, backgroundColor: colors.border }} />

            <Input
              label={t('admin.bannerHeading')}
              value={title}
              onChangeText={setTitle}
              placeholder="Welkom bij Dichtbij3D"
              icon="cube"
            />

            <Input
              label={t('admin.bannerSubheading')}
              value={subtitle}
              onChangeText={setSubtitle}
              placeholder="Vind 3D-printers en ontwerpers bij jou in de buurt..."
              multiline
            />

            <Row gap={spacing.md} style={{ flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 200 }}>
                <Input
                  label={t('admin.bannerBadge')}
                  value={badgeText}
                  onChangeText={setBadgeText}
                  placeholder="Nieuw / Uitgelicht"
                  icon="tag"
                />
              </View>
              <View style={{ flex: 1, minWidth: 200 }}>
                <Input
                  label={t('admin.bannerButtonText')}
                  value={buttonText}
                  onChangeText={setButtonText}
                  placeholder="Ontdek marktplaats"
                  icon="link"
                />
              </View>
            </Row>

            <Input
              label={t('admin.bannerLinkUrl')}
              value={linkUrl}
              onChangeText={setLinkUrl}
              placeholder="/marketplace"
              icon="link"
            />

            {/* Banner Image */}
            <View style={{ gap: spacing.sm }}>
              <Muted style={{ fontWeight: '600', color: colors.ink }}>
                {t('admin.bannerImageUpload')}
              </Muted>

              {previewImgUrl ? (
                <View style={{ gap: spacing.sm }}>
                  <View
                    style={{
                      height: 180,
                      borderRadius: radius.md,
                      overflow: 'hidden',
                      backgroundColor: colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Image
                      source={{ uri: previewImgUrl }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  </View>
                  <Row gap={spacing.sm}>
                    <Button
                      title={t('common.delete')}
                      icon="trash"
                      variant="danger"
                      size="sm"
                      onPress={handleRemoveImage}
                    />
                    <Button
                      title={t('admin.bannerImageUpload')}
                      icon="upload"
                      variant="outline"
                      size="sm"
                      loading={uploading}
                      onPress={handleUploadImage}
                    />
                  </Row>
                </View>
              ) : (
                <Row gap={spacing.sm} style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                  <Button
                    title={t('admin.bannerImageUpload')}
                    icon="upload"
                    variant="outline"
                    loading={uploading}
                    onPress={handleUploadImage}
                  />
                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Input
                      value={imageUrl || ''}
                      onChangeText={setImageUrl}
                      placeholder={t('admin.bannerImageUrl')}
                    />
                  </View>
                </Row>
              )}
            </View>

            <Row style={{ justifyContent: 'flex-end', marginTop: spacing.md }}>
              <Button
                title={t('common.save')}
                icon="check"
                loading={saving}
                onPress={handleSave}
              />
            </Row>
          </Card>

          {/* Live Preview Card */}
          <View style={{ gap: spacing.md }}>
            <H3>Live Preview</H3>
            <Card
              padded={false}
              flat
              style={{
                backgroundColor: colors.surface,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.lg,
              }}
            >
              <View
                style={{
                  flexDirection: isWide && previewImgUrl ? 'row' : 'column',
                  alignItems: 'stretch',
                }}
              >
                <View
                  style={{
                    flex: 1,
                    padding: isWide ? spacing.xxl : spacing.xl,
                    gap: spacing.md,
                    justifyContent: 'center',
                  }}
                >
                  {badgeText ? (
                    <Row gap={6}>
                      <Badge
                        label={badgeText}
                        tone={{ bg: colors.orangeSoft, fg: colors.orangeDarker }}
                      />
                    </Row>
                  ) : null}
                  <H2 style={{ fontSize: isWide ? 34 : 24, lineHeight: isWide ? 40 : 30 }}>
                    {title || 'Titel van de banner'}
                  </H2>
                  {subtitle ? (
                    <Body style={{ color: colors.textMuted, fontSize: isWide ? 15 : 13 }}>
                      {subtitle}
                    </Body>
                  ) : null}
                  <Row gap={spacing.sm} style={{ flexWrap: 'wrap', marginTop: spacing.xs }}>
                    {buttonText ? (
                      <Button title={buttonText} icon="arrowRight" size="md" />
                    ) : null}
                    <Button
                      title={t('home.viewMarketplace')}
                      icon="layers"
                      variant="outline"
                      size="md"
                    />
                  </Row>
                </View>

                {previewImgUrl && (
                  <View
                    style={{
                      width: isWide ? 340 : '100%',
                      height: isWide ? 'auto' : 200,
                      minHeight: isWide ? 220 : undefined,
                      backgroundColor: colors.surfaceAlt,
                    }}
                  >
                    <Image
                      source={{ uri: previewImgUrl }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  </View>
                )}
              </View>
            </Card>
          </View>
        </View>
      )}
    </AdminShell>
  );
}
