import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Text, View } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme/theme';
import { Icon, IconName } from '../components/Icon';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastValue {
  toast: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastValue>({
  toast: () => undefined,
  success: () => undefined,
  error: () => undefined,
});

const TONES: Record<ToastTone, { bg: string; fg: string; icon: IconName }> = {
  success: { bg: colors.success, fg: colors.white, icon: 'checkCircle' },
  error: { bg: colors.danger, fg: colors.white, icon: 'error' },
  info: { bg: colors.ink, fg: colors.white, icon: 'info' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, tone: ToastTone = 'info') => {
    counter.current += 1;
    const id = counter.current;
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((item) => item.id !== id)), 4200);
  }, []);

  const value = useMemo<ToastValue>(
    () => ({
      toast,
      success: (message: string) => toast(message, 'success'),
      error: (message: string) => toast(message, 'error'),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        pointerEvents="none"
        style={{
          position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
          bottom: spacing.xl,
          left: 0,
          right: 0,
          alignItems: 'center',
          gap: spacing.sm,
          zIndex: 9999,
        }}
      >
        {items.map((item) => {
          const tone = TONES[item.tone];
          return (
            <Animated.View
              key={item.id}
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  backgroundColor: tone.bg,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg,
                  borderRadius: radius.pill,
                  maxWidth: 520,
                },
                shadow.raised,
              ]}
            >
              <Icon name={tone.icon} size={15} color={tone.fg} />
              <Text style={{ color: tone.fg, fontWeight: '600', fontSize: 14 }}>{item.message}</Text>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
