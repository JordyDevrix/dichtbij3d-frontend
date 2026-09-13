import { useCallback } from 'react';
import { useRouter } from 'expo-router';

/**
 * `router.back()` silently does nothing when there is no previous screen in the
 * navigation stack — which happens on a deep link, a refreshed PWA, a shared
 * URL or after a `router.replace`. That made "cancel" and "back" look broken
 * every now and then, so always fall back to an explicit destination.
 */
export function useGoBack(fallback = '/') {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback as any);
  }, [fallback, router]);
}
