import { useWindowDimensions } from 'react-native';

export function useBreakpoint() {
  const { width } = useWindowDimensions();
  return {
    width,
    isPhone: width < 700,
    isTablet: width >= 700 && width < 1024,
    isDesktop: width >= 1024,
    /** Wide enough to show the full top navigation instead of a bottom bar. */
    isWide: width >= 900,
    columns: width >= 1280 ? 3 : width >= 820 ? 2 : 1,
  };
}
