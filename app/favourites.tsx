import React, { useState } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useLists } from '../src/context/ListsContext';
import { useToast } from '../src/context/ToastContext';
import { useI18n } from '../src/i18n';
import { useBreakpoint } from '../src/hooks/useBreakpoint';
import { Page } from '../src/components/Page';
import { Icon } from '../src/components/Icon';
import { Button, Card, H1, H2, H3, Input, Muted, Pagination, Row, Badge } from '../src/components/ui';
import { spacing, colors, radius, typography } from '../src/theme/theme';
import { api, ApiError } from '../src/api';
import type { AdvertSummary } from '../src/api/types';
import { AdvertCard } from '../src/components/AdvertCard';

export default function FavouritesScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();
  const { lists, createList, deleteList } = useLists();
  const toast = useToast();
  
  const { isWide } = useBreakpoint();
  
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [adverts, setAdverts] = useState<AdvertSummary[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [newListTitle, setNewListTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const PAGE_SIZE = 12;
  const totalPages = Math.ceil(adverts.length / PAGE_SIZE);
  const pagedAdverts = adverts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  React.useEffect(() => {
    setPage(0);
  }, [selectedListId]);

  // When a list is selected, we want to fetch the adverts
  React.useEffect(() => {
    if (!selectedListId) {
      setAdverts([]);
      return;
    }
    const loadListAdverts = async () => {
      setLoading(true);
      try {
        const list = lists.find(l => l.id === selectedListId);
        if (list && list.advertIds.length > 0) {
          // This API might not support filtering by multiple IDs directly in one call 
          // but we can just use the search API or fetch them one by one if it's a small list.
          // Wait, there is no /api/adverts?ids= endpoint natively, but let's see.
          // For now, let's just show the count or we can fetch them via a Promise.all
          // Actually, let's just make a simple Promise.all since it's just a demo / small scale
          const details = await Promise.all(list.advertIds.map(id => api.advert(id).catch(() => null)));
          // AdvertSummary is returned from search, AdvertDetail from advert(id)
          // We can map AdvertDetail to AdvertSummary roughly
          const mapped = details.filter(Boolean).map((d: any) => ({
            id: d.id,
            type: d.type,
            category: d.category,
            title: d.title,
            excerpt: d.description.substring(0, 100),
            status: d.status,
            priceCents: d.priceCents,
            currency: d.currency,
            allowBidding: d.allowBidding,
            highestBidCents: d.highestBidCents,
            budgetMinCents: d.budgetMinCents,
            budgetMaxCents: d.budgetMaxCents,
            city: d.city,
            deadline: d.deadline,
            viewCount: d.viewCount,
            reactionCount: d.reactions?.length || 0,
            bidCount: d.bids?.length || 0,
            coverImageUrl: d.imageUrls?.[0],
            tags: d.tags,
            author: d.author,
            createdAt: d.createdAt,
          }));
          setAdverts(mapped as any);
        } else {
          setAdverts([]);
        }
      } catch {
        setAdverts([]);
      } finally {
        setLoading(false);
      }
    };
    void loadListAdverts();
  }, [selectedListId, lists]);
  
  // Set default list initially
  React.useEffect(() => {
    if (lists.length > 0 && !selectedListId) {
      setSelectedListId(lists.find(l => l.isDefault)?.id || lists[0].id);
    }
  }, [lists, selectedListId]);

  if (!user) {
    return (
      <Page>
        <Muted>{t('common.signInRequired')}</Muted>
      </Page>
    );
  }

  return (
    <Page maxWidth={1200}>
      <View style={{ flexDirection: isWide ? 'row' : 'column', gap: spacing.xl, alignItems: 'flex-start' }}>
        <Card style={{ flex: isWide ? 1 : undefined, width: isWide ? undefined : '100%', minWidth: 250, maxWidth: isWide ? 300 : undefined, gap: spacing.md }}>
          <H2>{t('nav.favourites')}</H2>
          <View style={{ gap: spacing.xs }}>
            {lists.map(list => (
              <Pressable
                key={list.id}
                onPress={() => setSelectedListId(list.id)}
                style={{
                  padding: spacing.md,
                  backgroundColor: selectedListId === list.id ? colors.surfaceAlt : 'transparent',
                  borderRadius: radius.md,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <View style={{ flex: 1 }}>
                  <H3>{list.name}</H3>
                  <Muted>{list.advertIds.length} {t('common.results')}</Muted>
                </View>
                {!list.isDefault && (
                  <Pressable
                    onPress={async (e) => {
                      e.stopPropagation();
                      if (confirm(t('common.confirm'))) {
                        await deleteList(list.id);
                        if (selectedListId === list.id) setSelectedListId(null);
                      }
                    }}
                  >
                    <Icon name="trash" size={14} color={colors.danger} />
                  </Pressable>
                )}
              </Pressable>
            ))}
          </View>
          
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }} />
          
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Input
                value={newListTitle}
                onChangeText={setNewListTitle}
                placeholder={t('lists.newListName')}
              />
            </View>
            <Button
              title="+"
              disabled={!newListTitle.trim()}
              onPress={async () => {
                try {
                  setBusy(true);
                  await createList(newListTitle.trim());
                  setNewListTitle('');
                } finally {
                  setBusy(false);
                }
              }}
              loading={busy}
            />
          </Row>
        </Card>
        
        <View style={{ flex: isWide ? 3 : undefined, width: isWide ? undefined : '100%' }}>
          {selectedListId ? (
            loading ? (
              <Muted>{t('common.loading')}</Muted>
            ) : adverts.length === 0 ? (
              <Muted>{t('common.noResults')}</Muted>
            ) : (
              <>
                <Row gap={spacing.lg} style={{ flexWrap: 'wrap' }}>
                  {pagedAdverts.map((adv) => (
                    <AdvertCard key={adv.id} advert={adv} />
                  ))}
                </Row>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  totalElements={adverts.length}
                  onChange={(newPage) => setPage(newPage)}
                  loading={loading}
                />
              </>
            )
          ) : (
            <Muted>{t('common.loading')}</Muted>
          )}
        </View>
      </View>
    </Page>
  );
}
