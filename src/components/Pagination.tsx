import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useI18n } from '../i18n';
import { colors, radius, spacing, typography } from '../theme/theme';
import { Button } from './ui';

export interface PaginationProps {
  /** 0-indexed current page */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of elements across all pages */
  totalElements?: number;
  /** Callback when user changes page (0-indexed) */
  onChange: (page: number) => void;
  /** Whether data is currently loading */
  loading?: boolean;
  /** Optional container style */
  style?: ViewStyle;
}

function getPageNumbers(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [];
  if (currentPage <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push('...');
    pages.push(totalPages);
  } else if (currentPage >= totalPages - 3) {
    pages.push(1);
    pages.push('...');
    for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    pages.push('...');
    pages.push(currentPage - 1);
    pages.push(currentPage);
    pages.push(currentPage + 1);
    pages.push('...');
    pages.push(totalPages);
  }
  return pages;
}

interface PageButtonProps {
  pageNum: number;
  isActive: boolean;
  disabled?: boolean;
  onPress: () => void;
  label: string;
}

function PageButton({ pageNum, isActive, disabled, onPress, label }: PageButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
      disabled={disabled || isActive}
      onPress={onPress}
      // @ts-ignore web hover
      onMouseEnter={() => setHovered(true)}
      // @ts-ignore web hover
      onMouseLeave={() => setHovered(false)}
      style={[
        styles.pageButton,
        isActive
          ? {
              backgroundColor: colors.orange,
              borderColor: colors.orange,
            }
          : {
              backgroundColor: hovered ? colors.surfaceAlt : colors.surface,
              borderColor: colors.border,
            },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text
        style={[
          styles.pageButtonText,
          {
            color: isActive ? colors.white : colors.text,
            fontWeight: isActive ? '700' : '500',
          },
        ]}
      >
        {pageNum}
      </Text>
    </Pressable>
  );
}

export function Pagination({
  page,
  totalPages,
  totalElements,
  onChange,
  loading = false,
  style,
}: PaginationProps) {
  const { t } = useI18n();
  const { width, isPhone } = useBreakpoint();

  if (totalPages <= 1) {
    return null;
  }

  const hasPrev = page > 0;
  const hasNext = page < totalPages - 1;
  const currentDisplayPage = page + 1;
  const isNarrow = width < 380;

  if (isPhone) {
    return (
      <View style={[styles.containerMobile, style]}>
        <Button
          title={isNarrow ? '' : t('common.previous')}
          icon="chevronLeft"
          variant="outline"
          size="sm"
          disabled={!hasPrev || loading}
          onPress={() => onChange(page - 1)}
        />
        <Text style={[styles.indicatorText, { color: colors.textMuted }]}>
          {t('common.pageOf', { current: currentDisplayPage, total: totalPages })}
        </Text>
        <Button
          title={isNarrow ? '' : t('common.next')}
          iconRight="chevronRight"
          variant="outline"
          size="sm"
          disabled={!hasNext || loading}
          onPress={() => onChange(page + 1)}
        />
      </View>
    );
  }

  const pageNumbers = getPageNumbers(currentDisplayPage, totalPages);

  return (
    <View style={[styles.containerDesktop, style]}>
      <Button
        title={t('common.previous')}
        icon="chevronLeft"
        variant="outline"
        size="sm"
        disabled={!hasPrev || loading}
        onPress={() => onChange(page - 1)}
      />

      <View style={styles.numberRow}>
        {pageNumbers.map((item, idx) => {
          if (item === '...') {
            return (
              <View key={`ellipsis-${idx}`} style={styles.ellipsis}>
                <Text style={[styles.ellipsisText, { color: colors.textMuted }]}>…</Text>
              </View>
            );
          }

          const isActive = item === currentDisplayPage;
          return (
            <PageButton
              key={item}
              pageNum={item}
              isActive={isActive}
              disabled={loading}
              label={`${t('common.page')} ${item}`}
              onPress={() => onChange(item - 1)}
            />
          );
        })}
      </View>

      <Button
        title={t('common.next')}
        iconRight="chevronRight"
        variant="outline"
        size="sm"
        disabled={!hasNext || loading}
        onPress={() => onChange(page + 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  containerDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  containerMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    width: '100%',
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageButton: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'all 0.15s ease',
        } as any)
      : null),
  },
  pageButtonText: {
    fontSize: 13,
    textAlign: 'center',
    ...typography.tabular,
  },
  ellipsis: {
    width: 28,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ellipsisText: {
    fontSize: 14,
    fontWeight: '600',
  },
  indicatorText: {
    fontSize: 13,
    fontWeight: '600',
    ...typography.tabular,
  },
});

export default Pagination;
