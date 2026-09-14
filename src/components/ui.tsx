import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeContext';
import { colors, radius, shadow, spacing, typography } from '../theme/theme';
import { Icon, IconName } from './Icon';
import { AppImage } from './AppImage';
import { avatarColor, initials } from '../utils/format';

/* ------------------------------------------------------------------ Button */

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  disabled,
  full,
  style,
}: ButtonProps) {
  const [hovered, setHovered] = useState(false);
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string; hover: string }> = {
    primary: { bg: colors.orange, fg: colors.white, border: colors.orange, hover: colors.orangeDark },
    secondary: { bg: colors.orangeSoft, fg: colors.orangeDarker, border: colors.orangeBorder, hover: colors.orangeBorder },
    outline: { bg: colors.surface, fg: colors.text, border: colors.border, hover: colors.surfaceAlt },
    ghost: { bg: 'transparent', fg: colors.textMuted, border: 'transparent', hover: colors.surfaceAlt },
    danger: { bg: colors.danger, fg: colors.white, border: colors.danger, hover: colors.orangeDark },
  };
  const sizing: Record<ButtonSize, { py: number; px: number; font: number; icon: number }> = {
    sm: { py: 7, px: 12, font: 13, icon: 12 },
    md: { py: 10, px: 16, font: 14, icon: 14 },
    lg: { py: 13, px: 22, font: 15, icon: 16 },
  };
  const p = palette[variant];
  const s = sizing[size];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={inactive ? undefined : onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        {
          backgroundColor: hovered && !inactive ? p.hover : p.bg,
          borderColor: p.border,
          borderWidth: 1,
          borderRadius: radius.md,
          paddingVertical: s.py,
          paddingHorizontal: s.px,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          opacity: inactive ? 0.45 : pressed ? 0.85 : 1,
          alignSelf: full ? 'stretch' : 'flex-start',
          transform: [{ scale: pressed && !inactive ? 0.985 : 1 }],
          ...(Platform.OS === 'web'
            ? ({ transitionDuration: '140ms', transitionProperty: 'background-color, border-color, transform' } as any)
            : null),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={p.fg} />
      ) : (
        icon && <Icon name={icon} size={s.icon} color={p.fg} />
      )}
      <Text style={{ color: p.fg, fontSize: s.font, fontWeight: '600', letterSpacing: -0.1 }}>{title}</Text>
      {iconRight && !loading && <Icon name={iconRight} size={s.icon} color={p.fg} />}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ IconButton */

export function IconButton({
  name,
  onPress,
  size = 16,
  color = colors.textMuted,
  label,
  style,
}: {
  name: IconName;
  onPress?: () => void;
  size?: number;
  color?: string;
  label?: string;
  style?: ViewStyle;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        {
          padding: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: hovered ? colors.surfaceAlt : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Icon name={name} size={size} color={color} />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ Card */

export function Card({
  children,
  style,
  padded = true,
  flat,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  /** Drop the shadow — useful for cards inside other surfaces. */
  flat?: boolean;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: padded ? spacing.lg : 0,
          overflow: 'hidden',
        },
        flat ? null : shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------ Text helpers */

export function H1({ children, style }: { children: React.ReactNode; style?: any }) {
  return <Text style={[typography.h1, style]}>{children}</Text>;
}
export function H2({ children, style }: { children: React.ReactNode; style?: any }) {
  return <Text style={[typography.h2, style]}>{children}</Text>;
}
export function H3({
  children,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  style?: any;
  numberOfLines?: number;
}) {
  return (
    <Text style={[typography.h3, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}
export function Body({ children, style, numberOfLines }: { children: React.ReactNode; style?: any; numberOfLines?: number }) {
  return (
    <Text style={[typography.body, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}
export function Muted({ children, style, numberOfLines }: { children: React.ReactNode; style?: any; numberOfLines?: number }) {
  return (
    <Text style={[typography.small, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

/* ------------------------------------------------------------------ Input */

export interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string | null;
  icon?: IconName;
  password?: boolean;
  containerStyle?: ViewStyle;
}

export function Input({ label, hint, error, icon, password, containerStyle, style, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);
  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label && <Text style={typography.label}>{label}</Text>}
      <View
        style={{
          flexDirection: 'row',
          alignItems: rest.multiline ? 'flex-start' : 'center',
          gap: spacing.sm,
          borderWidth: 1,
          borderColor: error ? colors.danger : focused ? colors.orange : colors.border,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: rest.multiline ? spacing.md : 0,
          minHeight: rest.multiline ? 112 : 44,
          ...(Platform.OS === 'web'
            ? ({
                transitionDuration: '140ms',
                transitionProperty: 'border-color, box-shadow',
                boxShadow: focused
                  ? `0 0 0 3px ${error ? colors.dangerSoft : colors.orangeSoft}`
                  : 'none',
              } as any)
            : null),
        }}
      >
        {icon && <Icon name={icon} size={15} color={focused ? colors.orange : colors.textFaint} style={rest.multiline ? { marginTop: 3 } : undefined} />}
        <TextInput
          {...rest}
          secureTextEntry={password && !reveal}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={colors.textFaint}
          style={[
            {
              flex: 1,
              fontSize: 15,
              color: colors.text,
              paddingVertical: rest.multiline ? 0 : 12,
              textAlignVertical: rest.multiline ? 'top' : 'center',
              minHeight: rest.multiline ? 86 : undefined,
              // remove the default web focus ring; the border already communicates focus
              ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
            },
            style,
          ]}
        />
        {password && (
          <IconButton name={reveal ? 'eyeOff' : 'eye'} size={15} onPress={() => setReveal((v) => !v)} />
        )}
      </View>
      {error ? (
        <Text style={{ ...typography.small, color: colors.danger }}>{error}</Text>
      ) : hint ? (
        <Text style={typography.small}>{hint}</Text>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ Chip */

export function Chip({
  label,
  selected,
  onPress,
  icon,
  onRemove,
  tone,
  size = 'md',
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  onRemove?: () => void;
  tone?: { bg: string; fg: string };
  size?: 'sm' | 'md';
}) {
  const bg = tone ? tone.bg : selected ? colors.orange : colors.surface;
  const fg = tone ? tone.fg : selected ? colors.white : colors.textMuted;
  const border = tone ? 'transparent' : selected ? colors.orange : colors.border;
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: bg,
        borderColor: border,
        borderWidth: 1,
        borderRadius: radius.pill,
        paddingVertical: size === 'sm' ? 3 : 6,
        paddingHorizontal: size === 'sm' ? 9 : 12,
      }}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 10 : 12} color={fg} />}
      <Text style={{ color: fg, fontSize: size === 'sm' ? 11 : 13, fontWeight: '600' }}>{label}</Text>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={8}>
          <Icon name="close" size={size === 'sm' ? 10 : 12} color={fg} />
        </Pressable>
      )}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ Badge */

export function Badge({ label, tone }: { label: string; tone: { bg: string; fg: string } }) {
  return (
    <View
      style={{
        backgroundColor: tone.bg,
        borderRadius: radius.sm,
        paddingHorizontal: 7,
        paddingVertical: 3,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: tone.fg, fontSize: 11, fontWeight: '700', letterSpacing: 0.1 }}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ Avatar */

export function Avatar({ name, uri, size = 40 }: { name: string; uri?: string | null; size?: number }) {
  const fallback = (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: avatarColor(name),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.white, fontWeight: '700', fontSize: size * 0.38 }}>{initials(name)}</Text>
    </View>
  );

  if (uri) {
    return (
      <AppImage
        uri={uri}
        alt={name}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceAlt }}
        fallback={fallback}
      />
    );
  }
  return fallback;
}

/* ------------------------------------------------------------------ Misc */

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[{ height: 1, backgroundColor: colors.border }, style]} />;
}

export function Row({ children, gap = spacing.sm, style }: { children: React.ReactNode; gap?: number; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <View style={{ padding: spacing.xxl, alignItems: 'center', gap: spacing.md }}>
      <ActivityIndicator color={colors.orange} />
      {label && <Muted>{label}</Muted>}
    </View>
  );
}

export function EmptyState({
  icon = 'box',
  title,
  body,
  action,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.md }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.lg,
          backgroundColor: colors.orangeSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={22} color={colors.orange} />
      </View>
      <H3 style={{ textAlign: 'center' }}>{title}</H3>
      {body && <Muted style={{ textAlign: 'center', maxWidth: 420 }}>{body}</Muted>}
      {action}
    </View>
  );
}

export function SwitchRow({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}
    >
      <View style={{ flex: 1 }}>
        <Text style={typography.label}>{label}</Text>
        {hint && <Muted style={{ marginTop: 2 }}>{hint}</Muted>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.orange, false: colors.borderStrong }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.borderStrong}
        // react-native-web ignores trackColor/thumbColor and falls back to its
        // own blue-green unless these web-only props are set as well.
        {...(Platform.OS === 'web'
          ? ({
              activeThumbColor: colors.white,
              activeTrackColor: colors.orange,
              thumbColor: colors.white,
              trackColor: colors.borderStrong,
            } as any)
          : null)}
      />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ Select */

export interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder,
  icon,
  error,
}: {
  label?: string;
  value?: T | null;
  options: Option<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  icon?: IconName;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const active = options.find((o) => o.value === value);
  return (
    <View style={{ gap: 6 }}>
      {label && <Text style={typography.label}>{label}</Text>}
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.border,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          minHeight: 46,
        }}
      >
        {icon && <Icon name={icon} size={15} color={colors.textFaint} />}
        <Text style={{ flex: 1, fontSize: 15, color: active ? colors.text : colors.textFaint }}>
          {active?.label ?? placeholder ?? '—'}
        </Text>
        <Icon name="chevronDown" size={14} color={colors.textFaint} />
      </Pressable>
      {!!error && <Text style={{ fontSize: 12, color: colors.danger }}>{error}</Text>}

      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <View style={{ gap: 2 }}>
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.sm,
                  borderRadius: radius.md,
                  backgroundColor: selected ? colors.orangeSofter : 'transparent',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.bodyStrong, color: selected ? colors.orangeDarker : colors.text }}>
                    {option.label}
                  </Text>
                  {option.hint && <Muted style={{ marginTop: 2 }}>{option.hint}</Muted>}
                </View>
                {selected && <Icon name="check" size={14} color={colors.orange} />}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

/* ------------------------------------------------------------------ Sheet / Modal */

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  width = 520,
  scrollable = true,
  contentContainerStyle,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
  scrollable?: boolean;
  contentContainerStyle?: ViewStyle;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const { scheme } = useTheme();
  const insets = useSafeAreaInsets();
  // Phones get a bottom sheet (thumb-reachable); wider screens get a dialog.
  const asBottomSheet = screenWidth < 640;

  return (
    <Modal visible={open} transparent animationType={asBottomSheet ? 'slide' : 'fade'} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Pressable
          onPress={onClose}
          style={{
            flex: 1,
            backgroundColor: colors.overlay,
            alignItems: 'center',
            justifyContent: asBottomSheet ? 'flex-end' : 'center',
            padding: asBottomSheet ? 0 : spacing.lg,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              {
                width: '100%',
                maxWidth: asBottomSheet ? undefined : width,
                maxHeight: asBottomSheet ? '92%' : '88%',
                borderRadius: asBottomSheet ? 0 : radius.xl,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                overflow: 'hidden',
                flexShrink: 1,
              },
              shadow.raised,
            ]}
          >
            <BlurView
              intensity={80}
              tint={scheme === 'dark' ? 'dark' : 'light'}
              style={{
                width: '100%',
                maxHeight: '100%',
                backgroundColor: colors.elevated,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: asBottomSheet ? 0 : radius.xl,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                overflow: 'hidden',
                flexDirection: 'column',
                flexShrink: 1,
              }}
            >
              {asBottomSheet && (
                <View
                  style={{
                    alignSelf: 'center',
                    width: 38,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: colors.borderStrong,
                    marginTop: spacing.sm,
                    marginBottom: spacing.xs,
                  }}
                />
              )}
              {title && (
                <Row
                  style={{
                    justifyContent: 'space-between',
                    paddingHorizontal: spacing.xl,
                    paddingTop: asBottomSheet ? spacing.xs : spacing.lg,
                    paddingBottom: spacing.sm,
                  }}
                >
                  <H2>{title}</H2>
                  <IconButton name="close" onPress={onClose} />
                </Row>
              )}
              {scrollable ? (
                <ScrollView
                  style={{ flexShrink: 1 }}
                  contentContainerStyle={[
                    {
                      paddingHorizontal: spacing.xl,
                      paddingTop: title ? spacing.xs : spacing.md,
                      paddingBottom: footer
                        ? spacing.md
                        : asBottomSheet
                        ? Math.max(insets.bottom, spacing.xl)
                        : spacing.xl,
                      gap: spacing.md,
                    },
                    contentContainerStyle,
                  ]}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={true}
                >
                  {children}
                </ScrollView>
              ) : (
                <View
                  style={[
                    {
                      flexShrink: 1,
                      paddingHorizontal: spacing.xl,
                      paddingTop: title ? spacing.xs : spacing.md,
                      paddingBottom: footer
                        ? spacing.md
                        : asBottomSheet
                        ? Math.max(insets.bottom, spacing.xl)
                        : spacing.xl,
                      gap: spacing.md,
                    },
                    contentContainerStyle,
                  ]}
                >
                  {children}
                </View>
              )}
              {footer && (
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    paddingHorizontal: spacing.xl,
                    paddingTop: spacing.md,
                    paddingBottom: asBottomSheet ? Math.max(insets.bottom, spacing.md) : spacing.xl,
                    backgroundColor: colors.elevated,
                  }}
                >
                  {footer}
                </View>
              )}
            </BlurView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ------------------------------------------------------------------ Segmented */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; icon?: IconName }[];
  onChange: (value: T) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.md,
        padding: 3,
        gap: 3,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 8,
              borderRadius: radius.sm,
              backgroundColor: active ? colors.surface : 'transparent',
              borderWidth: 1,
              borderColor: active ? colors.border : 'transparent',
            }}
          >
            {option.icon && (
              <Icon name={option.icon} size={12} color={active ? colors.orange : colors.textFaint} />
            )}
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: active ? colors.text : colors.textMuted,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ MenuItem */

/** Unread counter shown on icons and rows. Caps at 99+ so it never grows wider. */
export function CountBadge({ count, size = 18 }: { count: number; size?: number }) {
  if (!count || count < 1) return null;
  return (
    <View
      style={{
        minWidth: size,
        height: size,
        paddingHorizontal: 5,
        borderRadius: radius.pill,
        backgroundColor: colors.orange,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.white, fontSize: size <= 16 ? 9 : 10, fontWeight: '800' }}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

export function MenuItem({
  icon,
  label,
  hint,
  onPress,
  trailing,
  tone,
  badge,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  tone?: 'default' | 'danger';
  badge?: number;
}) {
  const [hovered, setHovered] = useState(false);
  const fg = tone === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: 11,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        backgroundColor: hovered ? colors.surfaceAlt : 'transparent',
      }}
    >
      <Icon name={icon} size={14} color={tone === 'danger' ? colors.danger : colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={{ ...typography.bodyStrong, color: fg }}>{label}</Text>
        {hint ? <Muted style={{ marginTop: 1 }}>{hint}</Muted> : null}
      </View>
      {!!badge && <CountBadge count={badge} />}
      {trailing}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ Stat */

export function Stat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <Card style={{ flexGrow: 1, flexBasis: 160, gap: spacing.sm }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ ...typography.h1, fontSize: 24 }}>{value}</Text>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: radius.md,
            backgroundColor: colors.orangeSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={14} color={colors.orange} />
        </View>
      </Row>
      <Muted>{label}</Muted>
    </Card>
  );
}
