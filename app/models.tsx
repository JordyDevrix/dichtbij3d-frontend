import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../src/api';
import { absoluteUrl } from '../src/api/client';
import { CATEGORIES } from '../src/api/types';
import type { Category, ModelSummary } from '../src/api/types';
import { Icon } from '../src/components/Icon';
import { ModelUploadSheet } from '../src/components/ModelUploadSheet';
import { Page } from '../src/components/Page';
import {
  Avatar,
  Badge,
  Body,
  Button,
  Card,
  EmptyState,
  H1,
  H3,
  Input,
  Muted,
  Chip,
  Row,
  Spinner,
} from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';
import { useToast } from '../src/context/ToastContext';
import { useBreakpoint } from '../src/hooks/useBreakpoint';
import { useI18n } from '../src/i18n';
import { colors, radius, shadow, spacing } from '../src/theme/theme';
import { money } from '../src/utils/format';

type TabKey = 'browse' | 'mine' | 'library';

function ModelCard({ model, onPress }: { model: ModelSummary; onPress: () => void }) {
  const { t, locale } = useI18n();
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        {
          flexGrow: 1,
          flexBasis: 260,
          maxWidth: 380,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: hovered ? colors.borderStrong : colors.border,
          overflow: 'hidden',
        },
        shadow.card,
      ]}
    >
      <View style={{ aspectRatio: 16 / 10, backgroundColor: colors.surfaceAlt, overflow: 'hidden', position: 'relative' }}>
        {model.thumbnailUrl ? (
          <Image
            source={{ uri: absoluteUrl(model.thumbnailUrl) }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="cubes" size={32} color={colors.borderStrong} />
          </View>
        )}
      </View>
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Row gap={spacing.sm}>
          <Badge label={t(`categories.${model.category}`)} tone={{ bg: colors.surfaceAlt, fg: colors.textMuted }} />
        </Row>
        <H3 numberOfLines={1}>{model.title}</H3>
        <Muted numberOfLines={2}>{model.description ?? ''}</Muted>
        <Row style={{ justifyContent: 'space-between' }}>
          <Body style={{ fontSize: 16, fontWeight: '700', color: colors.ink, letterSpacing: -0.3 }}>
            {model.priceCents > 0 ? money(model.priceCents, locale, model.currency) : t('common.free')}
          </Body>
          <Row gap={spacing.md}>
            <Row gap={4}>
              <Icon name="download" size={11} color={colors.textFaint} />
              <Muted>{model.downloadCount}</Muted>
            </Row>
            <Row gap={4}>
              <Icon name="layers" size={11} color={colors.textFaint} />
              <Muted>{model.fileCount}</Muted>
            </Row>
          </Row>
        </Row>
        <Row gap={spacing.sm}>
          <Avatar name={model.owner.displayName} uri={absoluteUrl(model.owner.avatarUrl)} size={22} />
          <Muted numberOfLines={1} style={{ flex: 1 }}>
            {model.owner.displayName}
          </Muted>
          {model.hasAccess && <Badge label={t('models.owned')} tone={{ bg: colors.successSoft, fg: colors.success }} />}
        </Row>
      </View>
    </Pressable>
  );
}

export default function ModelsScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { isWide } = useBreakpoint();
  const { user } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState<TabKey>('browse');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState<ModelSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(handle);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'mine') setItems(await api.myModels());
      else if (tab === 'library') setItems(await api.myLibrary());
      else setItems((await api.models(debounced || undefined, categories, 0, 30)).content);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab, debounced, categories]);

  useEffect(() => {
    void load();
  }, [load]);

  const tabs: { key: TabKey; label: string; auth?: boolean }[] = [
    { key: 'browse', label: t('models.title') },
    { key: 'mine', label: t('models.mine'), auth: true },
    { key: 'library', label: t('models.library'), auth: true },
  ];

  return (
    <Page refreshing={loading} onRefresh={() => void load()}>
      <View style={{ flexDirection: isWide ? 'row' : 'column', justifyContent: 'space-between', gap: spacing.md, alignItems: isWide ? 'flex-end' : 'stretch' }}>
        <View style={{ gap: 4 }}>
          <H1>{t('models.title')}</H1>
          <Muted>{t('models.subtitle')}</Muted>
        </View>
        {user && <Button title={t('models.upload')} icon="upload" onPress={() => setUploadOpen(true)} />}
      </View>

      {tabs.filter((entry) => !entry.auth || user).length > 1 && (
        <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
          {tabs
            .filter((entry) => !entry.auth || user)
            .map((entry) => (
              <Pressable
                key={entry.key}
                onPress={() => setTab(entry.key)}
                style={{
                  paddingVertical: 7,
                  paddingHorizontal: 14,
                  borderRadius: radius.pill,
                  backgroundColor: tab === entry.key ? colors.orange : colors.surface,
                  borderWidth: 1,
                  borderColor: tab === entry.key ? colors.orange : colors.border,
                }}
              >
                <Body style={{ fontSize: 14, color: tab === entry.key ? colors.white : colors.textMuted, fontWeight: '600' }}>
                  {entry.label}
                </Body>
              </Pressable>
            ))}
        </Row>
      )}

      {tab === 'browse' && (
        <View style={{ gap: spacing.sm }}>
          <Input value={query} onChangeText={setQuery} placeholder={t('common.searchPlaceholder')} icon="search" />
          <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
            <Chip
              label={t('models.allCategories')}
              selected={categories.length === 0}
              onPress={() => setCategories([])}
            />
            {CATEGORIES.map((value) => (
              <Chip
                key={value}
                label={t(`categories.${value}`)}
                selected={categories.includes(value)}
                onPress={() =>
                  setCategories((prev) =>
                    prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value],
                  )
                }
              />
            ))}
          </Row>
        </View>
      )}

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon="cubes"
            title={tab === 'mine' ? t('models.emptyMine') : tab === 'library' ? t('models.emptyLibrary') : t('common.noResults')}
            body={tab === 'browse' ? t('common.noResultsHint') : undefined}
            action={user && tab !== 'browse' ? <Button title={t('models.upload')} icon="upload" onPress={() => setUploadOpen(true)} /> : undefined}
          />
        </Card>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
          {items.map((model) => (
            <ModelCard key={model.id} model={model} onPress={() => router.push(`/model/${model.id}`)} />
          ))}
        </View>
      )}

      <ModelUploadSheet
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        allowMarketplaceToggle
        onCreated={() => {
          setTab('mine');
          void load();
        }}
      />

    </Page>
  );
}
