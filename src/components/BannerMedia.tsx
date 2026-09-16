import React, { useEffect, useRef } from 'react';
import { Image, Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { absoluteUrl } from '../api/client';
import { BannerMediaType } from '../api/types';
import { colors } from '../theme/theme';

export interface BannerMediaProps {
  mediaUrl: string;
  mediaType: BannerMediaType;
  onEnded?: () => void;
  onError?: () => void;
  style?: ViewStyle;
  contentFit?: 'cover' | 'contain';
}

function WebVideo({
  url,
  onEnded,
  onError,
}: {
  url: string;
  onEnded?: () => void;
  onError?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.playsInline = true;
    video.controls = false;
    video.currentTime = 0;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay may be blocked if unmuted; since muted=true it typically succeeds,
        // but if it fails, trigger onError so cycling still works.
        onError?.();
      });
    }
  }, [url, onError]);

  return (
    <video
      ref={videoRef}
      src={url}
      autoPlay
      muted
      playsInline
      controls={false}
      onEnded={onEnded}
      onError={onError}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        pointerEvents: 'none',
      }}
    />
  );
}

function NativeVideo({
  url,
  onEnded,
}: {
  url: string;
  onEnded?: () => void;
}) {
  // Dynamically require expo-video so web bundler doesn't choke if native-only
  try {
    const { useVideoPlayer, VideoView } = require('expo-video');
    return <NativeVideoInternal useVideoPlayer={useVideoPlayer} VideoView={VideoView} url={url} onEnded={onEnded} />;
  } catch {
    return <View style={StyleSheet.absoluteFill} />;
  }
}

function NativeVideoInternal({
  useVideoPlayer,
  VideoView,
  url,
  onEnded,
}: {
  useVideoPlayer: any;
  VideoView: any;
  url: string;
  onEnded?: () => void;
}) {
  const player = useVideoPlayer(url, (p: any) => {
    p.loop = false;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    if (!player) return;
    const sub = player.addListener('playToEnd', () => {
      onEnded?.();
    });
    return () => {
      sub?.remove?.();
    };
  }, [player, onEnded]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

export function BannerMedia({
  mediaUrl,
  mediaType,
  onEnded,
  onError,
  style,
  contentFit = 'cover',
}: BannerMediaProps) {
  const resolvedUrl = absoluteUrl(mediaUrl) || mediaUrl;

  return (
    <View style={[{ width: '100%', height: '100%', overflow: 'hidden', backgroundColor: colors.surfaceAlt }, style]}>
      {mediaType === 'VIDEO' ? (
        Platform.OS === 'web' ? (
          <WebVideo url={resolvedUrl} onEnded={onEnded} onError={onError} />
        ) : (
          <NativeVideo url={resolvedUrl} onEnded={onEnded} />
        )
      ) : (
        <Image
          source={{ uri: resolvedUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode={contentFit}
          onError={onError}
        />
      )}
    </View>
  );
}
