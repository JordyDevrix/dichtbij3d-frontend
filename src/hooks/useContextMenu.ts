import { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';

/**
 * Attaches a native `contextmenu` (right click) listener on web.
 * On native platforms the caller should fall back to `onLongPress`.
 */
export function useContextMenu(onOpen: () => void) {
  const ref = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = ref.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== 'function') return;
    const handler = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      onOpen();
    };
    node.addEventListener('contextmenu', handler);
    return () => node.removeEventListener('contextmenu', handler);
  }, [onOpen]);

  return ref;
}
