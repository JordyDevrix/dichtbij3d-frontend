import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { api, ApiError } from '../../src/api';
import type { BannerMediaType, HeroBannerDto, HeroBannerSettingsDto } from '../../src/api/types';
import { AdminShell } from '../../src/components/AdminShell';
import { BannerMedia } from '../../src/components/BannerMedia';
import { HeroBanner } from '../../src/components/HeroBanner';
import { Icon } from '../../src/components/Icon';
import {
  Badge,
  Body,
  Button,
  Card,
  EmptyState,
  H2,
  H3,
  Input,
  Muted,
  Row,
  Segmented,
  Select,
  Sheet,
  Spinner,
  SwitchRow,
} from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { useI18n } from '../../src/i18n';
import { colors, radius, spacing, typography } from '../../src/theme/theme';
import { pickAndUploadBannerMedia } from '../../src/utils/upload';

interface BannerFormState {
  id?: string;
  title: string;
  subtitle: string;
  mediaUrl: string;
  mediaType: 'AUTO' | 'IMAGE' | 'VIDEO';
  durationSeconds: string;
  linkUrl: string;
  linkText: string;
  enabled: boolean;
}

const EMPTY_FORM: BannerFormState = {
  title: '',
  subtitle: '',
  mediaUrl: '',
  mediaType: 'AUTO',
  durationSeconds: '',
  linkUrl: '',
  linkText: '',
  enabled: true,
};

export default function AdminBannerScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const { isAdmin, booting } = useAuth();

  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState<HeroBannerDto[]>([]);
  const [settings, setSettings] = useState<HeroBannerSettingsDto>({
    slideDurationSeconds: 5,
    showForLoggedInUsers: false,
  });

  // Settings form state
  const [slideDurationInput, setSlideDurationInput] = useState('5');
  const [showForLoggedIn, setShowForLoggedIn] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Banner modal state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<BannerFormState>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);

  // Live preview mode
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewKey, setPreviewKey] = useState(0);

  const refreshPreview = () => setPreviewKey((k) => k + 1);

  const loadData = useCallback(async () => {
    if (booting || !isAdmin) return;
    setLoading(true);
    try {
      const [bannersRes, settingsRes] = await Promise.all([
        api.adminHeroBanners(),
        api.adminHeroBannerSettings(),
      ]);
      setBanners(bannersRes || []);
      setSettings(settingsRes);
      setSlideDurationInput(String(settingsRes.slideDurationSeconds || 5));
      setShowForLoggedIn(settingsRes.showForLoggedInUsers);
      refreshPreview();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }, [booting, isAdmin, t, toast]);

  useEffect(() => {
    if (!booting && isAdmin) {
      void loadData();
    }
  }, [booting, isAdmin, loadData]);

  const saveSettings = async () => {
    const duration = parseInt(slideDurationInput, 10);
    if (isNaN(duration) || duration < 1 || duration > 120) {
      toast.error(t('admin.invalidDuration'));
      return;
    }

    setSavingSettings(true);
    try {
      const updated = await api.adminUpdateHeroBannerSettings({
        slideDurationSeconds: duration,
        showForLoggedInUsers: showForLoggedIn,
      });
      setSettings(updated);
      toast.success(t('admin.settingsSaved'));
      refreshPreview();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    try {
      const uploaded = await pickAndUploadBannerMedia('banners');
      if (uploaded) {
        const url = uploaded.url;
        const isVideo =
          url.endsWith('.mp4') ||
          url.endsWith('.webm') ||
          url.endsWith('.mov') ||
          uploaded.objectKey?.toLowerCase().includes('.mp4');

        setForm((prev) => ({
          ...prev,
          mediaUrl: url,
          mediaType: isVideo ? 'VIDEO' : 'IMAGE',
        }));
        toast.success(t('admin.mediaUploaded'));
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setUploading(false);
    }
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  };

  const openEdit = (banner: HeroBannerDto) => {
    setForm({
      id: banner.id,
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      mediaUrl: banner.mediaUrl,
      mediaType: banner.mediaType,
      durationSeconds: banner.durationSeconds ? String(banner.durationSeconds) : '',
      linkUrl: banner.linkUrl || '',
      linkText: banner.linkText || '',
      enabled: banner.enabled,
    });
    setSheetOpen(true);
  };

  const saveBanner = async () => {
    if (!form.mediaUrl.trim()) {
      toast.error(t('admin.mediaUrlRequired'));
      return;
    }

    let detectedType: BannerMediaType = 'IMAGE';
    if (form.mediaType === 'AUTO') {
      const lower = form.mediaUrl.toLowerCase();
      if (
        lower.endsWith('.mp4') ||
        lower.endsWith('.webm') ||
        lower.endsWith('.mov') ||
        lower.endsWith('.ogg') ||
        lower.endsWith('.m4v')
      ) {
        detectedType = 'VIDEO';
      } else {
        detectedType = 'IMAGE';
      }
    } else {
      detectedType = form.mediaType;
    }

    const duration =
      detectedType === 'IMAGE' && form.durationSeconds.trim()
        ? parseInt(form.durationSeconds.trim(), 10)
        : null;

    setSavingBanner(true);
    try {
      if (form.id) {
        await api.adminUpdateHeroBanner(form.id, {
          title: form.title.trim() || null,
          subtitle: form.subtitle.trim() || null,
          mediaUrl: form.mediaUrl.trim(),
          mediaType: detectedType,
          durationSeconds: duration && duration > 0 ? duration : null,
          linkUrl: form.linkUrl.trim() || null,
          linkText: form.linkText.trim() || null,
          enabled: form.enabled,
        });
        toast.success(t('admin.bannerUpdated'));
      } else {
        await api.adminCreateHeroBanner({
          title: form.title.trim() || null,
          subtitle: form.subtitle.trim() || null,
          mediaUrl: form.mediaUrl.trim(),
          mediaType: detectedType,
          durationSeconds: duration && duration > 0 ? duration : null,
          linkUrl: form.linkUrl.trim() || null,
          linkText: form.linkText.trim() || null,
          enabled: form.enabled,
        });
        toast.success(t('admin.bannerCreated'));
      }
      setSheetOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setSavingBanner(false);
    }
  };

  const toggleBannerEnabled = async (banner: HeroBannerDto) => {
    try {
      await api.adminUpdateHeroBanner(banner.id, {
        enabled: !banner.enabled,
      });
      toast.success(banner.enabled ? t('admin.bannerDisabled') : t('admin.bannerEnabled'));
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    }
  };

  const deleteBanner = (banner: HeroBannerDto) => {
    const doDelete = async () => {
      try {
        await api.adminDeleteHeroBanner(banner.id);
        toast.success(t('admin.bannerDeleted'));
        await loadData();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('admin.confirmDeleteBanner'))) {
        void doDelete();
      }
    } else {
      Alert.alert(t('admin.deleteBannerTitle'), t('admin.confirmDeleteBanner'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => void doDelete() },
      ]);
    }
  };

  const moveBanner = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const newBanners = [...banners];
    const temp = newBanners[index];
    newBanners[index] = newBanners[targetIndex];
    newBanners[targetIndex] = temp;

    setBanners(newBanners);
    try {
      await api.adminReorderHeroBanners(newBanners.map((b) => b.id));
      refreshPreview();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
      await loadData();
    }
  };

  return (
    <AdminShell>
      {loading ? (
        <Spinner />
      ) : (
        <View style={{ gap: spacing.xl }}>
          {/* Header */}
          <View style={{ gap: 4 }}>
            <H2>{t('admin.bannersTitle')}</H2>
            <Muted>{t('admin.bannersSubtitle')}</Muted>
          </View>

          {/* Rotation & Carousel Settings Card */}
          <Card style={{ gap: spacing.lg }}>
            <View style={{ gap: 4 }}>
              <H3>{t('admin.bannerSettings')}</H3>
              <Muted>{t('admin.bannerSettingsDesc')}</Muted>
            </View>

            <Row gap={spacing.lg} style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, minWidth: 260 }}>
                <Input
                  label={t('admin.slideDuration')}
                  hint={t('admin.slideDurationHint')}
                  keyboardType="numeric"
                  value={slideDurationInput}
                  onChangeText={setSlideDurationInput}
                  icon="calendar"
                />
              </View>
              <View style={{ flex: 1, minWidth: 260, paddingTop: 6 }}>
                <SwitchRow
                  label={t('admin.showForLoggedIn')}
                  hint={t('admin.showForLoggedInDesc')}
                  value={showForLoggedIn}
                  onValueChange={setShowForLoggedIn}
                />
              </View>
            </Row>

            <Row style={{ justifyContent: 'flex-end', marginTop: spacing.xs }}>
              <Button
                title={t('common.save')}
                icon="check"
                loading={savingSettings}
                onPress={saveSettings}
              />
            </Row>
          </Card>

          {/* Live Preview Card */}
          <Card padded={false} flat style={{ gap: spacing.md, backgroundColor: 'transparent' }}>
            <Row
              style={{
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: spacing.sm,
                paddingHorizontal: spacing.xs,
              }}
            >
              <View>
                <H3>{t('admin.livePreview')}</H3>
                <Muted>{t('admin.livePreviewDesc')}</Muted>
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

            <View
              style={{
                width: '100%',
                maxWidth: previewMode === 'mobile' ? 440 : undefined,
                alignSelf: 'center',
                borderRadius: radius.xl,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              }}
            >
              <HeroBanner key={previewKey} previewMode={true} />
            </View>
          </Card>

          {/* Banners List Section */}
          <Card style={{ gap: spacing.lg }}>
            <Row
              style={{
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: spacing.md,
              }}
            >
              <View style={{ gap: 2 }}>
                <H3>{t('admin.banners')} ({banners.length})</H3>
                <Muted>Sleep of gebruik pijlen om volgorde van de carrousel aan te passen.</Muted>
              </View>
              <Button
                title={t('admin.addBanner')}
                icon="plus"
                variant="primary"
                onPress={openCreate}
              />
            </Row>

            {banners.length === 0 ? (
              <EmptyState
                icon="image"
                title={t('admin.noBanners')}
                body={t('admin.noBannersBody')}
                action={
                  <Button
                    title={t('admin.addBanner')}
                    icon="plus"
                    onPress={openCreate}
                  />
                }
              />
            ) : (
              <View style={{ gap: spacing.md }}>
                {banners.map((banner, index) => (
                  <Card
                    key={banner.id}
                    style={{
                      backgroundColor: colors.surface,
                      borderColor: banner.enabled ? colors.border : colors.surfaceAlt,
                      opacity: banner.enabled ? 1 : 0.72,
                      padding: spacing.md,
                    }}
                  >
                    <Row
                      style={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: spacing.md,
                      }}
                    >
                      {/* Media preview thumbnail */}
                      <View
                        style={{
                          width: 80,
                          height: 52,
                          borderRadius: radius.md,
                          overflow: 'hidden',
                          backgroundColor: colors.surfaceAlt,
                          borderWidth: 1,
                          borderColor: colors.border,
                          flexShrink: 0,
                        }}
                      >
                        <BannerMedia
                          mediaUrl={banner.mediaUrl}
                          mediaType={banner.mediaType}
                          style={{ width: '100%', height: '100%' }}
                        />
                      </View>

                      {/* Info */}
                      <View style={{ flex: 1, minWidth: 200, gap: 4 }}>
                        <Row gap={spacing.xs} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                          <Body style={{ fontWeight: '600' }}>
                            {banner.title || t('marketplace.heroTitle')}
                          </Body>
                          <Badge
                            label={banner.mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE'}
                            tone={
                              banner.mediaType === 'VIDEO'
                                ? { bg: 'rgba(234, 88, 12, 0.15)', fg: colors.orange }
                                : { bg: colors.surfaceAlt, fg: colors.textMuted }
                            }
                          />
                          <Badge
                            label={banner.enabled ? t('common.active') : t('common.disabled')}
                            tone={
                              banner.enabled
                                ? { bg: 'rgba(34, 197, 94, 0.15)', fg: '#16a34a' }
                                : { bg: colors.border, fg: colors.textMuted }
                            }
                          />
                        </Row>

                        <Muted numberOfLines={1}>
                          {banner.subtitle || t('home.welcomeSubtitle')}
                        </Muted>

                        <Muted style={{ ...typography.tiny }}>
                          {banner.mediaType === 'VIDEO'
                            ? t('admin.playsUntilEnd')
                            : banner.durationSeconds
                            ? `${banner.durationSeconds}s (${t('admin.customDuration')})`
                            : `${settings.slideDurationSeconds}s (${t('admin.defaultDuration')})`}
                          {banner.linkUrl ? ` · CTA: "${banner.linkText || 'Link'}" ➔ ${banner.linkUrl}` : ''}
                        </Muted>
                      </View>

                      {/* Action buttons */}
                      <Row gap={spacing.xs} style={{ alignItems: 'center' }}>
                        {/* Move Up */}
                        <Button
                          title=""
                          icon="chevronUp"
                          variant="ghost"
                          size="sm"
                          disabled={index === 0}
                          onPress={() => moveBanner(index, 'up')}
                        />
                        {/* Move Down */}
                        <Button
                          title=""
                          icon="chevronDown"
                          variant="ghost"
                          size="sm"
                          disabled={index === banners.length - 1}
                          onPress={() => moveBanner(index, 'down')}
                        />
                        {/* Toggle active */}
                        <Button
                          title={banner.enabled ? t('common.disable') : t('common.enable')}
                          variant="ghost"
                          size="sm"
                          onPress={() => toggleBannerEnabled(banner)}
                        />
                        {/* Edit */}
                        <Button
                          title={t('common.edit')}
                          icon="edit"
                          variant="outline"
                          size="sm"
                          onPress={() => openEdit(banner)}
                        />
                        {/* Delete */}
                        <Button
                          title=""
                          icon="trash"
                          variant="danger"
                          size="sm"
                          onPress={() => deleteBanner(banner)}
                        />
                      </Row>
                    </Row>
                  </Card>
                ))}
              </View>
            )}
          </Card>
        </View>
      )}

      {/* Add / Edit Banner Sheet */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={form.id ? t('admin.editBanner') : t('admin.addBanner')}
        width={540}
      >
        <ScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}>
          {/* Media upload or URL */}
          <View style={{ gap: spacing.xs }}>
            <Body style={{ fontWeight: '600' }}>{t('admin.bannerMedia')}</Body>
            <Muted>{t('admin.bannerMediaHelp')}</Muted>

            <Row gap={spacing.sm} style={{ marginTop: spacing.xs }}>
              <Button
                title={uploading ? t('common.loading') : t('admin.uploadMedia')}
                icon="upload"
                loading={uploading}
                onPress={handleUpload}
              />
            </Row>

            <Input
              label={t('admin.orEnterMediaUrl')}
              placeholder="https://.../video.mp4 of /api/files/..."
              value={form.mediaUrl}
              onChangeText={(txt) => setForm((p) => ({ ...p, mediaUrl: txt }))}
            />
          </View>

          {/* Media Type Selection */}
          <Select
            label={t('admin.mediaType')}
            value={form.mediaType}
            options={[
              { value: 'AUTO', label: t('admin.mediaTypeAuto') },
              { value: 'IMAGE', label: t('admin.mediaTypeImage') },
              { value: 'VIDEO', label: t('admin.mediaTypeVideo') },
            ]}
            onChange={(val) => setForm((p) => ({ ...p, mediaType: val as any }))}
          />

          {/* Optional Title */}
          <Input
            label={t('admin.bannerHeading')}
            hint={t('admin.bannerTitleHint')}
            placeholder={t('marketplace.heroTitle')}
            value={form.title}
            onChangeText={(txt) => setForm((p) => ({ ...p, title: txt }))}
          />

          {/* Optional Subtitle */}
          <Input
            label={t('admin.bannerSubheading')}
            hint={t('admin.bannerSubtitleHint')}
            placeholder={t('home.welcomeSubtitle')}
            multiline
            numberOfLines={2}
            value={form.subtitle}
            onChangeText={(txt) => setForm((p) => ({ ...p, subtitle: txt }))}
          />

          {/* Optional custom duration for static images */}
          {form.mediaType !== 'VIDEO' && (
            <Input
              label={t('admin.customDuration')}
              hint={t('admin.customDurationHint')}
              keyboardType="numeric"
              placeholder={String(settings.slideDurationSeconds)}
              value={form.durationSeconds}
              onChangeText={(txt) => setForm((p) => ({ ...p, durationSeconds: txt }))}
            />
          )}

          {/* Optional CTA Link */}
          <Input
            label={t('admin.ctaLinkUrl')}
            hint={t('admin.ctaLinkUrlHint')}
            placeholder="/marketplace"
            value={form.linkUrl}
            onChangeText={(txt) => setForm((p) => ({ ...p, linkUrl: txt }))}
          />

          {/* Optional CTA Text */}
          <Input
            label={t('admin.ctaLinkText')}
            hint={t('admin.ctaLinkTextHint')}
            placeholder="Ontdek marktplaats"
            value={form.linkText}
            onChangeText={(txt) => setForm((p) => ({ ...p, linkText: txt }))}
          />

          {/* Enabled Switch */}
          <SwitchRow
            label={t('admin.bannerEnabledTitle')}
            hint={t('admin.bannerEnabledDesc')}
            value={form.enabled}
            onValueChange={(val) => setForm((p) => ({ ...p, enabled: val }))}
          />

          {/* Actions */}
          <Row gap={spacing.sm} style={{ marginTop: spacing.md }}>
            <Button
              title={t('common.save')}
              icon="check"
              loading={savingBanner}
              onPress={saveBanner}
            />
            <Button
              title={t('common.cancel')}
              variant="outline"
              onPress={() => setSheetOpen(false)}
            />
          </Row>
        </ScrollView>
      </Sheet>
    </AdminShell>
  );
}
