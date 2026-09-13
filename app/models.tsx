import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../src/api';
import { absoluteUrl } from '../src/api/client';
import { LICENSES, VISIBILITIES } from '../src/api/types';
import type { ModelLicense, ModelSummary, ModelVisibility, UploadResponse } from '../src/api/types';
import { Icon } from '../src/components/Icon';
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
  Row,
  Select,
  Sheet,
  Spinner,
} from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';
import { useToast } from '../src/context/ToastContext';
import { useI18n } from '../src/i18n';
import { colors, radius, shadow, spacing } from '../src/theme/theme';
import { fileSize, money, toCents } from '../src/utils/format';
import { pickAndUploadFiles, pickAndUploadImage } from '../src/utils/upload';

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
      <View style={{ aspectRatio: 16 / 10, backgroundColor: colors.surfaceAlt }}>
        {model.thumbnailUrl ? (
          <Image source={{ uri: absoluteUrl(model.thumbnailUrl) }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="cubes" size={32} color={colors.borderStrong} />
          </View>
        )}
      </View>
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
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
  const { user } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState<TabKey>('browse');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState<ModelSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [license, setLicense] = useState<ModelLicense>('CC_BY_NC');
  const [visibility, setVisibility] = useState<ModelVisibility>('PUBLIC');
  const [files, setFiles] = useState<UploadResponse[]>([]);
  const [thumbnail, setThumbnail] = useState<UploadResponse | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(handle);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'mine') setItems(await api.myModels());
      else if (tab === 'library') setItems(await api.myLibrary());
      else setItems((await api.models(debounced || undefined, 0, 30)).content);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab, debounced]);

  useEffect(() => {
    void load();
  }, [load]);

  const addFiles = async () => {
    setBusy(true);
    try {
      const uploads = await pickAndUploadFiles('models');
      setFiles((prev) => [...prev, ...uploads]);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const addThumbnail = async () => {
    setBusy(true);
    try {
      const upload = await pickAndUploadImage('models');
      if (upload) setThumbnail(upload);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (title.trim().length < 3 || files.length === 0) return;
    setBusy(true);
    try {
      await api.createModel({
        title: title.trim(),
        description: description.trim() || undefined,
        license,
        visibility,
        priceCents: toCents(price) ?? 0,
        thumbnailKey: thumbnail?.objectKey,
        files: files.map((file) => ({
          objectKey: file.objectKey,
          fileName: file.fileName,
          sizeBytes: file.sizeBytes,
        })),
      });
      toast.success(t('create.published'));
      setUploadOpen(false);
      setTitle('');
      setDescription('');
      setPrice('0');
      setFiles([]);
      setThumbnail(null);
      setTab('mine');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const tabs: { key: TabKey; label: string; auth?: boolean }[] = [
    { key: 'browse', label: t('models.title') },
    { key: 'mine', label: t('models.mine'), auth: true },
    { key: 'library', label: t('models.library'), auth: true },
  ];

  return (
    <Page refreshing={loading} onRefresh={() => void load()}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md }}>
        <View style={{ gap: 4 }}>
          <H1>{t('models.title')}</H1>
          <Muted>{t('models.subtitle')}</Muted>
        </View>
        {user && <Button title={t('models.upload')} icon="upload" onPress={() => setUploadOpen(true)} />}
      </Row>

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
        <Input value={query} onChangeText={setQuery} placeholder={t('common.searchPlaceholder')} icon="search" />
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

      <Sheet open={uploadOpen} onClose={() => setUploadOpen(false)} title={t('models.upload')} width={560}>
        <View style={{ gap: spacing.md }}>
          <Input label={t('create.advertTitle')} value={title} onChangeText={setTitle} icon="cube" />
          <Input label={t('advert.description')} value={description} onChangeText={setDescription} multiline />
          <Row gap={spacing.md} style={{ flexWrap: 'wrap' }}>
            <View style={{ flexGrow: 1, flexBasis: 150 }}>
              <Input label={t('models.price')} value={price} onChangeText={setPrice} keyboardType="decimal-pad" icon="euro" />
            </View>
            <View style={{ flexGrow: 1, flexBasis: 180 }}>
              <Select
                label={t('models.license')}
                value={license}
                options={LICENSES.map((value) => ({ value, label: value.replace(/_/g, ' ') }))}
                onChange={setLicense}
              />
            </View>
            <View style={{ flexGrow: 1, flexBasis: 180 }}>
              <Select
                label={t('models.visibility')}
                value={visibility}
                options={VISIBILITIES.map((value) => ({ value, label: t(`models.${value}`) }))}
                onChange={setVisibility}
              />
            </View>
          </Row>

          <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
            <Button title={t('models.uploadFiles')} icon="upload" variant="outline" loading={busy} onPress={addFiles} />
            <Button title={t('create.addImage')} icon="image" variant="outline" loading={busy} onPress={addThumbnail} />
          </Row>

          {thumbnail && (
            <Image
              source={{ uri: absoluteUrl(thumbnail.url) }}
              style={{ width: 120, height: 90, borderRadius: radius.sm }}
            />
          )}

          {files.map((file, index) => (
            <Row key={file.objectKey} style={{ justifyContent: 'space-between' }}>
              <Row gap={spacing.sm} style={{ flex: 1 }}>
                <Icon name="cube" size={13} color={colors.orange} />
                <Muted numberOfLines={1} style={{ flex: 1 }}>
                  {file.fileName}
                </Muted>
              </Row>
              <Muted>{fileSize(file.sizeBytes)}</Muted>
              <Pressable onPress={() => setFiles((prev) => prev.filter((_, i) => i !== index))} style={{ padding: 6 }}>
                <Icon name="close" size={11} color={colors.danger} />
              </Pressable>
            </Row>
          ))}

          <Row style={{ justifyContent: 'flex-end' }}>
            <Button title={t('common.cancel')} variant="ghost" onPress={() => setUploadOpen(false)} />
            <Button
              title={t('models.upload')}
              icon="upload"
              loading={busy}
              disabled={files.length === 0 || title.trim().length < 3}
              onPress={submit}
            />
          </Row>
        </View>
      </Sheet>
    </Page>
  );
}
