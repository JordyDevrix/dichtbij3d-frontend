import React, { useState } from 'react';
import { Image, ImageProps, ImageStyle, Platform, StyleProp, StyleSheet, View } from 'react-native';

export interface AppImageProps extends Omit<ImageProps, 'source'> {
  uri?: string | null;
  source?: ImageProps['source'];
  fallback?: React.ReactNode;
  alt?: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

/**
 * Robust cross-platform image component.
 * On Web, directly renders a native HTML `<img>` with `object-fit` to bypass
 * React Native Web's background-image + z-index: -1 compositor bug in Chromium browsers
 * (which causes images to disappear or only show on hover).
 * On Native (iOS/Android), delegates to React Native's `<Image>`.
 */
export function AppImage({
  uri,
  source,
  fallback,
  alt = '',
  style,
  resizeMode = 'cover',
  ...rest
}: AppImageProps) {
  const [hasError, setHasError] = useState(false);

  const rawUri = uri || (typeof source === 'object' && source !== null && 'uri' in source ? (source as any).uri : undefined);
  // Neutralize ad-blocker filters (EasyList blocks any URL matching */adverts/*)
  const resolvedUri = typeof rawUri === 'string'
    ? rawUri.replace('/api/files/adverts/', '/api/files/listings/')
    : rawUri;

  if (hasError || (!resolvedUri && !source)) {
    return fallback ? <>{fallback}</> : null;
  }

  if (Platform.OS === 'web' && resolvedUri) {
    const flattened = (StyleSheet.flatten(style) || {}) as Record<string, any>;
    const {
      position,
      top,
      left,
      right,
      bottom,
      width,
      height,
      borderRadius,
      borderTopLeftRadius,
      borderTopRightRadius,
      borderBottomLeftRadius,
      borderBottomRightRadius,
      borderWidth,
      borderColor,
      backgroundColor,
      opacity,
      zIndex,
      transform,
    } = flattened;

    const imgStyle: React.CSSProperties = {
      position: position || (width === '100%' && height === '100%' ? 'relative' : undefined),
      top: top ?? undefined,
      left: left ?? undefined,
      right: right ?? undefined,
      bottom: bottom ?? undefined,
      width: width ?? '100%',
      height: height ?? '100%',
      objectFit: resizeMode === 'contain' ? 'contain' : 'cover',
      borderRadius: borderRadius ?? undefined,
      borderTopLeftRadius: borderTopLeftRadius ?? undefined,
      borderTopRightRadius: borderTopRightRadius ?? undefined,
      borderBottomLeftRadius: borderBottomLeftRadius ?? undefined,
      borderBottomRightRadius: borderBottomRightRadius ?? undefined,
      borderWidth: borderWidth ?? undefined,
      borderColor: borderColor ?? undefined,
      backgroundColor: backgroundColor ?? undefined,
      opacity: opacity ?? undefined,
      zIndex: zIndex ?? undefined,
      display: 'block',
      maxWidth: '100%',
      pointerEvents: 'none',
    };

    return React.createElement('img', {
      src: resolvedUri,
      alt,
      loading: 'eager',
      decoding: 'async',
      style: imgStyle,
      onError: (e: any) => {
        setHasError(true);
        rest.onError?.(e);
      },
      onLoad: (e: any) => {
        rest.onLoad?.(e);
      },
    });
  }

  const imageSource = source || (resolvedUri ? { uri: resolvedUri } : undefined);
  if (!imageSource) return fallback ? <>{fallback}</> : null;

  return (
    <Image
      source={imageSource}
      style={style}
      resizeMode={resizeMode}
      onError={(e) => {
        setHasError(true);
        rest.onError?.(e);
      }}
      {...rest}
    />
  );
}
