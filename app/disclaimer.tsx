import React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Page } from '../src/components/Page';
import { Body, Button, Card, H1, H3, Muted, Row } from '../src/components/ui';
import { Icon } from '../src/components/Icon';
import { useGoBack } from '../src/hooks/useGoBack';
import { useI18n } from '../src/i18n';
import { colors, spacing } from '../src/theme/theme';

export default function DisclaimerScreen() {
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
          <Icon name="shield" size={24} color={colors.orange} />
          <H1>{t('disclaimerPage.title')}</H1>
        </Row>
        <Muted>{t('disclaimerPage.subtitle')}</Muted>
      </View>

      <View style={{ gap: spacing.lg }}>
        {/* Section 1 */}
        <Card style={{ gap: spacing.sm }}>
          <H3>{t('disclaimerPage.generalTitle')}</H3>
          <Body style={{ lineHeight: 22, color: colors.text }}>
            {t('disclaimerPage.generalBody')}
          </Body>
        </Card>

        {/* Section 2 */}
        <Card style={{ gap: spacing.sm }}>
          <H3>{t('disclaimerPage.printQualityTitle')}</H3>
          <Body style={{ lineHeight: 22, color: colors.text }}>
            {t('disclaimerPage.printQualityBody')}
          </Body>
        </Card>

        {/* Section 3 */}
        <Card style={{ gap: spacing.sm }}>
          <H3>{t('disclaimerPage.ipTitle')}</H3>
          <Body style={{ lineHeight: 22, color: colors.text }}>
            {t('disclaimerPage.ipBody')}
          </Body>
        </Card>

        {/* Section 4 */}
        <Card style={{ gap: spacing.sm }}>
          <H3>{t('disclaimerPage.liabilityTitle')}</H3>
          <Body style={{ lineHeight: 22, color: colors.text }}>
            {t('disclaimerPage.liabilityBody')}
          </Body>
        </Card>

        {/* Section 5 */}
        <Card style={{ gap: spacing.sm }}>
          <H3>{t('disclaimerPage.externalTitle')}</H3>
          <Body style={{ lineHeight: 22, color: colors.text }}>
            {t('disclaimerPage.externalBody')}
          </Body>
        </Card>

        {/* Section 6 - Contact */}
        <Card style={{ gap: spacing.sm, backgroundColor: colors.surfaceAlt }}>
          <H3>{t('disclaimerPage.contactTitle')}</H3>
          <Body style={{ lineHeight: 22, color: colors.text }}>
            {t('disclaimerPage.contactBody')}
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
