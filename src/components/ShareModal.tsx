import React, { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import { API_BASE_URL } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { colors, radius, shadow, spacing, typography } from '../theme/theme';
import { Icon } from './Icon';
import { Body, Button, H3, Muted, Row, Sheet } from './ui';

export function getShareUrl(advertId: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/advert/${advertId}`;
  }
  const base = process.env.EXPO_PUBLIC_SITE_URL || 'https://dichtbij3d.nl';
  return `${base.replace(/\/$/, '')}/advert/${advertId}`;
}

export async function shareAdvert(
  advert: { id: string; title: string },
  onFallback?: () => void
): Promise<boolean> {
  const shareUrl = getShareUrl(advert.id);
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: advert.title,
        text: `${advert.title} — Dichtbij3D`,
        url: shareUrl,
      });
      return true;
    } catch (err: any) {
      if (err?.name === 'AbortError') return false;
    }
  }
  onFallback?.();
  return false;
}

interface Props {
  open: boolean;
  onClose: () => void;
  advert: {
    id: string;
    title: string;
  };
}

export function ShareModal({ open, onClose, advert }: Props) {
  const { t } = useI18n();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => getShareUrl(advert.id), [advert.id]);

  const copyLink = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else if (typeof document !== 'undefined') {
        const el = document.createElement('textarea');
        el.value = shareUrl;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      toast.success(t('advert.linkCopied'));
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  const openExternal = (url: string) => {
    if (Platform.OS === 'web') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      void Linking.openURL(url);
    }
  };

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const triggerNativeShare = async () => {
    if (!canNativeShare) return;
    try {
      await navigator.share({
        title: advert.title,
        text: `${advert.title} — Dichtbij3D`,
        url: shareUrl,
      });
      onClose();
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        toast.error(t('errors.generic'));
      }
    }
  };

  const socialPlatforms = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: 'whatsapp' as const,
      color: '#FFFFFF',
      bg: '#25D366',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${advert.title}\n${shareUrl}`)}`,
    },
    {
      id: 'xtwitter',
      name: 'X',
      icon: 'xTwitter' as const,
      color: '#FFFFFF',
      bg: '#0F1419',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(advert.title)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: 'facebook' as const,
      color: '#FFFFFF',
      bg: '#1877F2',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: 'linkedin' as const,
      color: '#FFFFFF',
      bg: '#0A66C2',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    },
    {
      id: 'email',
      name: 'E-mail',
      icon: 'envelope' as const,
      color: colors.text,
      bg: colors.surfaceAlt,
      border: colors.borderStrong,
      url: `mailto:?subject=${encodeURIComponent(advert.title)}&body=${encodeURIComponent(`${advert.title}\n\nBekijk deze advertentie op Dichtbij3D:\n${shareUrl}`)}`,
    },
  ];

  return (
    <Sheet open={open} onClose={onClose} title={t('advert.shareTitle')} width={460}>
      <View style={{ gap: spacing.md }}>
        <Muted>{t('advert.shareDesc')}</Muted>

        {/* Advert title preview badge */}
        <View
          style={{
            padding: spacing.md,
            backgroundColor: colors.surfaceAlt,
            borderRadius: radius.md,
            borderLeftWidth: 3,
            borderLeftColor: colors.orange,
          }}
        >
          <H3 numberOfLines={1}>{advert.title}</H3>
          <Muted numberOfLines={1} style={{ fontSize: 12, marginTop: 2 }}>
            {shareUrl}
          </Muted>
        </View>

        {/* Copy link input row */}
        <View style={{ gap: spacing.xs }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surfaceAlt,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
            }}
          >
            <View style={{ paddingHorizontal: spacing.sm }}>
              <Icon name="link" size={14} color={colors.textMuted} />
            </View>
            <View style={{ flex: 1, paddingVertical: spacing.sm, paddingRight: spacing.sm }}>
              <Body numberOfLines={1} style={{ fontSize: 13, color: colors.text }}>
                {shareUrl}
              </Body>
            </View>
            <Pressable
              onPress={copyLink}
              style={({ pressed, hovered }: any) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: copied ? colors.success : colors.orange,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm + 2,
                  opacity: pressed ? 0.85 : 1,
                  cursor: 'pointer' as any,
                },
              ]}
            >
              <Icon name={copied ? 'check' : 'copy'} size={14} color="#FFFFFF" />
              <Body style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>
                {copied ? t('common.copied') : t('common.copy')}
              </Body>
            </Pressable>
          </View>
        </View>

        {/* Social sharing buttons */}
        <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
          <Muted style={{ fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('common.share')}
          </Muted>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {socialPlatforms.map((platform) => (
              <Pressable
                key={platform.id}
                onPress={() => openExternal(platform.url)}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.xs + 2,
                    backgroundColor: platform.bg,
                    borderColor: platform.border ?? platform.bg,
                    borderWidth: 1,
                    borderRadius: radius.md,
                    paddingVertical: spacing.xs + 2,
                    paddingHorizontal: spacing.md,
                    opacity: pressed ? 0.85 : 1,
                    cursor: 'pointer' as any,
                  },
                ]}
              >
                <Icon name={platform.icon} size={15} color={platform.color} />
                <Body style={{ color: platform.color, fontWeight: '600', fontSize: 13 }}>{platform.name}</Body>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Optional Native Share fallback button */}
        {canNativeShare && (
          <View style={{ marginTop: spacing.xs }}>
            <Button
              title={t('advert.systemShare')}
              icon="share"
              variant="outline"
              full
              onPress={triggerNativeShare}
            />
          </View>
        )}
      </View>
    </Sheet>
  );
}
