import React, { useCallback, useEffect, useState } from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { api, ApiError } from '../../src/api';
import { absoluteUrl } from '../../src/api/client';
import type { PlatformBannerMedia, PlatformBannerMediaUpdateRequest } from '../../src/api/types';
import { AdminShell } from '../../src/components/AdminShell';
import { HeroBackgroundSlider } from '../../src/components/HeroBackgroundSlider';
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
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { useI18n } from '../../src/i18n';
import { useTheme } from '../../src/theme/ThemeContext';
import { colors, layout, radius, shadow, spacing } from '../../src/theme/theme';
import { detectMediaType, pickAndUploadBannerMedia } from '../../src/utils/upload';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';

export default function AdminBannerScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const { isAdmin, booting } = useAuth();
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

  // Media list state
  const [mediaList, setMediaList] = useState<PlatformBannerMedia[]>([]);

  // Manual URL add input
  const [newUrl, setNewUrl] = useState('');
  const [newMediaType, setNewMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [newDuration, setNewDuration] = useState('5');

  const load = useCallback(async () => {
    if (booting || !isAdmin) return;
    setLoading(true);
    try {
      const banner = await api.adminBanner();
      setEnabled(banner.enabled);
      setTitle(banner.title || '');
      setSubtitle(banner.subtitle || '');
      setBadgeText(banner.badgeText || '');
      setButtonText(banner.buttonText || '');
      setLinkUrl(banner.linkUrl || '');

      if (banner.media && banner.media.length > 0) {
        setMediaList(banner.media);
      } else if (banner.imageUrl || banner.imageKey) {
        const url = banner.imageUrl || (banner.imageKey ? `/api/files/${banner.imageKey}` : '');
        setMediaList([
          {
            id: null,
            mediaType: detectMediaType(url, null),
            mediaUrl: url,
            mediaKey: banner.imageKey,
            durationSeconds: 5,
            sortOrder: 0,
          },
        ]);
      } else {
        setMediaList([]);
      }
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

  const handleUploadMedia = async () => {
    setUploading(true);
    try {
      const result = await pickAndUploadBannerMedia('banners');
      if (result) {
        const newItem: PlatformBannerMedia = {
          id: null,
          mediaType: result.mediaType,
          mediaUrl: result.upload.url,
          mediaKey: result.upload.objectKey,
          durationSeconds: 5,
          sortOrder: mediaList.length,
        };
        setMediaList((prev) => [...prev, newItem]);
        toast.success(t('common.save'));
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setUploading(false);
    }
  };

  const handleAddManualMedia = () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    const detected = detectMediaType(trimmed);
    const itemType = newMediaType || detected;
    const dur = parseInt(newDuration, 10);
    const newItem: PlatformBannerMedia = {
      id: null,
      mediaType: itemType,
      mediaUrl: trimmed,
      mediaKey: null,
      durationSeconds: isNaN(dur) || dur <= 0 ? 5 : dur,
      sortOrder: mediaList.length,
    };
    setMediaList((prev) => [...prev, newItem]);
    setNewUrl('');
    setNewDuration('5');
  };

  const handleRemoveMedia = (index: number) => {
    setMediaList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setMediaList((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === mediaList.length - 1) return;
    setMediaList((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleUpdateItemDuration = (index: number, seconds: number) => {
    setMediaList((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, durationSeconds: Math.max(1, seconds) } : item,
      ),
    );
  };

  const handleToggleMediaType = (index: number) => {
    setMediaList((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              mediaType: item.mediaType === 'VIDEO' ? 'IMAGE' : 'VIDEO',
            }
          : item,
      ),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payloadMedia: PlatformBannerMediaUpdateRequest[] = mediaList.map((m, idx) => ({
        id: m.id || null,
        mediaType: m.mediaType,
        mediaUrl: m.mediaUrl.trim(),
        mediaKey: m.mediaKey || null,
        durationSeconds: m.durationSeconds || 5,
        sortOrder: idx,
      }));

      const primary = mediaList[0];
      await api.adminUpdateBanner({
        enabled,
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        badgeText: badgeText.trim() || null,
        buttonText: buttonText.trim() || null,
        linkUrl: linkUrl.trim() || null,
        imageUrl: primary?.mediaUrl || null,
        imageKey: primary?.mediaKey || null,
        media: payloadMedia,
      });
      toast.success(t('admin.bannerSaved'));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setSaving(false);
    }
  };

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

            {/* Multiple Backgrounds & Videos Section */}
            <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
              <View style={{ gap: 2 }}>
                <H3>{t('admin.bannerMediaTitle')}</H3>
                <Muted>{t('admin.bannerMediaSubtitle')}</Muted>
              </View>

              {/* Media Items List */}
              {mediaList.length === 0 ? (
                <View
                  style={{
                    padding: spacing.xl,
                    backgroundColor: colors.surfaceAlt,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: 'center',
                  }}
                >
                  <Muted>{t('admin.bannerNoMedia')}</Muted>
                </View>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  {mediaList.map((item, idx) => {
                    const resolved = absoluteUrl(item.mediaUrl);
                    const isVid = item.mediaType === 'VIDEO';

                    return (
                      <View
                        key={`media-${idx}-${item.mediaUrl}`}
                        style={{
                          padding: spacing.md,
                          backgroundColor: colors.surfaceAlt,
                          borderRadius: radius.md,
                          borderWidth: 1,
                          borderColor: colors.border,
                          gap: spacing.sm,
                        }}
                      >
                        <Row
                          style={{
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: spacing.sm,
                          }}
                        >
                          {/* Thumbnail & Info */}
                          <Row gap={spacing.md} style={{ alignItems: 'center', flex: 1, minWidth: 240 }}>
                            <View
                              style={{
                                width: 80,
                                height: 50,
                                borderRadius: radius.sm,
                                overflow: 'hidden',
                                backgroundColor: '#000000',
                                position: 'relative',
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              {isVid ? (
                                Platform.OS === 'web' ? (
                                  <video
                                    src={resolved}
                                    muted
                                    playsInline
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                    }}
                                  />
                                ) : (
                                  <Icon name="video" size={20} color="#ffffff" />
                                )
                              ) : (
                                <Image
                                  source={{ uri: resolved }}
                                  style={{ width: '100%', height: '100%' }}
                                  resizeMode="cover"
                                />
                              )}
                              <View
                                style={{
                                  position: 'absolute',
                                  top: 4,
                                  left: 4,
                                  backgroundColor: 'rgba(0,0,0,0.6)',
                                  borderRadius: 4,
                                  paddingHorizontal: 4,
                                  paddingVertical: 2,
                                }}
                              >
                                <Icon
                                  name={isVid ? 'film' : 'image'}
                                  size={10}
                                  color="#ffffff"
                                />
                              </View>
                            </View>

                            <View style={{ flex: 1, minWidth: 140 }}>
                              <Row gap={spacing.xs} style={{ alignItems: 'center' }}>
                                <Badge
                                  label={`#${idx + 1} ${isVid ? 'VIDEO' : 'IMAGE'}`}
                                  tone={
                                    isVid
                                      ? { bg: colors.orangeSoft, fg: colors.orangeDarker }
                                      : { bg: colors.surface, fg: colors.textMuted }
                                  }
                                />
                                {!isVid && (
                                  <Badge
                                    label={`${item.durationSeconds || 5}s`}
                                    tone={{ bg: colors.surface, fg: colors.textMuted }}
                                  />
                                )}
                              </Row>
                              <Muted
                                style={{
                                  fontSize: 12,
                                  marginTop: 2,
                                  maxWidth: 260,
                                }}
                                numberOfLines={1}
                              >
                                {item.mediaUrl}
                              </Muted>
                            </View>
                          </Row>

                          {/* Item Actions */}
                          <Row gap={spacing.xs} style={{ alignItems: 'center' }}>
                            {/* Duration settings for images */}
                            {!isVid && (
                              <Row gap={4} style={{ alignItems: 'center', marginRight: spacing.xs }}>
                                <Muted style={{ fontSize: 12 }}>Duur:</Muted>
                                {[3, 5, 8, 10].map((sec) => (
                                  <Pressable
                                    key={sec}
                                    onPress={() => handleUpdateItemDuration(idx, sec)}
                                    style={{
                                      paddingHorizontal: 8,
                                      paddingVertical: 4,
                                      borderRadius: radius.sm,
                                      backgroundColor:
                                        (item.durationSeconds || 5) === sec
                                          ? colors.orange
                                          : colors.surface,
                                      borderWidth: 1,
                                      borderColor:
                                        (item.durationSeconds || 5) === sec
                                          ? colors.orange
                                          : colors.border,
                                    }}
                                  >
                                    <Body
                                      style={{
                                        fontSize: 12,
                                        fontWeight: '600',
                                        color:
                                          (item.durationSeconds || 5) === sec
                                            ? colors.white
                                            : colors.text,
                                      }}
                                    >
                                      {sec}s
                                    </Body>
                                  </Pressable>
                                ))}
                              </Row>
                            )}

                            {/* Toggle Media Type */}
                            <Button
                              title={isVid ? 'Zet als Afbeelding' : 'Zet als Video'}
                              icon={isVid ? 'image' : 'video'}
                              variant="ghost"
                              size="sm"
                              onPress={() => handleToggleMediaType(idx)}
                            />

                            {/* Reorder buttons */}
                            <Button
                              icon="arrowUp"
                              title=""
                              variant="outline"
                              size="sm"
                              disabled={idx === 0}
                              onPress={() => handleMoveUp(idx)}
                            />
                            <Button
                              icon="arrowDown"
                              title=""
                              variant="outline"
                              size="sm"
                              disabled={idx === mediaList.length - 1}
                              onPress={() => handleMoveDown(idx)}
                            />

                            {/* Delete button */}
                            <Button
                              icon="trash"
                              title=""
                              variant="danger"
                              size="sm"
                              onPress={() => handleRemoveMedia(idx)}
                            />
                          </Row>
                        </Row>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Add Media Controls */}
              <Card flat style={{ gap: spacing.md, backgroundColor: colors.surfaceAlt }}>
                <H3 style={{ fontSize: 15 }}>{t('admin.bannerAddMedia')}</H3>

                <Row gap={spacing.md} style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                  <Button
                    title={t('admin.bannerUploadMedia')}
                    icon="upload"
                    variant="primary"
                    loading={uploading}
                    onPress={handleUploadMedia}
                  />

                  <View style={{ flex: 1, minWidth: 220 }}>
                    <Input
                      value={newUrl}
                      onChangeText={(txt) => {
                        setNewUrl(txt);
                        if (txt) {
                          setNewMediaType(detectMediaType(txt));
                        }
                      }}
                      placeholder="https://... of /api/files/..."
                    />
                  </View>

                  <View style={{ width: 140 }}>
                    <Segmented<'IMAGE' | 'VIDEO'>
                      value={newMediaType}
                      options={[
                        { value: 'IMAGE', label: 'Image', icon: 'image' },
                        { value: 'VIDEO', label: 'Video', icon: 'film' },
                      ]}
                      onChange={setNewMediaType}
                    />
                  </View>

                  {newMediaType === 'IMAGE' && (
                    <View style={{ width: 80 }}>
                      <Input
                        value={newDuration}
                        onChangeText={setNewDuration}
                        placeholder="5s"
                      />
                    </View>
                  )}

                  <Button
                    title={t('common.add')}
                    icon="plus"
                    variant="outline"
                    disabled={!newUrl.trim()}
                    onPress={handleAddManualMedia}
                  />
                </Row>
                <Muted style={{ fontSize: 12 }}>
                  {t('admin.bannerDurationHint')}
                </Muted>
              </Card>
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
                <Muted>Directe interactieve weergave zoals op de homepage</Muted>
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
                <HeroBackgroundSlider
                  media={mediaList}
                  style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
                >
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
                      intensity={mediaList.length > 0 ? 85 : 0}
                      tint={scheme === 'dark' ? 'dark' : 'light'}
                      style={[
                        {
                          maxWidth: 520,
                          width: '100%',
                          backgroundColor:
                            mediaList.length > 0
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
                          ...(Platform.OS === 'web' && mediaList.length > 0
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
                </HeroBackgroundSlider>
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
                {mediaList.length > 0 && (
                  <View
                    style={{
                      width: '100%',
                      aspectRatio: 16 / 9,
                      backgroundColor: colors.surfaceAlt,
                      overflow: 'hidden',
                    }}
                  >
                    <HeroBackgroundSlider
                      media={mediaList}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </View>
                )}

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
