import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { usePathname } from 'expo-router';
import { Platform } from 'react-native';

interface HeaderScrollContextValue {
  isScrolled: boolean;
  onScrollY: (y: number) => void;
}

const HeaderScrollContext = createContext<HeaderScrollContextValue>({
  isScrolled: false,
  onScrollY: () => {},
});

export const SCROLL_THRESHOLD = 15;

export function HeaderScrollProvider({ children }: { children: React.ReactNode }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const isScrolledRef = useRef(false);
  const pathname = usePathname();

  // Reset scroll state when navigating to a different route
  useEffect(() => {
    isScrolledRef.current = false;
    setIsScrolled(false);
  }, [pathname]);

  const onScrollY = useCallback((y: number) => {
    const next = y > SCROLL_THRESHOLD;
    if (next !== isScrolledRef.current) {
      isScrolledRef.current = next;
      setIsScrolled(next);
    }
  }, []);

  // Web window scroll listener fallback
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handleScroll = () => {
      const y = window.scrollY || document.documentElement?.scrollTop || 0;
      onScrollY(y);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [onScrollY]);

  const value = useMemo(() => ({ isScrolled, onScrollY }), [isScrolled, onScrollY]);

  return <HeaderScrollContext.Provider value={value}>{children}</HeaderScrollContext.Provider>;
}

export function useHeaderScroll() {
  return useContext(HeaderScrollContext);
}
