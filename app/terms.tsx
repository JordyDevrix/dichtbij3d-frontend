import React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Page } from '../src/components/Page';
import { Body, Button, Card, H1, H3, Muted, Row } from '../src/components/ui';
import { Icon } from '../src/components/Icon';
import { useGoBack } from '../src/hooks/useGoBack';
import { useI18n } from '../src/i18n';
import { colors, spacing } from '../src/theme/theme';

export default function TermsScreen() {
  const { t } = useI18n();
  const goBack = useGoBack('/');

  const handleEmail = () => {
    void Linking.openURL('mailto:contact@jordyevrix.com');
  };

  return (
    <Page maxWidth={860}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Button title={t('common.back')} icon="back" variant="ghost" size="sm" onPress={goBack} />
      </Row>

      <View style={{ gap: 6 }}>
        <Row gap={spacing.sm}>
          <Icon name="handshake" size={24} color={colors.orange} />
          <H1>{t('termsPage.title')}</H1>
        </Row>
        <Muted>{t('termsPage.subtitle')}</Muted>
        <Muted style={{ fontStyle: 'italic', fontSize: 12 }}>{t('termsPage.lastUpdated')}</Muted>
      </View>

      <View style={{ gap: spacing.lg }}>
        {/* Article 1 */}
        <Card style={{ gap: spacing.sm }}>
          <H3>{t('termsPage.art1Title')}</H3>
          <Body style={{ lineHeight: 22, color: colors.text }}>
            {t('termsPage.art1Body')}
          </Body>
        </Card>

        {/* Article 2 */}
        <Card style={{ gap: spacing.sm }}>
          <H3>{t('termsPage.art2Title')}</H3>
          <Body style={{ lineHeight: 22, color: colors.text }}>
            {t('termsPage.art2Body')}
          </Body>
        </Card>

        {/* Article 3 */}
        <Card style={{ gap: spacing.sm }}>
          <H3>{t('termsPage.art3Title')}</H3>
          <Body style={{ lineHeight: 22, color: colors.text }}>
            {t('termsPage.art3Body')}
          </Body>
        </Card>

        {/* Article 4 */}
        <Card style={{ gap: spacing.sm }}>
          <H3>{t('termsPage.art4Title')}</H3>
          <Body style={{ lineHeight: 22, color: colors.text }}>
            {t('termsPage.art4Body')}
          </Body>
        </Card>

        {/* Article 5 */}
        <Card style={{ gap: spacing.sm }}>
          <H3>{t('termsPage.art5Title')}</H3>
          <Body style={{ lineHeight: 22, color: colors.text }}>
            {t('termsPage.art5Body')}
          </Body>
        </Card>

        {/* Article 6 */}
        <Card style={{ gap: spacing.sm }}>
          <H3>{t('termsPage.art6Title')}</H3>
          <Body style={{ lineHeight: 22, color: colors.text }}>
            {t('termsPage.art6Body')}
          </Body>
        </Card>

        {/* Article 7 */}
        <Card style={{ gap: spacing.sm }}>
          <H3>{t('termsPage.art7Title')}</H3>
          <Body style={{ lineHeight: 22, color: colors.text }}>
            {t('termsPage.art7Body')}
          </Body>
        </Card>

        {/* Article 8 */}
        <Card style={{ gap: spacing.sm }}>
          <H3>{t('termsPage.art8Title')}</H3>
          <Body style={{ lineHeight: 22, color: colors.text }}>
            {t('termsPage.art8Body')}
          </Body>
        </Card>

        {/* Article 9 - Contact */}
        <Card style={{ gap: spacing.sm, backgroundColor: colors.surfaceAlt }}>
          <H3>{t('termsPage.art9Title')}</H3>
          <Body style={{ lineHeight: 22, color: colors.text }}>
            {t('termsPage.art9Body')}
          </Body>
          <Pressable
            accessibilityRole="link"
            onPress={handleEmail}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              alignSelf: 'flex-start',
              paddingVertical: 6,
            }}
          >
            <Icon name="envelope" size={16} color={colors.orange} />
            <Body style={{ color: colors.orange, fontWeight: '700' }}>
              contact@jordyevrix.com
            </Body>
          </Pressable>
        </Card>
      </View>
    </Page>
  );
}
