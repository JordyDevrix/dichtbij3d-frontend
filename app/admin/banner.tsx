import React, { useCallback, useEffect, useState } from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
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
  H1,
  H2,
  H3,
  Input,
  Muted,
  Row,
  Segmented,
  Spinner,
  SwitchRow,
} from '../../src/components/ui';
import { useToast } from '../../src/context/ToastContext';
import { useI18n } from '../../src/i18n';
import { useTheme } from '../../src/theme/ThemeContext';
import { colors, layout, radius, shadow, spacing } from '../../src/theme/theme';
import { pickAndUploadImage } from '../../src/utils/upload';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';

export default function AdminBannerScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const { isWide } = useBreakpoint();
  const { scheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

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

          {/* Live Preview Section */}
          <View style={{ gap: spacing.md }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm }}>
              <View>
                <H3>Live Preview</H3>
                <Muted>Directe weergave zoals op de homepage</Muted>
              </View>
              <View style={{ width: 220 }}>
                <Segmented<'desktop' | 'mobile'>
                  value={previewMode}
                  options={[
                    { value: 'desktop', label: 'Desktop', icon: 'laptop' },
                    { value: 'mobile', label: 'Mobiel', icon: 'phone' },
                  ]}
                  onChange={setPreviewMode}
                />
              </View>
            </Row>

            {previewMode === 'desktop' ? (
              /* ---------------- DESKTOP HERO BANNER PREVIEW ---------------- */
              <Card
                padded={false}
                flat
                style={{
                  width: '100%',
                  height: 400,
                  position: 'relative',
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radius.xl,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                {previewImgUrl ? (
                  <Image
                    source={{ uri: previewImgUrl }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      width: '100%',
                      height: '100%',
                    }}
                    resizeMode="cover"
                  />
                ) : null}

                {/* Floating Frosted Glass Card */}
                <View
                  style={{
                    width: '100%',
                    maxWidth: layout.maxWidth,
                    height: '100%',
                    alignSelf: 'center',
                    paddingHorizontal: spacing.xxl,
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  <BlurView
                    intensity={previewImgUrl ? 85 : 0}
                    tint={scheme === 'dark' ? 'dark' : 'light'}
                    style={[
                      {
                        maxWidth: 520,
                        width: '100%',
                        backgroundColor: previewImgUrl
                          ? scheme === 'dark'
                            ? 'rgba(21, 26, 33, 0.82)'
                            : 'rgba(255, 255, 255, 0.88)'
                          : colors.surface,
                        borderRadius: radius.xl,
                        padding: spacing.xxl,
                        gap: spacing.lg,
                        borderWidth: 1,
                        borderColor:
                          scheme === 'dark'
                            ? 'rgba(255, 255, 255, 0.12)'
                            : 'rgba(0, 0, 0, 0.08)',
                        overflow: 'hidden',
                        ...(Platform.OS === 'web' && previewImgUrl
                          ? ({
                              backdropFilter: 'saturate(180%) blur(20px)',
                              WebkitBackdropFilter: 'saturate(180%) blur(20px)',
                              boxShadow:
                                scheme === 'dark'
                                  ? '0 16px 40px rgba(0, 0, 0, 0.45)'
                                  : '0 16px 40px rgba(0, 0, 0, 0.08)',
                            } as any)
                          : null),
                      },
                      shadow.raised,
                    ]}
                  >
                    {badgeText ? (
                      <Row gap={6}>
                        <Badge
                          label={badgeText}
                          tone={{ bg: colors.orangeSoft, fg: colors.orangeDarker }}
                        />
                      </Row>
                    ) : null}
                    <H1 style={{ fontSize: 32, lineHeight: 38 }}>
                      {title || 'Welkom bij Dichtbij3D'}
                    </H1>
                    {subtitle ? (
                      <Body style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
                        {subtitle}
                      </Body>
                    ) : null}
                    <Row gap={spacing.md} style={{ flexWrap: 'wrap', marginTop: spacing.xs }}>
                      {buttonText ? (
                        <Button title={buttonText} icon="arrowRight" size="md" />
                      ) : null}
                      <Button
                        title={t('home.viewMarketplace')}
                        icon="layers"
                        variant={buttonText ? 'outline' : 'primary'}
                        size="md"
                      />
                    </Row>
                  </BlurView>
                </View>
              </Card>
            ) : (
              /* ---------------- MOBILE HERO BANNER PREVIEW ---------------- */
              <View
                style={{
                  width: '100%',
                  maxWidth: 420,
                  alignSelf: 'center',
                  borderRadius: radius.xl,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  ...shadow.raised,
                }}
              >
                {previewImgUrl ? (
                  <View
                    style={{
                      width: '100%',
                      aspectRatio: 16 / 9,
                      backgroundColor: colors.surfaceAlt,
                      overflow: 'hidden',
                    }}
                  >
                    <Image
                      source={{ uri: previewImgUrl }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  </View>
                ) : null}

                <View
                  style={{
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.xl,
                    gap: spacing.md,
                    backgroundColor: colors.surface,
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
                  <H1 style={{ fontSize: 24, lineHeight: 30 }}>
                    {title || 'Welkom bij Dichtbij3D'}
                  </H1>
                  {subtitle ? (
                    <Body style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>
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
                      variant={buttonText ? 'outline' : 'primary'}
                      size="md"
                    />
                  </Row>
                </View>
              </View>
            )}
          </View>
        </View>
      )}
    </AdminShell>
  );
}

