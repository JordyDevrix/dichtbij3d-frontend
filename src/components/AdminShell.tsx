import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Icon, IconName } from './Icon';
import { Page } from './Page';
import { Badge, Body, Button, Card, EmptyState, H1, Muted, Row, Spinner } from './ui';
import { useAuth } from '../context/AuthContext';
import { useMaintenance } from '../context/MaintenanceContext';
import { useI18n } from '../i18n';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTheme } from '../theme/ThemeContext';
import { colors, radius, spacing, typography } from '../theme/theme';
import { getItemSync, setItem } from '../api/storage';
import { api } from '../api';

export interface AdminNavItem {
  href: string;
  labelKey: string;
  icon: IconName;
  section: 'general' | 'management';
  badgeKey?: 'maintenance' | 'reports';
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: '/admin', labelKey: 'admin.overview', icon: 'chart', section: 'general' },
  { href: '/admin/banner', labelKey: 'admin.banner', icon: 'image', section: 'general' },
  { href: '/admin/announcements', labelKey: 'admin.announcements', icon: 'bell', section: 'general' },
  { href: '/admin/maintenance', labelKey: 'admin.maintenance', icon: 'wrench', section: 'general', badgeKey: 'maintenance' },
  { href: '/admin/users', labelKey: 'admin.users', icon: 'users', section: 'management' },
  { href: '/admin/adverts', labelKey: 'admin.adverts', icon: 'layers', section: 'management' },
  { href: '/admin/reports', labelKey: 'admin.reports', icon: 'flag', section: 'management', badgeKey: 'reports' },
];

const SIDEBAR_STORAGE_KEY = 'd3d.admin_sidebar_collapsed';

export interface AdminShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

/**
 * Minimalist, full-bleed Admin Shell with left-docked collapsible sidebar
 * on desktop/ultrawide (docked directly at x=0 like Jira/Linear) and
 * clean, unboxed content layout.
 */
export function AdminShell({ children, title, subtitle, headerActions }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const { isAdmin, booting } = useAuth();
  const { isMaintenanceActive } = useMaintenance();
  const { isDesktop, isWide } = useBreakpoint();
  const { scheme } = useTheme();

  const [openReportsCount, setOpenReportsCount] = useState<number>(0);

  // Collapsible vertical sidebar state (defaults to expanded on desktop, remembers user preference)
  const [collapsed, setCollapsed] = useState(() => {
    const saved = getItemSync(SIDEBAR_STORAGE_KEY);
    return saved === 'true';
  });

  useEffect(() => {
    let cancelled = false;
    if (isAdmin && !booting) {
      api.adminReports()
        .then((reports) => {
          if (!cancelled) {
            const open = reports.filter((r) => r.status === 'OPEN').length;
            setOpenReportsCount(open);
          }
        })
        .catch(() => {
          if (!cancelled) setOpenReportsCount(0);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [isAdmin, booting, pathname]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      void setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  };

  if (booting) {
    return (
      <Page fullBleed={true} hideFooter={true}>
        <View style={{ paddingVertical: 80, alignItems: 'center' }}>
          <Spinner />
        </View>
      </Page>
    );
  }

  if (!isAdmin) {
    return (
      <Page maxWidth={640}>
        <Card style={{ padding: spacing.xl, marginTop: spacing.xl }}>
          <EmptyState
            icon="ban"
            title={t('admin.adminOnly')}
            body="Log in met een beheerdersaccount om toegang te krijgen tot het beheerpaneel."
          />
        </Card>
      </Page>
    );
  }

  const generalItems = ADMIN_NAV_ITEMS.filter((i) => i.section === 'general');
  const managementItems = ADMIN_NAV_ITEMS.filter((i) => i.section === 'management');

  const activeItem = ADMIN_NAV_ITEMS.find((item) => item.href === pathname) || ADMIN_NAV_ITEMS[0];
  const pageTitle = title || t(activeItem.labelKey);
  const pageSubtitle = subtitle || t('admin.subtitle');

  return (
    <Page
      fullBleed={true}
      hideFooter={true}
      contentStyle={{
        paddingHorizontal: 0,
        paddingTop: 0,
        paddingBottom: 0,
        gap: 0,
      }}
    >
      {/* ===================== MOBILE / TABLET NAV (<1024px) ===================== */}
      {!isDesktop ? (
        <View style={{ padding: spacing.md, gap: spacing.md }}>
          {/* Header */}
          <Row style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm }}>
            <Row gap={spacing.sm} style={{ alignItems: 'center' }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: radius.md,
                  backgroundColor: colors.orangeSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="userShield" size={15} color={colors.orange} />
              </View>
              <View>
                <Row gap={spacing.xs} style={{ alignItems: 'center' }}>
                  <H1 style={{ fontSize: 18, lineHeight: 22 }}>{pageTitle}</H1>
                  {isMaintenanceActive && (
                    <Badge label={t('admin.statusOffline')} tone={{ bg: colors.danger, fg: colors.white }} />
                  )}
                </Row>
              </View>
            </Row>

            {headerActions && <View>{headerActions}</View>}
          </Row>

          {/* Horizontal Touch Scroll Bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.xs, paddingVertical: 2 }}
          >
            {ADMIN_NAV_ITEMS.map((tab) => {
              const isSelected = pathname === tab.href;
              const hasMaintenanceAlert = tab.badgeKey === 'maintenance' && isMaintenanceActive;
              const hasReportsAlert = tab.badgeKey === 'reports' && openReportsCount > 0;

              return (
                <Pressable
                  key={tab.href}
                  onPress={() => router.push(tab.href as any)}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 7,
                      paddingHorizontal: 12,
                      borderRadius: radius.pill,
                      backgroundColor: isSelected
                        ? colors.orange
                        : scheme === 'dark'
                        ? 'rgba(255,255,255,0.06)'
                        : colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: isSelected ? colors.orange : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Icon
                    name={tab.icon}
                    size={13}
                    color={isSelected ? colors.white : colors.textMuted}
                  />
                  <Text
                    style={{
                      fontSize: 12.5,
                      fontWeight: isSelected ? '700' : '500',
                      color: isSelected ? colors.white : colors.ink,
                    }}
                  >
                    {t(tab.labelKey)}
                  </Text>
                  {hasMaintenanceAlert && (
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: isSelected ? colors.white : colors.danger,
                      }}
                    />
                  )}
                  {hasReportsAlert && (
                    <View
                      style={{
                        paddingHorizontal: 5,
                        paddingVertical: 1,
                        borderRadius: radius.pill,
                        backgroundColor: isSelected ? colors.white : colors.danger,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '800',
                          color: isSelected ? colors.orange : colors.white,
                        }}
                      >
                        {openReportsCount}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Mobile Main Content */}
          <View style={{ paddingTop: spacing.sm, gap: spacing.md }}>
            {children}
          </View>
        </View>
      ) : (
        /* ===================== DESKTOP / ULTRAWIDE (>=1024px) ===================== */
        <View
          style={{
            flexDirection: 'row',
            width: '100%',
            minHeight: Platform.OS === 'web' ? ('calc(100vh - 58px)' as any) : 800,
            alignItems: 'stretch',
          }}
        >
          {/* FULL-HEIGHT LEFT-DOCKED SIDEBAR */}
          <View
            style={{
              width: collapsed ? 56 : 224,
              flexShrink: 0,
              backgroundColor: colors.surface,
              borderRightWidth: 1,
              borderRightColor: colors.border,
              paddingTop: spacing.md,
              paddingBottom: spacing.lg,
              paddingHorizontal: collapsed ? 6 : 10,
              justifyContent: 'space-between',
              ...(Platform.OS === 'web'
                ? ({
                    position: 'sticky',
                    top: 58,
                    height: 'calc(100vh - 58px)',
                    alignSelf: 'flex-start',
                    transition: 'width 0.18s cubic-bezier(0.4, 0, 0.2, 1), padding 0.18s ease',
                    zIndex: 15,
                    overflowY: 'auto',
                  } as any)
                : null),
            }}
          >
            {/* Top Section */}
            <View style={{ gap: spacing.lg }}>
              {/* Brand / Logo + Collapse Button Header */}
              <Row
                style={{
                  justifyContent: collapsed ? 'center' : 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: collapsed ? 0 : spacing.xs,
                  paddingBottom: spacing.xs,
                }}
              >
                {!collapsed ? (
                  <Row gap={spacing.sm} style={{ alignItems: 'center' }}>
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: radius.md,
                        backgroundColor: colors.orangeSoft,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name="userShield" size={14} color={colors.orange} />
                    </View>
                    <View>
                      <Text style={{ fontWeight: '800', fontSize: 13.5, color: colors.ink }}>
                        Admin
                      </Text>
                      <Text style={{ ...typography.tiny, color: colors.textMuted, fontSize: 10, fontWeight: '600' }}>
                        Dichtbij3D
                      </Text>
                    </View>
                  </Row>
                ) : (
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: radius.md,
                      backgroundColor: colors.orangeSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="userShield" size={15} color={colors.orange} />
                  </View>
                )}

                <Pressable
                  onPress={toggleCollapsed}
                  accessibilityLabel={collapsed ? t('admin.expandSidebar') : t('admin.collapseSidebar')}
                  style={({ pressed }) => [
                    {
                      width: 26,
                      height: 26,
                      borderRadius: radius.sm,
                      backgroundColor: colors.surfaceAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: colors.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Icon
                    name={collapsed ? 'chevronRight' : 'chevronLeft'}
                    size={11}
                    color={colors.textMuted}
                  />
                </Pressable>
              </Row>

              {/* Navigation Items */}
              <View style={{ gap: spacing.md }}>
                {/* General Group */}
                <View style={{ gap: 2 }}>
                  {!collapsed && (
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: colors.textFaint,
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                        paddingHorizontal: spacing.sm,
                        marginBottom: 4,
                      }}
                    >
                      {t('admin.navGeneral')}
                    </Text>
                  )}
                  {generalItems.map((item) => (
                    <SidebarLink
                      key={item.href}
                      item={item}
                      collapsed={collapsed}
                      active={pathname === item.href}
                      badgeCount={
                        item.badgeKey === 'maintenance' && isMaintenanceActive
                          ? 'OFFLINE'
                          : undefined
                      }
                      badgeTone={
                        item.badgeKey === 'maintenance'
                          ? { bg: colors.danger, fg: colors.white }
                          : undefined
                      }
                    />
                  ))}
                </View>

                {/* Management Group */}
                <View style={{ gap: 2 }}>
                  {!collapsed && (
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: colors.textFaint,
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                        paddingHorizontal: spacing.sm,
                        marginBottom: 4,
                      }}
                    >
                      {t('admin.navManagement')}
                    </Text>
                  )}
                  {managementItems.map((item) => (
                    <SidebarLink
                      key={item.href}
                      item={item}
                      collapsed={collapsed}
                      active={pathname === item.href}
                      badgeCount={
                        item.badgeKey === 'reports' && openReportsCount > 0
                          ? String(openReportsCount)
                          : undefined
                      }
                      badgeTone={
                        item.badgeKey === 'reports'
                          ? { bg: colors.danger, fg: colors.white }
                          : undefined
                      }
                    />
                  ))}
                </View>
              </View>
            </View>

            {/* Bottom Section */}
            <View style={{ gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }}>
              {isMaintenanceActive && (
                <View
                  style={{
                    backgroundColor: colors.dangerSoft,
                    borderRadius: radius.md,
                    padding: collapsed ? 6 : 8,
                    alignItems: collapsed ? 'center' : 'flex-start',
                    marginBottom: 4,
                  }}
                >
                  {collapsed ? (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger }} />
                  ) : (
                    <Row gap={6} style={{ alignItems: 'center' }}>
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger }} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.danger }}>
                        {t('admin.statusOffline')}
                      </Text>
                    </Row>
                  )}
                </View>
              )}

              <Pressable
                onPress={() => router.push('/')}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: 8,
                    paddingVertical: 7,
                    paddingHorizontal: collapsed ? 0 : 8,
                    borderRadius: radius.md,
                    backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
                  },
                ]}
              >
                <Icon name="external" size={13} color={colors.textMuted} />
                {!collapsed && (
                  <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '500' }}>
                    {t('admin.quickHome')}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* MAIN UNBOXED CONTENT PANE */}
          <View
            style={{
              flex: 1,
              minWidth: 0,
              paddingHorizontal: isWide ? spacing.xxl : spacing.xl,
              paddingVertical: spacing.xl,
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 1600,
                alignSelf: 'flex-start',
                gap: spacing.xl,
              }}
            >
              {/* Clean Minimalist Page Header */}
              <Row
                style={{
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: spacing.md,
                }}
              >
                <View style={{ gap: 4 }}>
                  <H1 style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>
                    {pageTitle}
                  </H1>
                  {pageSubtitle && (
                    <Muted style={{ fontSize: 13.5 }}>{pageSubtitle}</Muted>
                  )}
                </View>

                {headerActions && (
                  <Row gap={spacing.xs} style={{ alignItems: 'center' }}>
                    {headerActions}
                  </Row>
                )}
              </Row>

              {/* Main Screen Content */}
              {children}
            </View>
          </View>
        </View>
      )}
    </Page>
  );
}

/**
 * Clean, minimalist Sidebar Link matching Jira/Linear aesthetic.
 */
function SidebarLink({
  item,
  collapsed,
  active,
  badgeCount,
  badgeTone,
}: {
  item: AdminNavItem;
  collapsed: boolean;
  active: boolean;
  badgeCount?: string;
  badgeTone?: { bg: string; fg: string };
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onPress={() => router.push(item.href as any)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      accessibilityLabel={t(item.labelKey)}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 10,
          paddingVertical: 7.5,
          paddingHorizontal: collapsed ? 0 : 10,
          borderRadius: radius.md,
          backgroundColor: active
            ? colors.orangeSoft
            : hovered
            ? colors.surfaceAlt
            : 'transparent',
          position: 'relative',
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      {/* Active Indicator Bar on left edge */}
      {active && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 6,
            bottom: 6,
            width: 3,
            borderTopRightRadius: 2,
            borderBottomRightRadius: 2,
            backgroundColor: colors.orange,
          }}
        />
      )}

      <Row gap={9} style={{ alignItems: 'center', flex: 1, minWidth: 0, justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <Icon
          name={item.icon}
          size={14}
          color={active ? colors.orange : hovered ? colors.ink : colors.textMuted}
        />
        {!collapsed && (
          <Text
            numberOfLines={1}
            style={{
              fontSize: 13,
              fontWeight: active ? '700' : '500',
              color: active ? colors.orangeDark : hovered ? colors.ink : colors.text,
            }}
          >
            {t(item.labelKey)}
          </Text>
        )}
      </Row>

      {!collapsed && badgeCount && (
        <View
          style={{
            backgroundColor: badgeTone?.bg ?? colors.danger,
            borderRadius: radius.pill,
            paddingHorizontal: 6,
            paddingVertical: 1.5,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: '800',
              color: badgeTone?.fg ?? colors.white,
            }}
          >
            {badgeCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
