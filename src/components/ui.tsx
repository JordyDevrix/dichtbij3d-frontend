import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, shadow, spacing, typography } from '../theme/theme';
import { Icon, IconName } from './Icon';
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
    secondary: { bg: colors.orangeSoft, fg: colors.orangeDarker, border: colors.orangeSoft, hover: colors.orangeBorder },
    outline: { bg: 'transparent', fg: colors.text, border: colors.borderStrong, hover: colors.surfaceAlt },
    ghost: { bg: 'transparent', fg: colors.textMuted, border: 'transparent', hover: colors.surfaceAlt },
    danger: { bg: colors.danger, fg: colors.white, border: colors.danger, hover: '#A5322A' },
  };
  const sizing: Record<ButtonSize, { py: number; px: number; font: number; icon: number }> = {
    sm: { py: 7, px: 12, font: 13, icon: 13 },
    md: { py: 11, px: 18, font: 15, icon: 15 },
    lg: { py: 15, px: 24, font: 16, icon: 17 },
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
      style={[
        {
          backgroundColor: hovered && !inactive ? p.hover : p.bg,
          borderColor: p.border,
          borderWidth: 1,
          borderRadius: radius.pill,
          paddingVertical: s.py,
          paddingHorizontal: s.px,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          opacity: inactive ? 0.55 : 1,
          alignSelf: full ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={p.fg} />
      ) : (
        icon && <Icon name={icon} size={s.icon} color={p.fg} />
      )}
      <Text style={{ color: p.fg, fontSize: s.font, fontWeight: '700' }}>{title}</Text>
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
          borderRadius: radius.pill,
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
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
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
        },
        shadow.card,
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
          minHeight: rest.multiline ? 110 : 46,
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
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: tone.fg, fontSize: 11, fontWeight: '700', letterSpacing: 0.2 }}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ Avatar */

export function Avatar({ name, uri, size = 40 }: { name: string; uri?: string | null; size?: number }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceAlt }}
      />
    );
  }
  return (
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
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.orangeSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={26} color={colors.orange} />
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
}: {
  label?: string;
  value?: T | null;
  options: Option<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  icon?: IconName;
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
          borderColor: colors.border,
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

      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <ScrollView style={{ maxHeight: 420 }}>
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
        </ScrollView>
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
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.lg,
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            {
              width: '100%',
              maxWidth: width,
              backgroundColor: colors.surface,
              borderRadius: radius.xl,
              padding: spacing.xl,
              gap: spacing.md,
            },
            shadow.raised,
          ]}
        >
          {title && (
            <Row style={{ justifyContent: 'space-between' }}>
              <H2>{title}</H2>
              <IconButton name="close" onPress={onClose} />
            </Row>
          )}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ------------------------------------------------------------------ Stat */

export function Stat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <Card style={{ flexGrow: 1, flexBasis: 160, gap: spacing.sm }}>
      <Row>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: radius.md,
            backgroundColor: colors.orangeSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={15} color={colors.orange} />
        </View>
        <Text style={typography.h2}>{value}</Text>
      </Row>
      <Muted>{label}</Muted>
    </Card>
  );
}

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
});
