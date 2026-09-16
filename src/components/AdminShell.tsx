import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Icon, IconName } from './Icon';
import { Page } from './Page';
import { Badge, Body, Button, Card, EmptyState, H1, H2, Muted, Row, Spinner } from './ui';
import { useAuth } from '../context/AuthContext';
import { useMaintenance } from '../context/MaintenanceContext';
import { useI18n } from '../i18n';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTheme } from '../theme/ThemeContext';
import { colors, radius, shadow, spacing, typography } from '../theme/theme';
import { getItemSync, setItem } from '../api/storage';

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
 * Modern, responsive Admin Shell with a collapsible vertical sidebar navigation
 * on desktop/ultrawide and a streamlined touch navigation bar on mobile/tablet.
 */
export function AdminShell({ children, title, subtitle, headerActions }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const { isAdmin, booting } = useAuth();
  const { isMaintenanceActive } = useMaintenance();
  const { isDesktop, isWide } = useBreakpoint();
  const { scheme } = useTheme();

  // Collapsible vertical sidebar state (defaults to expanded on desktop, remembers user preference)
  const [collapsed, setCollapsed] = useState(() => {
    const saved = getItemSync(SIDEBAR_STORAGE_KEY);
    return saved === 'true';
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      void setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  };

  if (booting) {
    return (
      <Page maxWidth={1600}>
        <View style={{ paddingVertical: 60, alignItems: 'center' }}>
          <Spinner />
        </View>
      </Page>
    );
  }

  if (!isAdmin) {
    return (
      <Page maxWidth={640}>
        <Card style={{ padding: spacing.xl }}>
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

  // Active item lookup for dynamic breadcrumb / header default
  const activeItem = ADMIN_NAV_ITEMS.find((item) => item.href === pathname) || ADMIN_NAV_ITEMS[0];
  const pageTitle = title || t(activeItem.labelKey);

  return (
    <Page maxWidth={1600} contentStyle={{ paddingHorizontal: isWide ? spacing.lg : spacing.md, paddingTop: spacing.md }}>
      {/* ----------------- MOBILE / TABLET NAV HEADER (<1024px) ----------------- */}
      {!isDesktop && (
        <View style={{ gap: spacing.md, marginBottom: spacing.sm }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm }}>
            <Row gap={spacing.sm} style={{ alignItems: 'center' }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: radius.md,
                  backgroundColor: colors.orangeSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="userShield" size={16} color={colors.orange} />
              </View>
              <View>
                <Row gap={spacing.xs} style={{ alignItems: 'center' }}>
                  <H1 style={{ fontSize: 20, lineHeight: 26 }}>{t('admin.title')}</H1>
                  <Badge
                    label={isMaintenanceActive ? t('admin.statusOffline') : t('admin.statusOnline')}
                    tone={
                      isMaintenanceActive
                        ? { bg: colors.danger, fg: colors.white }
                        : { bg: colors.successSoft, fg: colors.success }
                    }
                  />
                </Row>
              </View>
            </Row>

            {headerActions && <View>{headerActions}</View>}
          </Row>

          {/* Horizontal Scrolling Pill Bar for Mobile */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.xs, paddingVertical: 4 }}
          >
            {ADMIN_NAV_ITEMS.map((tab) => {
              const isSelected = pathname === tab.href;
              const hasAlert = tab.badgeKey === 'maintenance' && isMaintenanceActive;

              return (
                <Pressable
                  key={tab.href}
                  onPress={() => router.push(tab.href as any)}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: radius.pill,
                      backgroundColor: isSelected
                        ? colors.orange
                        : scheme === 'dark'
                        ? 'rgba(255,255,255,0.06)'
                        : colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: isSelected
                        ? colors.orange
                        : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Icon
                    name={tab.icon}
                    size={14}
                    color={isSelected ? colors.white : colors.textMuted}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: isSelected ? '700' : '500',
                      color: isSelected ? colors.white : colors.ink,
                    }}
                  >
                    {t(tab.labelKey)}
                  </Text>
                  {hasAlert && (
                    <View
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 4,
                        backgroundColor: isSelected ? colors.white : colors.danger,
                      }}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ----------------- MAIN DESKTOP & ULTRAWIDE LAYOUT (>=1024px) ----------------- */}
      <View
        style={{
          flexDirection: isDesktop ? 'row' : 'column',
          alignItems: 'flex-start',
          gap: isDesktop ? spacing.xl : spacing.lg,
          width: '100%',
        }}
      >
        {/* DESKTOP VERTICAL COLLAPSIBLE SIDEBAR */}
        {isDesktop && (
          <View
            style={[
              {
                width: collapsed ? 74 : 248,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.lg,
                paddingVertical: spacing.md,
                paddingHorizontal: collapsed ? spacing.xs : spacing.sm,
                gap: spacing.lg,
                ...(Platform.OS === 'web'
                  ? ({
                      position: 'sticky',
                      top: 84,
                      alignSelf: 'flex-start',
                      transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1), padding 0.2s ease',
                      zIndex: 10,
                    } as any)
                  : null),
              },
              shadow.card,
            ]}
          >
            {/* Sidebar Top: Logo / Brand + Collapse Button */}
            <Row
              style={{
                justifyContent: collapsed ? 'center' : 'space-between',
                alignItems: 'center',
                paddingHorizontal: collapsed ? 0 : spacing.sm,
                paddingBottom: spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              {!collapsed ? (
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
                    <Body style={{ fontWeight: '800', fontSize: 14, color: colors.ink }}>
                      Dichtbij3D
                    </Body>
                    <Muted style={{ ...typography.tiny, color: colors.orange, fontWeight: '700' }}>
                      ADMIN PANEL
                    </Muted>
                  </View>
                </Row>
              ) : (
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: radius.md,
                    backgroundColor: colors.orangeSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="userShield" size={17} color={colors.orange} />
                </View>
              )}

              {/* Collapse / Expand Toggle Button */}
              <Pressable
                onPress={toggleCollapsed}
                accessibilityLabel={collapsed ? t('admin.expandSidebar') : t('admin.collapseSidebar')}
                style={({ pressed }) => [
                  {
                    width: 28,
                    height: 28,
                    borderRadius: radius.md,
                    backgroundColor: colors.surfaceAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                    marginTop: collapsed ? spacing.xs : 0,
                  },
                ]}
              >
                <Icon
                  name={collapsed ? 'chevronRight' : 'chevronLeft'}
                  size={12}
                  color={colors.textMuted}
                />
              </Pressable>
            </Row>

            {/* General Navigation Group */}
            <View style={{ gap: 4 }}>
              {!collapsed && (
                <Text
                  style={{
                    ...typography.tiny,
                    color: colors.textFaint,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    paddingHorizontal: spacing.sm,
                    marginBottom: 4,
                  }}
                >
                  {t('admin.navGeneral')}
                </Text>
              )}
              {generalItems.map((item) => (
                <SidebarNavItem
                  key={item.href}
                  item={item}
                  active={pathname === item.href}
                  collapsed={collapsed}
                  isMaintenanceActive={isMaintenanceActive}
                  onPress={() => router.push(item.href as any)}
                  label={t(item.labelKey)}
                />
              ))}
            </View>

            {/* Management Navigation Group */}
            <View style={{ gap: 4 }}>
              {!collapsed && (
                <Text
                  style={{
                    ...typography.tiny,
                    color: colors.textFaint,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    paddingHorizontal: spacing.sm,
                    marginBottom: 4,
                  }}
                >
                  {t('admin.navManagement')}
                </Text>
              )}
              {managementItems.map((item) => (
                <SidebarNavItem
                  key={item.href}
                  item={item}
                  active={pathname === item.href}
                  collapsed={collapsed}
                  isMaintenanceActive={isMaintenanceActive}
                  onPress={() => router.push(item.href as any)}
                  label={t(item.labelKey)}
                />
              ))}
            </View>

            {/* Sidebar Bottom: Status Card & Return to Site */}
            <View
              style={{
                marginTop: 'auto',
                paddingTop: spacing.md,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                gap: spacing.sm,
              }}
            >
              {!collapsed ? (
                <Pressable
                  onPress={() => router.push('/admin/maintenance')}
                  style={{
                    padding: spacing.sm,
                    borderRadius: radius.md,
                    backgroundColor: isMaintenanceActive ? colors.dangerSoft : colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: isMaintenanceActive ? colors.danger : colors.border,
                    gap: 2,
                  }}
                >
                  <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>
                      {t('admin.systemStatus')}
                    </Text>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: isMaintenanceActive ? colors.danger : colors.success,
                      }}
                    />
                  </Row>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: isMaintenanceActive ? colors.danger : colors.ink,
                    }}
                  >
                    {isMaintenanceActive ? t('admin.statusOffline') : t('admin.statusOnline')}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => router.push('/admin/maintenance')}
                  style={{
                    alignItems: 'center',
                    paddingVertical: 6,
                  }}
                  accessibilityLabel={isMaintenanceActive ? t('admin.statusOffline') : t('admin.statusOnline')}
                >
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: isMaintenanceActive ? colors.danger : colors.success,
                    }}
                  />
                </Pressable>
              )}

              <Pressable
                onPress={() => router.push('/marketplace')}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: spacing.sm,
                    paddingVertical: 8,
                    paddingHorizontal: collapsed ? 0 : spacing.sm,
                    borderRadius: radius.md,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Icon name="arrowRight" size={12} color={colors.textMuted} />
                {!collapsed && (
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>
                    {t('admin.quickHome')}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* ----------------- MAIN CONTENT AREA ----------------- */}
        <View
          style={{
            flex: 1,
            width: '100%',
            gap: spacing.lg,
            maxWidth: isDesktop ? (collapsed ? 1500 : 1380) : '100%',
          }}
        >
          {/* Main Content Page Header */}
          {isDesktop && (
            <Row
              style={{
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: spacing.md,
                paddingBottom: spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ gap: 4, flex: 1, minWidth: 260 }}>
                <Row gap={spacing.sm} style={{ alignItems: 'center' }}>
                  <Icon name={activeItem.icon} size={18} color={colors.orange} />
                  <H1 style={{ fontSize: 24, lineHeight: 30 }}>{pageTitle}</H1>
                </Row>
                {subtitle ? (
                  <Muted>{subtitle}</Muted>
                ) : activeItem.labelKey ? (
                  <Muted>{t('admin.subtitle')}</Muted>
                ) : null}
              </View>

              {headerActions && <Row gap={spacing.sm}>{headerActions}</Row>}
            </Row>
          )}

          {/* Render Page Children */}
          {children}
        </View>
      </View>
    </Page>
  );
}

function SidebarNavItem({
  item,
  active,
  collapsed,
  isMaintenanceActive,
  onPress,
  label,
}: {
  item: AdminNavItem;
  active: boolean;
  collapsed: boolean;
  isMaintenanceActive: boolean;
  onPress: () => void;
  label: string;
}) {
  const { scheme } = useTheme();
  const hasAlert = item.badgeKey === 'maintenance' && isMaintenanceActive;

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          paddingVertical: 10,
          paddingHorizontal: collapsed ? 0 : spacing.md,
          borderRadius: radius.md,
          backgroundColor: active
            ? colors.orange
            : pressed
            ? colors.surfaceAlt
            : 'transparent',
          position: 'relative',
        },
      ]}
    >
      <Row gap={spacing.sm} style={{ alignItems: 'center' }}>
        <Icon
          name={item.icon}
          size={16}
          color={active ? colors.white : colors.textMuted}
        />
        {!collapsed && (
          <Text
            style={{
              fontSize: 13.5,
              fontWeight: active ? '700' : '500',
              color: active ? colors.white : colors.ink,
            }}
            numberOfLines={1}
          >
            {label}
          </Text>
        )}
      </Row>

      {/* Alert Dot or Badge */}
      {hasAlert && (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: active ? colors.white : colors.danger,
            marginRight: collapsed ? 0 : 2,
          }}
        />
      )}
    </Pressable>
  );
}

export default AdminShell;
