import React, { useCallback, useEffect, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../src/api';
import { absoluteUrl } from '../src/api/client';
import type {
  AdvertSummary,
  AdvertType,
  PlatformAnnouncement,
  PlatformBanner,
  PublicStats,
} from '../src/api/types';
import { AdvertCard } from '../src/components/AdvertCard';
import { Icon, IconName } from '../src/components/Icon';
import { Page } from '../src/components/Page';
import {
  Badge,
  Body,
  Button,
  Card,
  EmptyState,
  H1,
  H2,
  H3,
  Muted,
  Row,
  Spinner,
} from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';
import { useI18n } from '../src/i18n';
import { advertTypeColor, colors, radius, shadow, spacing, typography } from '../src/theme/theme';
import { formatDate, numberFmt } from '../src/utils/format';
import { useBreakpoint } from '../src/hooks/useBreakpoint';

interface SectionData {
  type: AdvertType;
  titleKey: string;
  subtitleKey: string;
  icon: IconName;
  items: AdvertSummary[];
  loading: boolean;
}

export default function HomeScreen() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const { isWide, isPhone } = useBreakpoint();

  const [banner, setBanner] = useState<PlatformBanner | null>(null);
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [sections, setSections] = useState<Record<AdvertType, AdvertSummary[]>>({
    PRINT_REQUEST: [],
    MODEL_REQUEST: [],
    MODEL_FOR_SALE: [],
    PRINT_FOR_SALE: [],
  });
  const [loadingSections, setLoadingSections] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [bannerRes, annRes, statsRes] = await Promise.allSettled([
        api.platformBanner(),
        api.platformAnnouncements(),
        api.stats(),
      ]);

      if (bannerRes.status === 'fulfilled') setBanner(bannerRes.value);
      if (annRes.status === 'fulfilled') setAnnouncements(annRes.value);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);

      // Load top 15 adverts for each type
      const types: AdvertType[] = ['PRINT_REQUEST', 'MODEL_REQUEST', 'MODEL_FOR_SALE', 'PRINT_FOR_SALE'];
      const advertResults = await Promise.allSettled(
        types.map((type) => api.adverts({ type: [type], size: 15, sort: 'popular' })),
      );

      const nextSections: Record<AdvertType, AdvertSummary[]> = {
        PRINT_REQUEST: [],
        MODEL_REQUEST: [],
        MODEL_FOR_SALE: [],
        PRINT_FOR_SALE: [],
      };

      types.forEach((type, index) => {
        const res = advertResults[index];
        if (res.status === 'fulfilled') {
          nextSections[type] = res.value.content;
        }
      });

      setSections(nextSections);
    } catch {
      // ignore
    } finally {
      setLoadingSections(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  const SECTIONS_CONFIG: {
    type: AdvertType;
    title: string;
    subtitle: string;
    icon: IconName;
  }[] = [
    {
      type: 'PRINT_REQUEST',
      title: t('home.printRequestsTitle'),
      subtitle: t('home.printRequestsSubtitle'),
      icon: 'print',
    },
    {
      type: 'MODEL_REQUEST',
      title: t('home.modelRequestsTitle'),
      subtitle: t('home.modelRequestsSubtitle'),
      icon: 'hammer',
    },
    {
      type: 'MODEL_FOR_SALE',
      title: t('home.modelsForSaleTitle'),
      subtitle: t('home.modelsForSaleSubtitle'),
      icon: 'cubes',
    },
    {
      type: 'PRINT_FOR_SALE',
      title: t('home.printsForSaleTitle'),
      subtitle: t('home.printsForSaleSubtitle'),
      icon: 'cart',
    },
  ];

  const getAnnouncementBadgeTone = (type: string) => {
    switch (type) {
      case 'WARNING':
        return { bg: colors.dangerSoft, fg: colors.danger };
      case 'EVENT':
        return { bg: colors.orangeSoft, fg: colors.orangeDarker };
      case 'UPDATE':
        return { bg: colors.surfaceAlt, fg: colors.orange };
      default:
        return { bg: colors.surfaceAlt, fg: colors.textMuted };
    }
  };

  const getAnnouncementIcon = (type: string): IconName => {
    switch (type) {
      case 'WARNING':
        return 'warning';
      case 'EVENT':
        return 'calendar';
      case 'UPDATE':
        return 'bolt';
      default:
        return 'info';
    }
  };

  const bannerImgUrl = banner?.imageUrl ? absoluteUrl(banner.imageUrl) : null;

  return (
    <Page refreshing={refreshing} onRefresh={onRefresh}>
      {/* ----------------- BANNER / HERO SECTION ----------------- */}
      {banner && banner.enabled ? (
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
              flexDirection: isWide && bannerImgUrl ? 'row' : 'column',
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
              {banner.badgeText && (
                <Row gap={6}>
                  <Badge
                    label={banner.badgeText}
                    tone={{ bg: colors.orangeSoft, fg: colors.orangeDarker }}
                  />
                </Row>
              )}
              <H1 style={{ fontSize: isWide ? 38 : 26, lineHeight: isWide ? 44 : 32, maxWidth: 640 }}>
                {banner.title}
              </H1>
              {banner.subtitle && (
                <Body style={{ maxWidth: 580, color: colors.textMuted, fontSize: isWide ? 16 : 14 }}>
                  {banner.subtitle}
                </Body>
              )}
              <Row gap={spacing.sm} style={{ flexWrap: 'wrap', marginTop: spacing.xs }}>
                {banner.buttonText && (
                  <Button
                    title={banner.buttonText}
                    icon="arrowRight"
                    size={isWide ? 'lg' : 'md'}
                    onPress={() => {
                      if (banner.linkUrl?.startsWith('http')) {
                        if (Platform.OS === 'web') window.open(banner.linkUrl, '_blank');
                      } else {
                        router.push((banner.linkUrl || '/marketplace') as any);
                      }
                    }}
                  />
                )}
                <Button
                  title={t('home.viewMarketplace')}
                  icon="layers"
                  variant={banner.buttonText ? 'outline' : 'primary'}
                  size={isWide ? 'lg' : 'md'}
                  onPress={() => router.push('/marketplace')}
                />
              </Row>
            </View>

            {bannerImgUrl && (
              <View
                style={{
                  width: isWide ? 380 : '100%',
                  height: isWide ? 'auto' : 220,
                  minHeight: isWide ? 260 : undefined,
                  backgroundColor: colors.surfaceAlt,
                }}
              >
                <Image
                  source={{ uri: bannerImgUrl }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
            )}
          </View>
        </Card>
      ) : (
        <Card padded={false} flat style={{ backgroundColor: colors.surface }}>
          <View style={{ padding: isWide ? spacing.xxl : spacing.xl, gap: spacing.md }}>
            <Row gap={6}>
              <Icon name="bolt" size={11} color={colors.orange} />
              <Body style={{ ...typography.tiny, color: colors.orange, textTransform: 'uppercase' }}>
                {t('common.tagline')}
              </Body>
            </Row>
            <H1 style={{ fontSize: isWide ? 40 : 27, lineHeight: isWide ? 46 : 33, maxWidth: 660 }}>
              {t('marketplace.heroTitle')}
            </H1>
            <Body style={{ maxWidth: 600, color: colors.textMuted }}>{t('home.welcomeSubtitle')}</Body>
            <Row gap={spacing.sm} style={{ flexWrap: 'wrap', marginTop: spacing.xs }}>
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
          {stats && (
            <Row
              style={{
                paddingHorizontal: isWide ? spacing.xxl : spacing.xl,
                paddingVertical: spacing.lg,
                flexWrap: 'wrap',
                gap: spacing.xl,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                backgroundColor: colors.surfaceAlt,
              }}
            >
              {[
                { icon: 'layers' as const, value: stats.adverts, label: t('marketplace.statAdverts') },
                { icon: 'users' as const, value: stats.users, label: t('marketplace.statUsers') },
                { icon: 'cubes' as const, value: stats.models, label: t('marketplace.statModels') },
                { icon: 'eye' as const, value: stats.views, label: t('marketplace.statViews') },
              ].map((item) => (
                <Row key={item.label} gap={spacing.sm}>
                  <Icon name={item.icon} size={13} color={colors.orange} />
                  <Body style={{ fontWeight: '700', color: colors.ink }}>{numberFmt(item.value, locale)}</Body>
                  <Muted>{item.label}</Muted>
                </Row>
              ))}
            </Row>
          )}
        </Card>
      )}

      {/* ----------------- ANNOUNCEMENTS & EVENTS SECTION ----------------- */}
      {announcements.length > 0 && (
        <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Row gap={spacing.sm}>
              <Icon name="bell" size={16} color={colors.orange} />
              <H2>{t('home.announcements')}</H2>
            </Row>
          </Row>

          <View style={{ gap: spacing.md }}>
            {announcements.map((ann) => (
              <Card
                key={ann.id}
                style={{
                  backgroundColor: colors.surface,
                  borderColor: ann.type === 'WARNING' ? colors.danger : colors.border,
                  padding: spacing.lg,
                }}
              >
                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: spacing.sm }}>
                  <Row gap={spacing.sm} style={{ flex: 1, minWidth: 240, alignItems: 'center' }}>
                    <Icon name={getAnnouncementIcon(ann.type)} size={15} color={colors.orange} />
                    <H3 style={{ flexShrink: 1 }}>{ann.title}</H3>
                    <Badge label={ann.type} tone={getAnnouncementBadgeTone(ann.type)} />
                  </Row>
                  {ann.eventDate && (
                    <Row gap={4} style={{ alignItems: 'center' }}>
                      <Icon name="calendar" size={12} color={colors.textFaint} />
                      <Muted style={typography.tiny}>
                        {formatDate(ann.eventDate, locale)}
                      </Muted>
                    </Row>
                  )}
                </Row>

                <Body style={{ color: colors.textMuted, marginTop: spacing.sm }}>{ann.content}</Body>

                {ann.linkUrl && (
                  <Row style={{ marginTop: spacing.md }}>
                    <Button
                      title={ann.linkText || t('home.readMore')}
                      icon="arrowRight"
                      variant="ghost"
                      size="sm"
                      onPress={() => {
                        if (ann.linkUrl?.startsWith('http')) {
                          if (Platform.OS === 'web') window.open(ann.linkUrl, '_blank');
                        } else {
                          router.push((ann.linkUrl || '/') as any);
                        }
                      }}
                    />
                  </Row>
                )}
              </Card>
            ))}
          </View>
        </View>
      )}

      {/* ----------------- 4 HORIZONTAL ADVERT SECTIONS ----------------- */}
      {loadingSections ? (
        <Spinner label={t('common.loading')} />
      ) : (
        <View style={{ gap: spacing.xxl, marginTop: spacing.md }}>
          {SECTIONS_CONFIG.map((section) => {
            const items = sections[section.type] || [];
            const tone = advertTypeColor[section.type];

            return (
              <View key={section.type} style={{ gap: spacing.md }}>
                {/* Section Header */}
                <Row
                  style={{
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: spacing.sm,
                  }}
                >
                  <View style={{ gap: 2, flex: 1, minWidth: 220 }}>
                    <Row gap={spacing.sm} style={{ alignItems: 'center' }}>
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: radius.md,
                          backgroundColor: tone.bg,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon name={section.icon} size={13} color={tone.fg} />
                      </View>
                      <H2>{section.title}</H2>
                      <Badge label={`${items.length}`} tone={{ bg: colors.surfaceAlt, fg: colors.textMuted }} />
                    </Row>
                    <Muted>{section.subtitle}</Muted>
                  </View>

                  <Button
                    title={t('home.viewAll')}
                    icon="arrowRight"
                    variant="outline"
                    size="sm"
                    onPress={() => router.push(`/marketplace?type=${section.type}` as any)}
                  />
                </Row>

                {/* Horizontal Scroll Advert Row */}
                {items.length === 0 ? (
                  <Card style={{ padding: spacing.xl }}>
                    <EmptyState
                      icon={section.icon}
                      title={t('home.noAdverts')}
                      body={section.subtitle}
                      action={
                        <Button
                          title={t('home.postAdvert')}
                          icon="plus"
                          size="sm"
                          onPress={() => router.push(user ? '/create' : '/auth/login')}
                        />
                      }
                    />
                  </Card>
                ) : (
                  <ScrollView
                    horizontal
                    nestedScrollEnabled
                    showsHorizontalScrollIndicator={false}
                    style={{
                      marginHorizontal: isPhone ? -spacing.lg : 0,
                    }}
                    contentContainerStyle={{
                      gap: spacing.md,
                      paddingHorizontal: isPhone ? spacing.lg : 0,
                      paddingRight: isPhone ? spacing.xxl : spacing.lg,
                      paddingVertical: spacing.xs,
                    }}
                  >
                    {items.map((advert) => (
                      <View
                        key={advert.id}
                        style={{
                          width: isPhone ? 280 : 315,
                          flexShrink: 0,
                        }}
                      >
                        <AdvertCard advert={advert} onChanged={loadData} />
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            );
          })}
        </View>
      )}
    </Page>
  );
}
