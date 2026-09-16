import React, { useCallback, useEffect, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, View } from 'react-native';
import { BlurView } from 'expo-blur';
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
import { HeroBanner } from '../src/components/HeroBanner';
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
import { useTheme } from '../src/theme/ThemeContext';
import { advertTypeColor, colors, layout, radius, shadow, spacing, typography } from '../src/theme/theme';
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
  const { scheme } = useTheme();

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

  return (
    <Page
      refreshing={refreshing}
      onRefresh={onRefresh}
      hero={<HeroBanner stats={stats} />}
      contentStyle={{
        gap: isWide ? 56 : 40,
        paddingTop: isWide ? 44 : 28,
        paddingBottom: isWide ? 72 : 48,
      }}
    >
      {/* ----------------- ANNOUNCEMENTS & EVENTS SECTION ----------------- */}
      {announcements.length > 0 && (
        <View style={{ gap: spacing.lg }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Row gap={spacing.sm} style={{ alignItems: 'center' }}>
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
                  padding: isWide ? spacing.xl : spacing.lg,
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

      {/* ----------------- HORIZONTAL ADVERT SECTIONS ----------------- */}
      {loadingSections ? (
        <Spinner label={t('common.loading')} />
      ) : (
        (() => {
          const activeSections = SECTIONS_CONFIG.filter(
            (section) => (sections[section.type] || []).length > 0
          );

          if (activeSections.length === 0) {
            return (
              <Card style={{ padding: spacing.xxl }}>
                <EmptyState
                  icon="layers"
                  title={t('home.noAdverts')}
                  body={t('home.welcomeSubtitle')}
                  action={
                    <Button
                      title={t('home.postAdvert')}
                      icon="plus"
                      size="md"
                      onPress={() => router.push(user ? '/create' : '/auth/login')}
                    />
                  }
                />
              </Card>
            );
          }

          return (
            <View style={{ gap: isWide ? 64 : 48 }}>
              {activeSections.map((section) => {
                const items = sections[section.type] || [];
                const tone = advertTypeColor[section.type];

                return (
                  <View key={section.type} style={{ gap: spacing.lg }}>
                    {/* Section Header */}
                    <Row
                      style={{
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                        flexWrap: 'wrap',
                        gap: spacing.md,
                        marginBottom: 2,
                      }}
                    >
                      <View style={{ gap: 4, flex: 1, minWidth: 220 }}>
                        <Row gap={spacing.md} style={{ alignItems: 'center' }}>
                          <View
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: radius.md,
                              backgroundColor: tone.bg,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Icon name={section.icon} size={14} color={tone.fg} />
                          </View>
                          <H2>{section.title}</H2>
                          <Badge label={`${items.length}`} tone={{ bg: colors.surfaceAlt, fg: colors.textMuted }} />
                        </Row>
                        <Muted style={{ fontSize: isWide ? 14 : 13 }}>{section.subtitle}</Muted>
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
                    <ScrollView
                      horizontal
                      nestedScrollEnabled
                      showsHorizontalScrollIndicator={false}
                      style={{
                        marginHorizontal: isPhone ? -spacing.lg : 0,
                      }}
                      contentContainerStyle={{
                        gap: isWide ? 20 : spacing.md,
                        paddingHorizontal: isPhone ? spacing.lg : 0,
                        paddingRight: isPhone ? spacing.xxl : spacing.lg,
                        paddingTop: 6,
                        paddingBottom: spacing.lg,
                        alignItems: 'stretch',
                      }}
                    >
                      {items.map((advert) => (
                        <View
                          key={advert.id}
                          style={{
                            width: isPhone ? 285 : 320,
                            flexShrink: 0,
                          }}
                        >
                          <AdvertCard
                            advert={advert}
                            style={{
                              flexBasis: 'auto',
                              maxWidth: '100%',
                              height: '100%',
                            }}
                            onChanged={loadData}
                          />
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                );
              })}
            </View>
          );
        })()
      )}
    </Page>
  );
}
