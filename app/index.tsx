import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../src/api';
import type { AdvertSearchParams, AdvertSort, AdvertSummary, AdvertType, PublicStats, Tag } from '../src/api/types';
import { ADVERT_TYPES } from '../src/api/types';
import { AdvertCard } from '../src/components/AdvertCard';
import { Icon } from '../src/components/Icon';
import { Page } from '../src/components/Page';
import {
  Body,
  Button,
  Card,
  Chip,
  EmptyState,
  H1,
  H2,
  Input,
  Muted,
  Row,
  Select,
  Sheet,
  Spinner,
  SwitchRow,
} from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';
import { useI18n } from '../src/i18n';
import { advertTypeColor, colors, spacing, typography } from '../src/theme/theme';
import { numberFmt, toCents } from '../src/utils/format';
import { useBreakpoint } from '../src/hooks/useBreakpoint';

const PAGE_SIZE = 12;

interface Filters {
  types: AdvertType[];
  tags: string[];
  minPrice: string;
  maxPrice: string;
  city: string;
  postedAfter: string;
  postedBefore: string;
  biddable: boolean;
}

const EMPTY_FILTERS: Filters = {
  types: [],
  tags: [],
  minPrice: '',
  maxPrice: '',
  city: '',
  postedAfter: '',
  postedBefore: '',
  biddable: false,
};

export default function MarketplaceScreen() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const { isWide } = useBreakpoint();

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState<AdvertSort>('newest');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [items, setItems] = useState<AdvertSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tags, setTags] = useState<Tag[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    api.tags(undefined, 40).then(setTags).catch(() => undefined);
    api.stats().then(setStats).catch(() => undefined);
  }, [locale]);

  const params = useMemo<AdvertSearchParams>(() => {
    const min = toCents(filters.minPrice);
    const max = toCents(filters.maxPrice);
    return {
      q: debounced || undefined,
      type: filters.types.length ? filters.types : undefined,
      tag: filters.tags.length ? filters.tags : undefined,
      minPrice: min,
      maxPrice: max,
      city: filters.city.trim() || undefined,
      postedAfter: filters.postedAfter || undefined,
      postedBefore: filters.postedBefore || undefined,
      biddable: filters.biddable || undefined,
      sort,
      size: PAGE_SIZE,
    };
  }, [debounced, filters, sort]);

  const load = useCallback(
    async (nextPage: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await api.adverts({ ...params, page: nextPage });
        setTotal(result.totalElements);
        setPage(result.page);
        setItems((prev) => (append ? [...prev, ...result.content] : result.content));
      } catch (err) {
        setError(err instanceof ApiError && err.isNetwork ? t('errors.network') : t('errors.generic'));
        if (!append) setItems([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [params, t],
  );

  useEffect(() => {
    void load(0, false);
  }, [load]);

  const activeFilterCount =
    filters.types.length +
    filters.tags.length +
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0) +
    (filters.city ? 1 : 0) +
    (filters.postedAfter ? 1 : 0) +
    (filters.postedBefore ? 1 : 0) +
    (filters.biddable ? 1 : 0);

  const openFilters = () => {
    setDraft(filters);
    setFiltersOpen(true);
  };

  const toggleType = (type: AdvertType) =>
    setDraft((d) => ({
      ...d,
      types: d.types.includes(type) ? d.types.filter((x) => x !== type) : [...d.types, type],
    }));

  const toggleTag = (slug: string) =>
    setDraft((d) => ({
      ...d,
      tags: d.tags.includes(slug) ? d.tags.filter((x) => x !== slug) : [...d.tags, slug],
    }));

  const sortOptions: { value: AdvertSort; label: string }[] = [
    { value: 'newest', label: t('marketplace.sortNewest') },
    { value: 'oldest', label: t('marketplace.sortOldest') },
    { value: 'views', label: t('marketplace.sortViews') },
    { value: 'popular', label: t('marketplace.sortPopular') },
    { value: 'price_asc', label: t('marketplace.sortPriceAsc') },
    { value: 'price_desc', label: t('marketplace.sortPriceDesc') },
    { value: 'deadline', label: t('marketplace.sortDeadline') },
  ];

  const hasMore = items.length < total;

  return (
    <Page refreshing={loading} onRefresh={() => void load(0, false)}>
      {!user && (
        <Card padded={false} flat style={{ backgroundColor: colors.surface }}>
          <View style={{ padding: isWide ? spacing.xxl : spacing.xl, gap: spacing.md }}>
            <Row gap={6}>
              <Icon name="bolt" size={11} color={colors.orange} />
              <Body style={{ ...typography.tiny, color: colors.orange, textTransform: 'uppercase' }}>
                {t('common.tagline')}
              </Body>
            </Row>
            <H1 style={{ fontSize: isWide ? 40 : 27, lineHeight: isWide ? 46 : 33, maxWidth: 660 }}>
              {t('marketplace.heroTitle')}
            </H1>
            <Body style={{ maxWidth: 600, color: colors.textMuted }}>{t('marketplace.heroSubtitle')}</Body>
            <Row gap={spacing.sm} style={{ flexWrap: 'wrap', marginTop: spacing.xs }}>
              <Button
                title={t('marketplace.heroCtaCreate')}
                icon="plus"
                size={isWide ? 'lg' : 'md'}
                onPress={() => router.push('/create')}
              />
              <Button
                title={t('common.createAccount')}
                icon="userPlus"
                variant="outline"
                size={isWide ? 'lg' : 'md'}
                onPress={() => router.push('/auth/register')}
              />
            </Row>
          </View>
          {stats && (
            <Row
              style={{
                paddingHorizontal: isWide ? spacing.xxl : spacing.xl,
                paddingVertical: spacing.lg,
                flexWrap: 'wrap',
                gap: spacing.xl,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                backgroundColor: colors.surfaceAlt,
              }}
            >
              {[
                { icon: 'layers' as const, value: stats.adverts, label: t('marketplace.statAdverts') },
                { icon: 'users' as const, value: stats.users, label: t('marketplace.statUsers') },
                { icon: 'cubes' as const, value: stats.models, label: t('marketplace.statModels') },
                { icon: 'eye' as const, value: stats.views, label: t('marketplace.statViews') },
              ].map((item) => (
                <Row key={item.label} gap={spacing.sm}>
                  <Icon name={item.icon} size={13} color={colors.orange} />
                  <Body style={{ fontWeight: '700', color: colors.ink }}>{numberFmt(item.value, locale)}</Body>
                  <Muted>{item.label}</Muted>
                </Row>
              ))}
            </Row>
          )}
        </Card>
      )}

      <View style={{ gap: spacing.md }}>
        <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
          <View style={{ flexGrow: 1, flexBasis: 150 }}>
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder={t('common.searchPlaceholder')}
              icon="search"
              returnKeyType="search"
            />
          </View>
          <Button
            title={activeFilterCount ? `${t('common.filters')} · ${activeFilterCount}` : t('common.filters')}
            icon="filter"
            variant={activeFilterCount ? 'secondary' : 'outline'}
            onPress={openFilters}
            style={{ height: 44 }}
          />
          {isWide && (
            <View style={{ minWidth: 190 }}>
              <Select
                value={sort}
                options={sortOptions}
                onChange={(value) => setSort(value)}
                icon="sort"
                placeholder={t('common.sort')}
              />
            </View>
          )}
        </Row>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
        >
          <Chip
            label={t('common.all')}
            selected={filters.types.length === 0}
            onPress={() => setFilters((f) => ({ ...f, types: [] }))}
          />
          {ADVERT_TYPES.map((type) => (
            <Chip
              key={type}
              label={t(`advertTypes.${type}`)}
              selected={filters.types.includes(type)}
              onPress={() =>
                setFilters((f) => ({
                  ...f,
                  types: f.types.includes(type) ? f.types.filter((x) => x !== type) : [...f.types, type],
                }))
              }
            />
          ))}
        </ScrollView>

        {filters.tags.length > 0 && (
          <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
            {filters.tags.map((slug) => (
              <Chip
                key={slug}
                label={tags.find((tag) => tag.slug === slug)?.label ?? slug}
                tone={{ bg: colors.orangeSoft, fg: colors.orangeDarker }}
                onRemove={() => setFilters((f) => ({ ...f, tags: f.tags.filter((x) => x !== slug) }))}
              />
            ))}
            <Pressable onPress={() => setFilters(EMPTY_FILTERS)}>
              <Muted style={{ textDecorationLine: 'underline' }}>{t('common.reset')}</Muted>
            </Pressable>
          </Row>
        )}

        <Row style={{ justifyContent: 'space-between' }}>
          <Muted>
            {numberFmt(total, locale)} {t('common.results')}
          </Muted>
          {error && <Muted style={{ color: colors.danger }}>{error}</Muted>}
        </Row>
      </View>

      {loading ? (
        <Spinner label={t('common.loading')} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon="search"
            title={t('common.noResults')}
            body={t('common.noResultsHint')}
            action={<Button title={t('common.reset')} variant="outline" onPress={() => setFilters(EMPTY_FILTERS)} />}
          />
        </Card>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
          {items.map((advert) => (
            <AdvertCard key={advert.id} advert={advert} onChanged={() => void load(0, false)} />
          ))}
        </View>
      )}

      {hasMore && !loading && (
        <Button
          title={t('common.showMore')}
          variant="outline"
          loading={loadingMore}
          full
          onPress={() => void load(page + 1, true)}
        />
      )}

      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title={t('common.filters')} width={560}>
        <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.sm }}>
          {!isWide && (
            <Select
              label={t('common.sort')}
              value={sort}
              options={sortOptions}
              onChange={(value) => setSort(value)}
              icon="sort"
            />
          )}
          <View style={{ gap: spacing.sm }}>
            <Muted>{t('marketplace.type')}</Muted>
            <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
              {ADVERT_TYPES.map((type) => (
                <Chip
                  key={type}
                  label={t(`advertTypes.${type}`)}
                  selected={draft.types.includes(type)}
                  onPress={() => toggleType(type)}
                  tone={
                    draft.types.includes(type)
                      ? { bg: advertTypeColor[type].fg, fg: colors.white }
                      : undefined
                  }
                />
              ))}
            </Row>
          </View>

          <View style={{ gap: spacing.sm }}>
            <Muted>{t('marketplace.tags')}</Muted>
            <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
              {tags.map((tag) => (
                <Chip
                  key={tag.id}
                  label={tag.label}
                  selected={draft.tags.includes(tag.slug)}
                  onPress={() => toggleTag(tag.slug)}
                />
              ))}
            </Row>
          </View>

          <Row gap={spacing.md} style={{ flexWrap: 'wrap' }}>
            <View style={{ flexGrow: 1, flexBasis: 120 }}>
              <Input
                label={t('marketplace.minPrice')}
                value={draft.minPrice}
                onChangeText={(v) => setDraft((d) => ({ ...d, minPrice: v }))}
                keyboardType="decimal-pad"
                icon="euro"
              />
            </View>
            <View style={{ flexGrow: 1, flexBasis: 120 }}>
              <Input
                label={t('marketplace.maxPrice')}
                value={draft.maxPrice}
                onChangeText={(v) => setDraft((d) => ({ ...d, maxPrice: v }))}
                keyboardType="decimal-pad"
                icon="euro"
              />
            </View>
            <View style={{ flexGrow: 1, flexBasis: 160 }}>
              <Input
                label={t('marketplace.city')}
                value={draft.city}
                onChangeText={(v) => setDraft((d) => ({ ...d, city: v }))}
                icon="location"
              />
            </View>
          </Row>

          <Row gap={spacing.md} style={{ flexWrap: 'wrap' }}>
            <View style={{ flexGrow: 1, flexBasis: 160 }}>
              <Input
                label={t('marketplace.postedAfter')}
                value={draft.postedAfter}
                onChangeText={(v) => setDraft((d) => ({ ...d, postedAfter: v }))}
                placeholder="2025-01-01"
                icon="calendar"
              />
            </View>
            <View style={{ flexGrow: 1, flexBasis: 160 }}>
              <Input
                label={t('marketplace.postedBefore')}
                value={draft.postedBefore}
                onChangeText={(v) => setDraft((d) => ({ ...d, postedBefore: v }))}
                placeholder="2025-12-31"
                icon="calendar"
              />
            </View>
          </Row>

          <SwitchRow
            label={t('marketplace.onlyBiddable')}
            value={draft.biddable}
            onValueChange={(v) => setDraft((d) => ({ ...d, biddable: v }))}
          />

          <Row style={{ justifyContent: 'space-between' }}>
            <Button
              title={t('common.reset')}
              variant="ghost"
              onPress={() => {
                setDraft(EMPTY_FILTERS);
                setFilters(EMPTY_FILTERS);
                setFiltersOpen(false);
              }}
            />
            <Button
              title={t('common.apply')}
              icon="check"
              onPress={() => {
                setFilters(draft);
                setFiltersOpen(false);
              }}
            />
          </Row>
        </ScrollView>
      </Sheet>
    </Page>
  );
}
