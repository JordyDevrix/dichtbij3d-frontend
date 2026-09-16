import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { api } from '../api';
import type { HeroBannerDto, HeroBannerSettingsDto, PublicStats } from '../api/types';
import { BannerMedia } from './BannerMedia';
import { Icon } from './Icon';
import { Badge, Body, Button, Card, H1, Muted, Row } from './ui';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { useTheme } from '../theme/ThemeContext';
import { colors, layout, radius, shadow, spacing, typography } from '../theme/theme';
import { numberFmt } from '../utils/format';
import { useBreakpoint } from '../hooks/useBreakpoint';

export interface HeroBannerProps {
  stats?: PublicStats | null;
  /** Force show even if user is logged in (used for preview in admin) */
  previewMode?: boolean;
}

const DEFAULT_SETTINGS: HeroBannerSettingsDto = {
  slideDurationSeconds: 5,
  showForLoggedInUsers: false,
};

export function HeroBanner({ stats, previewMode = false }: HeroBannerProps) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const { isWide } = useBreakpoint();
  const { scheme } = useTheme();

  const [banners, setBanners] = useState<HeroBannerDto[]>([]);
  const [settings, setSettings] = useState<HeroBannerSettingsDto>(DEFAULT_SETTINGS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Load public banners from backend
  useEffect(() => {
    let active = true;
    api.banners()
      .then((res) => {
        if (!active) return;
        setBanners(res.banners || []);
        if (res.settings) setSettings(res.settings);
        setLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const count = banners.length;
  const activeBanner = count > 0 ? banners[currentIndex % count] : null;

  const goToNext = useCallback(() => {
    if (count <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % count);
  }, [count]);

  const goToPrev = useCallback(() => {
    if (count <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + count) % count);
  }, [count]);

  const goToIndex = useCallback(
    (index: number) => {
      if (count <= 0) return;
      setCurrentIndex(index % count);
    },
    [count],
  );

  // Cycling timer: ONLY for static images. Videos advance strictly via onEnded.
  useEffect(() => {
    if (count <= 1 || !activeBanner) return;

    if (activeBanner.mediaType === 'IMAGE') {
      const durationSeconds =
        activeBanner.durationSeconds && activeBanner.durationSeconds > 0
          ? activeBanner.durationSeconds
          : settings.slideDurationSeconds || 5;

      const timer = setTimeout(() => {
        goToNext();
      }, durationSeconds * 1000);

      return () => clearTimeout(timer);
    }

    // Safety timeout for video in case playback gets blocked or fails to emit ended event
    if (activeBanner.mediaType === 'VIDEO') {
      const fallbackTimer = setTimeout(() => {
        goToNext();
      }, 60000); // 60s fallback
      return () => clearTimeout(fallbackTimer);
    }
  }, [count, activeBanner, settings.slideDurationSeconds, goToNext]);

  // Video ended callback: advance to next slide
  const handleVideoEnded = useCallback(() => {
    if (count > 1) {
      goToNext();
    }
  }, [count, goToNext]);

  // Fallback if media fails to load
  const handleMediaError = useCallback(() => {
    if (count > 1) {
      goToNext();
    }
  }, [count, goToNext]);

  // If user is logged in and not in preview mode and settings disallow showing for logged in users:
  if (!previewMode && user && !settings.showForLoggedInUsers) {
    return null;
  }

  const title = activeBanner?.title?.trim() || t('marketplace.heroTitle');
  const subtitle = activeBanner?.subtitle?.trim() || t('home.welcomeSubtitle');

  const statsBar = stats ? (
    <View
      style={{
        width: '100%',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.surfaceAlt,
        position: 'relative',
        zIndex: 1,
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: layout.maxWidth,
          alignSelf: 'center',
          paddingHorizontal: isWide ? spacing.xxl : spacing.lg,
          paddingVertical: spacing.lg,
        }}
      >
        <Row
          style={{
            justifyContent: isWide ? 'space-between' : 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: spacing.lg,
          }}
        >
          {[
            { icon: 'layers' as const, value: stats.adverts, label: t('marketplace.statAdverts') },
            { icon: 'users' as const, value: stats.users, label: t('marketplace.statUsers') },
            { icon: 'cubes' as const, value: stats.models, label: t('marketplace.statModels') },
            { icon: 'eye' as const, value: stats.views, label: t('marketplace.statViews') },
          ].map((item, idx) => (
            <Row key={idx} gap={spacing.sm} style={{ alignItems: 'center' }}>
              <Icon name={item.icon} size={13} color={colors.orange} />
              <Body style={{ fontWeight: '700', color: colors.ink }}>{numberFmt(item.value, locale)}</Body>
              <Muted style={typography.tiny}>{item.label}</Muted>
            </Row>
          ))}
        </Row>
      </View>
    </View>
  ) : null;

  return (
    <View
      style={{
        width: '100%',
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      {activeBanner && activeBanner.mediaUrl ? (
        isWide ? (
          /* ---------------- DESKTOP & ULTRAWIDE HERO BANNER ---------------- */
          <View
            style={{
              width: '100%',
              height: 400,
              position: 'relative',
              backgroundColor: colors.surfaceAlt,
              overflow: 'hidden',
            }}
          >
            {/* Background Media (Image, GIF, or Silent Autoplay Video) */}
            <BannerMedia
              key={`${activeBanner.id}-${activeBanner.mediaUrl}`}
              mediaUrl={activeBanner.mediaUrl}
              mediaType={activeBanner.mediaType}
              onEnded={handleVideoEnded}
              onError={handleMediaError}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
              }}
            />

            {/* Centered content grid with floating frosted glass card */}
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
                intensity={85}
                tint={scheme === 'dark' ? 'dark' : 'light'}
                style={[
                  {
                    maxWidth: 540,
                    width: '100%',
                    backgroundColor:
                      scheme === 'dark' ? 'rgba(21, 26, 33, 0.82)' : 'rgba(255, 255, 255, 0.88)',
                    borderRadius: radius.xl,
                    padding: spacing.xxl,
                    gap: spacing.lg,
                    borderWidth: 1,
                    borderColor:
                      scheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                    overflow: 'hidden',
                    ...(Platform.OS === 'web'
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
                <Row gap={6} style={{ alignItems: 'center' }}>
                  <Icon name="bolt" size={12} color={colors.orange} />
                  <Badge
                    label={t('common.tagline')}
                    tone={{ bg: colors.orangeSoft, fg: colors.orangeDarker }}
                  />
                </Row>

                <H1 style={{ fontSize: 32, lineHeight: 38 }}>{title}</H1>

                {subtitle ? (
                  <Body style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
                    {subtitle}
                  </Body>
                ) : null}

                <Row gap={spacing.md} style={{ flexWrap: 'wrap', marginTop: spacing.xs }}>
                  {activeBanner.linkUrl && activeBanner.linkText ? (
                    <Button
                      title={activeBanner.linkText}
                      icon="arrowRight"
                      size="md"
                      onPress={() => {
                        if (activeBanner.linkUrl?.startsWith('http')) {
                          if (Platform.OS === 'web') window.open(activeBanner.linkUrl, '_blank');
                        } else {
                          router.push((activeBanner.linkUrl || '/marketplace') as any);
                        }
                      }}
                    />
                  ) : null}

                  <Button
                    title={t('home.viewMarketplace')}
                    icon="layers"
                    variant={activeBanner.linkText ? 'outline' : 'primary'}
                    size="md"
                    onPress={() => router.push('/marketplace')}
                  />
                </Row>

                {/* Multiple banner indicator controls */}
                {count > 1 && (
                  <Row gap={6} style={{ marginTop: spacing.xs, alignItems: 'center' }}>
                    <Pressable
                      accessibilityLabel="Previous slide"
                      onPress={goToPrev}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        backgroundColor:
                          scheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 4,
                      }}
                    >
                      <Icon name="chevronLeft" size={11} color={colors.textMuted} />
                    </Pressable>

                    {banners.map((b, i) => {
                      const active = i === currentIndex;
                      return (
                        <Pressable
                          key={b.id || i}
                          accessibilityRole="button"
                          accessibilityLabel={`Slide ${i + 1}`}
                          onPress={() => goToIndex(i)}
                          style={{
                            height: 6,
                            width: active ? 22 : 6,
                            borderRadius: 3,
                            backgroundColor: active ? colors.orange : colors.border,
                            ...(Platform.OS === 'web'
                              ? ({
                                  transition: 'width 240ms ease, background-color 240ms ease',
                                  cursor: 'pointer',
                                } as any)
                              : null),
                          }}
                        />
                      );
                    })}

                    <Pressable
                      accessibilityLabel="Next slide"
                      onPress={goToNext}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        backgroundColor:
                          scheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: 4,
                      }}
                    >
                      <Icon name="chevronRight" size={11} color={colors.textMuted} />
                    </Pressable>

                    <Muted style={{ ...typography.tiny, marginLeft: spacing.xs }}>
                      {currentIndex + 1} / {count}
                    </Muted>
                  </Row>
                )}
              </BlurView>
            </View>
          </View>
        ) : (
          /* ---------------- MOBILE & PHONE HERO BANNER ---------------- */
          <View style={{ width: '100%' }}>
            {/* Top Media: 16:9 aspect ratio */}
            <View
              style={{
                width: '100%',
                aspectRatio: 16 / 9,
                backgroundColor: colors.surfaceAlt,
                overflow: 'hidden',
              }}
            >
              <BannerMedia
                key={`${activeBanner.id}-${activeBanner.mediaUrl}`}
                mediaUrl={activeBanner.mediaUrl}
                mediaType={activeBanner.mediaType}
                onEnded={handleVideoEnded}
                onError={handleMediaError}
                style={{ width: '100%', height: '100%' }}
              />
            </View>

            {/* Bottom Text Content under the media */}
            <View
              style={{
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.xl,
                gap: spacing.md,
                backgroundColor: colors.surface,
              }}
            >
              <Row gap={6} style={{ alignItems: 'center' }}>
                <Icon name="bolt" size={12} color={colors.orange} />
                <Badge
                  label={t('common.tagline')}
                  tone={{ bg: colors.orangeSoft, fg: colors.orangeDarker }}
                />
              </Row>

              <H1 style={{ fontSize: 24, lineHeight: 30 }}>{title}</H1>

              {subtitle ? (
                <Body style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>
                  {subtitle}
                </Body>
              ) : null}

              <Row gap={spacing.sm} style={{ flexWrap: 'wrap', marginTop: spacing.xs }}>
                {activeBanner.linkUrl && activeBanner.linkText ? (
                  <Button
                    title={activeBanner.linkText}
                    icon="arrowRight"
                    size="md"
                    onPress={() => {
                      if (activeBanner.linkUrl?.startsWith('http')) {
                        if (Platform.OS === 'web') window.open(activeBanner.linkUrl, '_blank');
                      } else {
                        router.push((activeBanner.linkUrl || '/marketplace') as any);
                      }
                    }}
                  />
                ) : null}

                <Button
                  title={t('home.viewMarketplace')}
                  icon="layers"
                  variant={activeBanner.linkText ? 'outline' : 'primary'}
                  size="md"
                  onPress={() => router.push('/marketplace')}
                />
              </Row>

              {/* Multiple banner indicator controls */}
              {count > 1 && (
                <Row gap={6} style={{ marginTop: spacing.sm, alignItems: 'center' }}>
                  <Pressable
                    accessibilityLabel="Previous slide"
                    onPress={goToPrev}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: colors.surfaceAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 4,
                    }}
                  >
                    <Icon name="chevronLeft" size={11} color={colors.textMuted} />
                  </Pressable>

                  {banners.map((b, i) => {
                    const active = i === currentIndex;
                    return (
                      <Pressable
                        key={b.id || i}
                        accessibilityRole="button"
                        accessibilityLabel={`Slide ${i + 1}`}
                        onPress={() => goToIndex(i)}
                        style={{
                          height: 6,
                          width: active ? 20 : 6,
                          borderRadius: 3,
                          backgroundColor: active ? colors.orange : colors.border,
                        }}
                      />
                    );
                  })}

                  <Pressable
                    accessibilityLabel="Next slide"
                    onPress={goToNext}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: colors.surfaceAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: 4,
                    }}
                  >
                    <Icon name="chevronRight" size={11} color={colors.textMuted} />
                  </Pressable>

                  <Muted style={{ ...typography.tiny, marginLeft: spacing.xs }}>
                    {currentIndex + 1} / {count}
                  </Muted>
                </Row>
              )}
            </View>
          </View>
        )
      ) : (
        /* ---------------- DEFAULT HERO (NO BANNER MEDIA) ---------------- */
        <View
          style={{
            width: '100%',
            maxWidth: layout.maxWidth,
            alignSelf: 'center',
            paddingHorizontal: isWide ? spacing.xxl : spacing.lg,
            paddingVertical: isWide ? 56 : 36,
          }}
        >
          <View style={{ gap: spacing.lg, maxWidth: 680 }}>
            <Row gap={6}>
              <Icon name="bolt" size={11} color={colors.orange} />
              <Body style={{ ...typography.tiny, color: colors.orange, textTransform: 'uppercase' }}>
                {t('common.tagline')}
              </Body>
            </Row>
            <H1 style={{ fontSize: isWide ? 42 : 28, lineHeight: isWide ? 50 : 36, maxWidth: 660 }}>
              {t('marketplace.heroTitle')}
            </H1>
            <Body
              style={{
                maxWidth: 600,
                color: colors.textMuted,
                fontSize: isWide ? 16 : 15,
                lineHeight: isWide ? 24 : 22,
              }}
            >
              {t('home.welcomeSubtitle')}
            </Body>
            <Row gap={spacing.md} style={{ flexWrap: 'wrap', marginTop: spacing.xs }}>
              <Button
                title={t('home.viewMarketplace')}
                icon="layers"
                size={isWide ? 'lg' : 'md'}
                onPress={() => router.push('/marketplace')}
              />
              <Button
                title={t('marketplace.heroCtaCreate')}
                icon="plus"
                variant="outline"
                size={isWide ? 'lg' : 'md'}
                onPress={() => router.push(user ? '/create' : '/auth/login')}
              />
            </Row>
          </View>
        </View>
      )}

      {statsBar}
    </View>
  );
}
