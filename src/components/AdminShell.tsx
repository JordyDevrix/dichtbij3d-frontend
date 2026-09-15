import React from 'react';
import { View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Icon, IconName } from './Icon';
import { Page } from './Page';
import { Card, Chip, EmptyState, H1, Muted, Row, Spinner } from './ui';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { colors, spacing } from '../theme/theme';

const TABS: { href: string; labelKey: string; icon: IconName }[] = [
  { href: '/admin', labelKey: 'admin.overview', icon: 'chart' },
  { href: '/admin/users', labelKey: 'admin.users', icon: 'users' },
  { href: '/admin/adverts', labelKey: 'admin.adverts', icon: 'layers' },
  { href: '/admin/reports', labelKey: 'admin.reports', icon: 'flag' },
  { href: '/admin/banner', labelKey: 'admin.banner', icon: 'image' },
  { href: '/admin/announcements', labelKey: 'admin.announcements', icon: 'bell' },
];

/** Guards the admin area and renders the shared heading + tab bar. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const { isAdmin, booting } = useAuth();

  if (booting)
    return (
      <Page maxWidth={1200}>
        <Spinner />
      </Page>
    );

  if (!isAdmin)
    return (
      <Page maxWidth={600}>
        <Card>
          <EmptyState icon="ban" title={t('admin.adminOnly')} />
        </Card>
      </Page>
    );

  return (
    <Page maxWidth={1200}>
      <View style={{ gap: 4 }}>
        <Row gap={spacing.sm}>
          <Icon name="userShield" size={20} color={colors.orange} />
          <H1>{t('admin.title')}</H1>
        </Row>
        <Muted>{t('admin.subtitle')}</Muted>
      </View>

      <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
        {TABS.map((tab) => (
          <Chip
            key={tab.href}
            label={t(tab.labelKey)}
            icon={tab.icon}
            selected={pathname === tab.href}
            onPress={() => router.push(tab.href as any)}
          />
        ))}
      </Row>

      {children}
    </Page>
  );
}
