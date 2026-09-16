import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { absoluteUrl } from '../api/client';
import type { PlatformBannerMedia } from '../api/types';
import { isVideoUrlOrType } from '../utils/upload';
import { colors, radius, shadow } from '../theme/theme';
import { Icon } from './Icon';

export interface HeroBackgroundSliderProps {
  media?: PlatformBannerMedia[];
  fallbackImageUrl?: string | null;
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
  showIndicators?: boolean;
  showArrows?: boolean;
}

interface NormalizedMediaItem {
  key: string;
  url: string;
  isVideo: boolean;
  durationSeconds: number;
}

function WebVideoSlide({
  url,
  isActive,
  onEnded,
  loop,
}: {
  url: string;
  isActive: boolean;
  onEnded: () => void;
  loop: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      try {
        video.currentTime = 0;
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Autoplay policy fallback: video remains muted
          });
        }
      } catch {
        // Ignored
      }
    } else {
      video.pause();
    }
  }, [isActive]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'hidden',
      }}
    >
      <video
        ref={videoRef}
        src={url}
        autoPlay
        muted
        playsInline
        loop={loop}
        onEnded={onEnded}
        onError={onEnded}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

function NativeVideoSlide({
  url,
  isActive,
  onEnded,
  loop,
}: {
  url: string;
  isActive: boolean;
  onEnded: () => void;
  loop: boolean;
}) {
  // Try expo-video on native platforms dynamically
  try {
    const ExpoVideo = require('expo-video');
    if (ExpoVideo && ExpoVideo.useVideoPlayer && ExpoVideo.VideoView) {
      return (
        <ExpoVideoWrapper
          ExpoVideo={ExpoVideo}
          url={url}
          isActive={isActive}
          onEnded={onEnded}
          loop={loop}
        />
      );
    }
  } catch {
    // If expo-video native module is unavailable, fallback to Image
  }

  return (
    <Image
      source={{ uri: url }}
      style={{ width: '100%', height: '100%' }}
      resizeMode="cover"
    />
  );
}

function ExpoVideoWrapper({
  ExpoVideo,
  url,
  isActive,
  onEnded,
  loop,
}: {
  ExpoVideo: any;
  url: string;
  isActive: boolean;
  onEnded: () => void;
  loop: boolean;
}) {
  const { useVideoPlayer, VideoView } = ExpoVideo;
  const player = useVideoPlayer(url, (p: any) => {
    p.loop = loop;
    p.muted = true;
    p.playsInline = true;
    p.play();
  });

  useEffect(() => {
    if (!player) return;
    if (isActive) {
      try {
        player.currentTime = 0;
        player.play();
      } catch {}
    } else {
      try {
        player.pause();
      } catch {}
    }
  }, [isActive, player]);

  useEffect(() => {
    if (!player) return;
    const subscription = player.addListener?.('playToEnd', () => {
      onEnded();
    });
    return () => {
      subscription?.remove?.();
    };
  }, [player, onEnded]);

  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

export function HeroBackgroundSlider({
  media,
  fallbackImageUrl,
  style,
  children,
  showIndicators = true,
  showArrows = true,
}: HeroBackgroundSliderProps) {
  const items: NormalizedMediaItem[] = useMemo(() => {
    if (media && media.length > 0) {
      return media
        .filter((m) => !!m.mediaUrl?.trim())
        .map((m, index) => {
          const rawUrl = m.mediaUrl.trim();
          const resolvedUrl = absoluteUrl(rawUrl) || rawUrl;
          const isVid =
            m.mediaType === 'VIDEO' ||
            isVideoUrlOrType(rawUrl) ||
            isVideoUrlOrType(m.mediaKey);
          return {
            key: m.id || `${rawUrl}-${index}`,
            url: resolvedUrl,
            isVideo: isVid,
            durationSeconds: Math.max(2, m.durationSeconds || 5),
          };
        });
    }

    if (fallbackImageUrl && fallbackImageUrl.trim()) {
      const rawUrl = fallbackImageUrl.trim();
      const resolvedUrl = absoluteUrl(rawUrl) || rawUrl;
      const isVid = isVideoUrlOrType(rawUrl);
      return [
        {
          key: 'fallback-0',
          url: resolvedUrl,
          isVideo: isVid,
          durationSeconds: 5,
        },
      ];
    }

    return [];
  }, [media, fallbackImageUrl]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const total = items.length;

  // Auto-advance logic
  useEffect(() => {
    if (total <= 1) return;

    const currentItem = items[currentIndex];
    if (!currentItem) return;

    // For image slides: countdown durationSeconds then advance
    if (!currentItem.isVideo) {
      const timer = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % total);
      }, currentItem.durationSeconds * 1000);

      return () => clearTimeout(timer);
    }

    // Safeguard timeout for video slides (in case onEnded is delayed or video loops/stalls)
    const safetyTimer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, 60000); // 60s max safeguard

    return () => clearTimeout(safetyTimer);
  }, [currentIndex, total, items]);

  const handleVideoEnded = () => {
    if (total > 1) {
      setCurrentIndex((prev) => (prev + 1) % total);
    }
  };

  const handlePrev = (e?: any) => {
    e?.stopPropagation?.();
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  const handleNext = (e?: any) => {
    e?.stopPropagation?.();
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const handleSelect = (index: number, e?: any) => {
    e?.stopPropagation?.();
    setCurrentIndex(index);
  };

  return (
    <View style={[styles.container, style]}>
      {/* Background Slides Container */}
      <View style={styles.slidesViewport}>
        {items.map((item, idx) => {
          const isCurrent = idx === currentIndex;
          return (
            <View
              key={item.key}
              style={[
                styles.slide,
                {
                  opacity: isCurrent ? 1 : 0,
                  zIndex: isCurrent ? 1 : 0,
                  pointerEvents: isCurrent ? 'auto' : 'none',
                  ...(Platform.OS === 'web'
                    ? ({
                        transition: 'opacity 700ms ease-in-out, transform 800ms ease-out',
                        transform: isCurrent ? 'scale(1)' : 'scale(1.03)',
                      } as any)
                    : null),
                },
              ]}
            >
              {item.isVideo ? (
                Platform.OS === 'web' ? (
                  <WebVideoSlide
                    url={item.url}
                    isActive={isCurrent}
                    onEnded={handleVideoEnded}
                    loop={total === 1}
                  />
                ) : (
                  <NativeVideoSlide
                    url={item.url}
                    isActive={isCurrent}
                    onEnded={handleVideoEnded}
                    loop={total === 1}
                  />
                )
              ) : (
                <Image
                  source={{ uri: item.url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              )}
            </View>
          );
        })}
      </View>

      {/* Children content (frosted glass card, text, etc.) */}
      {children}

      {/* Navigation Indicators & Controls when multiple media items exist */}
      {total > 1 && (
        <>
          {/* Arrow navigation buttons */}
          {showArrows && (
            <View style={styles.arrowsContainer} pointerEvents="box-none">
              <Pressable
                onPress={handlePrev}
                accessibilityLabel="Previous banner background"
                style={({ hovered, pressed }: any) => [
                  styles.arrowButton,
                  hovered && styles.arrowButtonHovered,
                  pressed && styles.arrowButtonPressed,
                ]}
              >
                <Icon name="chevronLeft" size={14} color="#ffffff" />
              </Pressable>

              <Pressable
                onPress={handleNext}
                accessibilityLabel="Next banner background"
                style={({ hovered, pressed }: any) => [
                  styles.arrowButton,
                  hovered && styles.arrowButtonHovered,
                  pressed && styles.arrowButtonPressed,
                ]}
              >
                <Icon name="chevronRight" size={14} color="#ffffff" />
              </Pressable>
            </View>
          )}

          {/* Dots Indicator */}
          {showIndicators && (
            <View style={styles.dotsContainer}>
              {items.map((item, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <Pressable
                    key={`dot-${item.key}`}
                    onPress={(e) => handleSelect(idx, e)}
                    accessibilityLabel={`Go to slide ${idx + 1}`}
                    style={({ hovered }: any) => [
                      styles.dot,
                      isActive ? styles.dotActive : styles.dotInactive,
                      hovered && !isActive && styles.dotHovered,
                    ]}
                  >
                    {item.isVideo && (
                      <View style={{ marginRight: 3 }}>
                        <Icon
                          name="play"
                          size={7}
                          color={isActive ? colors.white : 'rgba(255,255,255,0.7)'}
                        />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  slidesViewport: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  slide: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  arrowsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          cursor: 'pointer',
          transition: 'all 200ms ease',
        } as any)
      : null),
  },
  arrowButtonHovered: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    transform: [{ scale: 1.08 }],
  },
  arrowButtonPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    transform: [{ scale: 0.95 }],
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 16,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        } as any)
      : null),
  },
  dot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 8,
    borderRadius: 4,
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          transition: 'all 250ms ease',
        } as any)
      : null),
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.orange,
  },
  dotInactive: {
    width: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  dotHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    width: 12,
  },
});
