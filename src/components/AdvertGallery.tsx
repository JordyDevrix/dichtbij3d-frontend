import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { AppImage } from './AppImage';
import { Body } from './ui';
import { colors, radius, spacing } from '../theme/theme';
import { useI18n } from '../i18n';

export interface AdvertGalleryProps {
  images: string[];
  title?: string;
  isWide?: boolean;
}

export function AdvertGallery({ images, title, isWide }: AdvertGalleryProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Auto-clamp active index if images array changes
  useEffect(() => {
    if (activeIndex >= images.length) {
      setActiveIndex(Math.max(0, images.length - 1));
    }
  }, [images.length, activeIndex]);

  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const thumbScrollRef = useRef<ScrollView>(null);

  const prevImage = useCallback(() => {
    if (images.length <= 1) return;
    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const nextImage = useCallback(() => {
    if (images.length <= 1) return;
    setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  // Keep active thumbnail in view when activeIndex changes
  useEffect(() => {
    if (thumbScrollRef.current && images.length > 1) {
      thumbScrollRef.current.scrollTo({
        x: Math.max(0, activeIndex * 86 - 100),
        animated: true,
      });
    }
  }, [activeIndex, images.length]);

  // Handle keyboard navigation when lightbox is open on web
  useEffect(() => {
    if (Platform.OS !== 'web' || !lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevImage();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextImage();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setLightboxOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, prevImage, nextImage]);

  const handleTouchStart = (e: any) => {
    touchStartX.current = e.nativeEvent?.pageX ?? 0;
    touchStartY.current = e.nativeEvent?.pageY ?? 0;
  };

  const handleTouchEnd = (e: any) => {
    const endX = e.nativeEvent?.pageX ?? 0;
    const endY = e.nativeEvent?.pageY ?? 0;
    const dx = touchStartX.current - endX;
    const dy = Math.abs(touchStartY.current - endY);
    // Only trigger if horizontal swipe is dominant and exceeds threshold
    if (Math.abs(dx) > 35 && Math.abs(dx) > dy * 1.2) {
      if (dx > 0) {
        nextImage();
      } else {
        prevImage();
      }
    }
  };

  if (images.length === 0) {
    return (
      <View
        style={{
          height: isWide ? 380 : 240,
          backgroundColor: colors.orangeSofter,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="cube" size={52} color={colors.orangeBorder} />
      </View>
    );
  }

  const activeUri = images[activeIndex] || images[0];

  return (
    <View style={{ width: '100%' }}>
      {/* --------------------------------- Main Hero Viewport */}
      <View
        style={{
          position: 'relative',
          height: isWide ? 420 : 280,
          backgroundColor: colors.surfaceAlt,
          overflow: 'hidden',
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Pressable
          onPress={() => setLightboxOpen(true)}
          style={{ width: '100%', height: '100%', cursor: 'pointer' } as any}
          accessibilityLabel={t('advert.fullscreen')}
        >
          <AppImage
            uri={activeUri}
            alt={title ? `${title} (${activeIndex + 1}/${images.length})` : undefined}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </Pressable>

        {/* Counter Badge */}
        {images.length > 1 && (
          <View
            style={{
              position: 'absolute',
              top: spacing.md,
              left: spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: radius.pill,
            }}
          >
            <Icon name="camera" size={12} color="#FFFFFF" />
            <Body style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
              {activeIndex + 1} / {images.length}
            </Body>
          </View>
        )}

        {/* Fullscreen Expand Trigger */}
        <Pressable
          onPress={() => setLightboxOpen(true)}
          accessibilityLabel={t('advert.fullscreen')}
          style={({ hovered }: any) => [
            {
              position: 'absolute',
              top: spacing.md,
              right: spacing.md,
              width: 36,
              height: 36,
              borderRadius: radius.pill,
              backgroundColor: hovered ? 'rgba(15, 23, 42, 0.85)' : 'rgba(15, 23, 42, 0.7)',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            },
          ]}
        >
          <Icon name="expand" size={14} color="#FFFFFF" />
        </Pressable>

        {/* Navigation Arrows (Prev / Next) */}
        {images.length > 1 && (
          <>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              accessibilityLabel="Previous image"
              style={({ hovered }: any) => [
                {
                  position: 'absolute',
                  left: spacing.sm,
                  top: '50%',
                  marginTop: -20,
                  width: 40,
                  height: 40,
                  borderRadius: radius.pill,
                  backgroundColor: hovered ? 'rgba(15, 23, 42, 0.88)' : 'rgba(15, 23, 42, 0.7)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                },
              ]}
            >
              <Icon name="chevronLeft" size={15} color="#FFFFFF" />
            </Pressable>

            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              accessibilityLabel="Next image"
              style={({ hovered }: any) => [
                {
                  position: 'absolute',
                  right: spacing.sm,
                  top: '50%',
                  marginTop: -20,
                  width: 40,
                  height: 40,
                  borderRadius: radius.pill,
                  backgroundColor: hovered ? 'rgba(15, 23, 42, 0.88)' : 'rgba(15, 23, 42, 0.7)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                },
              ]}
            >
              <Icon name="chevronRight" size={15} color="#FFFFFF" />
            </Pressable>
          </>
        )}

        {/* Bottom Paging Dots */}
        {images.length > 1 && images.length <= 10 && (
          <View
            style={{
              position: 'absolute',
              bottom: 10,
              left: 0,
              right: 0,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 6,
            }}
            pointerEvents="box-none"
          >
            {images.map((_, idx) => (
              <Pressable
                key={`dot-${idx}`}
                onPress={() => setActiveIndex(idx)}
                style={{
                  width: idx === activeIndex ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: idx === activeIndex ? colors.orange : 'rgba(255, 255, 255, 0.75)',
                  shadowColor: '#000000',
                  shadowOpacity: 0.35,
                  shadowRadius: 2,
                  shadowOffset: { width: 0, height: 1 },
                }}
              />
            ))}
          </View>
        )}
      </View>

      {/* --------------------------------- Thumbnail Strip */}
      {images.length > 1 && (
        <ScrollView
          ref={thumbScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            padding: spacing.md,
            gap: spacing.sm,
            alignItems: 'center',
          }}
        >
          {images.map((uri, index) => {
            const isActive = index === activeIndex;
            return (
              <Pressable
                key={`${uri}-${index}`}
                onPress={() => setActiveIndex(index)}
                style={{
                  borderRadius: radius.md,
                  borderWidth: 2,
                  borderColor: isActive ? colors.orange : 'transparent',
                  opacity: isActive ? 1 : 0.72,
                  overflow: 'hidden',
                  cursor: 'pointer',
                } as any}
              >
                <AppImage
                  uri={uri}
                  style={{
                    width: 78,
                    height: 58,
                    borderRadius: radius.sm,
                  }}
                  resizeMode="cover"
                />
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* --------------------------------- Fullscreen Lightbox Modal */}
      <Modal
        visible={lightboxOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(3, 7, 18, 0.96)',
            paddingTop: insets.top || spacing.md,
            paddingBottom: insets.bottom || spacing.md,
          }}
        >
          {/* Lightbox Header Bar */}
          <View
            style={{
              height: 54,
              paddingHorizontal: spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="image" size={16} color="#FFFFFF" />
              <Body style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
                {t('advert.photoCount', { current: activeIndex + 1, total: images.length })}
              </Body>
            </View>

            <Pressable
              onPress={() => setLightboxOpen(false)}
              accessibilityLabel="Close"
              style={({ hovered }: any) => [
                {
                  width: 40,
                  height: 40,
                  borderRadius: radius.pill,
                  backgroundColor: hovered ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                },
              ]}
            >
              <Icon name="close" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Lightbox Main Image Viewport */}
          <View
            style={{
              flex: 1,
              position: 'relative',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <AppImage
              uri={activeUri}
              alt={title || ''}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />

            {/* Lightbox Navigation Chevrons */}
            {images.length > 1 && (
              <>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  accessibilityLabel="Previous image"
                  style={({ hovered }: any) => [
                    {
                      position: 'absolute',
                      left: spacing.lg,
                      top: '50%',
                      marginTop: -24,
                      width: 48,
                      height: 48,
                      borderRadius: radius.pill,
                      backgroundColor: hovered ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    },
                  ]}
                >
                  <Icon name="chevronLeft" size={20} color="#FFFFFF" />
                </Pressable>

                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  accessibilityLabel="Next image"
                  style={({ hovered }: any) => [
                    {
                      position: 'absolute',
                      right: spacing.lg,
                      top: '50%',
                      marginTop: -24,
                      width: 48,
                      height: 48,
                      borderRadius: radius.pill,
                      backgroundColor: hovered ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    },
                  ]}
                >
                  <Icon name="chevronRight" size={20} color="#FFFFFF" />
                </Pressable>
              </>
            )}
          </View>

          {/* Lightbox Bottom Miniature Thumbnails */}
          {images.length > 1 && (
            <View style={{ height: 68, paddingHorizontal: spacing.md, justifyContent: 'center' }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingHorizontal: spacing.md,
                }}
              >
                {images.map((uri, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <Pressable
                      key={`lightbox-thumb-${uri}-${index}`}
                      onPress={() => setActiveIndex(index)}
                      style={{
                        borderRadius: radius.sm,
                        borderWidth: 2,
                        borderColor: isActive ? colors.orange : 'transparent',
                        opacity: isActive ? 1 : 0.6,
                        overflow: 'hidden',
                        cursor: 'pointer',
                      } as any}
                    >
                      <AppImage
                        uri={uri}
                        style={{
                          width: 60,
                          height: 44,
                          borderRadius: radius.sm - 2,
                        }}
                        resizeMode="cover"
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}
