import React, { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../src/api';
import { absoluteUrl } from '../src/api/client';
import { ADVERT_TYPES } from '../src/api/types';
import type { AdvertType, ModelSummary, Tag } from '../src/api/types';
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
  H3,
  Input,
  Muted,
  Row,
  Select,
  SwitchRow,
} from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';
import { useToast } from '../src/context/ToastContext';
import { useI18n } from '../src/i18n';
import { advertTypeColor, colors, radius, spacing } from '../src/theme/theme';
import { toCents } from '../src/utils/format';
import { pickAndUploadImage } from '../src/utils/upload';

const TYPE_ICONS: Record<AdvertType, 'print' | 'cube' | 'coins' | 'box'> = {
  PRINT_REQUEST: 'print',
  MODEL_REQUEST: 'cube',
  MODEL_FOR_SALE: 'coins',
  PRINT_FOR_SALE: 'box',
};

export default function CreateAdvertScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { user, booting } = useAuth();
  const toast = useToast();

  const [type, setType] = useState<AdvertType>('PRINT_REQUEST');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [allowBidding, setAllowBidding] = useState(false);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [hiddenAfterAccept, setHiddenAfterAccept] = useState(false);
  const [city, setCity] = useState('');
  const [deadline, setDeadline] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [images, setImages] = useState<{ key: string; url: string }[]>([]);
  const [modelId, setModelId] = useState<string | null>(null);

  const [tags, setTags] = useState<Tag[]>([]);
  const [myModels, setMyModels] = useState<ModelSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRequest = type === 'PRINT_REQUEST' || type === 'MODEL_REQUEST';

  useEffect(() => {
    api.tags(undefined, 40).then(setTags).catch(() => undefined);
  }, [locale]);

  useEffect(() => {
    if (!user) return;
    api.myModels().then(setMyModels).catch(() => undefined);
    setCity((prev) => prev || user.city || '');
  }, [user]);

  if (booting) return null;

  if (!user) {
    return (
      <Page maxWidth={600}>
        <Card>
          <EmptyState
            icon="userPlus"
            title={t('common.signInRequired')}
            body={t('common.signInRequiredBody')}
            action={
              <Row gap={spacing.sm}>
                <Button
                  title={t('common.createAccount')}
                  onPress={() => router.push({ pathname: '/auth/register', params: { redirect: '/create' } })}
                />
                <Button
                  title={t('common.orSignIn')}
                  variant="outline"
                  onPress={() => router.push({ pathname: '/auth/login', params: { redirect: '/create' } })}
                />
              </Row>
            }
          />
        </Card>
      </Page>
    );
  }

  const toggleTag = (slug: string) =>
    setSelectedTags((prev) => (prev.includes(slug) ? prev.filter((x) => x !== slug) : [...prev, slug]));

  const addCustomTag = () => {
    const value = customTag.trim();
    if (!value) return;
    if (selectedTags.length >= 12) return;
    if (!selectedTags.includes(value)) setSelectedTags((prev) => [...prev, value]);
    setCustomTag('');
  };

  const addImage = async () => {
    setUploading(true);
    try {
      const upload = await pickAndUploadImage('adverts');
      if (upload) setImages((prev) => [...prev, { key: upload.objectKey, url: upload.url }]);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setError(null);
    if (title.trim().length < 4 || description.trim().length < 10) {
      setError(t('common.required'));
      return;
    }
    setBusy(true);
    try {
      const advert = await api.createAdvert({
        type,
        title: title.trim(),
        description: description.trim(),
        priceCents: isRequest ? undefined : toCents(price),
        allowBidding,
        budgetMinCents: isRequest ? toCents(budgetMin) : undefined,
        budgetMaxCents: isRequest ? toCents(budgetMax) : undefined,
        hiddenAfterAccept,
        city: city.trim() || undefined,
        deadline: deadline.trim() || undefined,
        modelId: modelId ?? undefined,
        tags: selectedTags,
        imageKeys: images.map((image) => image.key),
      });
      toast.success(t('create.published'));
      router.replace(`/advert/${advert.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page maxWidth={820}>
      <View style={{ gap: 4 }}>
        <H1>{t('create.title')}</H1>
        <Muted>{t('create.subtitle')}</Muted>
      </View>

      {/* --------------------------------------------------- type */}
      <Card style={{ gap: spacing.md }}>
        <H3>{t('create.step1')}</H3>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {ADVERT_TYPES.map((value) => {
            const selected = value === type;
            const tone = advertTypeColor[value];
            return (
              <Pressable
                key={value}
                onPress={() => setType(value)}
                style={{
                  flexGrow: 1,
                  flexBasis: 220,
                  padding: spacing.md,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: selected ? colors.orange : colors.border,
                  backgroundColor: selected ? colors.orangeSofter : colors.surface,
                  gap: 6,
                }}
              >
                <Row>
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: tone.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name={TYPE_ICONS[value]} size={13} color={tone.fg} />
                  </View>
                  <Body style={{ fontWeight: '700', flex: 1 }}>{t(`advertTypes.${value}`)}</Body>
                  {selected && <Icon name="checkCircle" size={15} color={colors.orange} />}
                </Row>
                <Muted>{t(`advertTypes.${value}_DESC`)}</Muted>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* --------------------------------------------------- details */}
      <Card style={{ gap: spacing.md }}>
        <H3>{t('create.step2')}</H3>
        <Input
          label={t('create.advertTitle')}
          value={title}
          onChangeText={setTitle}
          placeholder={t('create.advertTitlePlaceholder')}
          maxLength={140}
        />
        <Input
          label={t('advert.description')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('create.descriptionPlaceholder')}
          multiline
        />
        <Row gap={spacing.md} style={{ flexWrap: 'wrap' }}>
          <View style={{ flexGrow: 1, flexBasis: 200 }}>
            <Input label={t('profile.city')} value={city} onChangeText={setCity} icon="location" />
          </View>
          <View style={{ flexGrow: 1, flexBasis: 200 }}>
            <Input
              label={t('create.deadline')}
              value={deadline}
              onChangeText={setDeadline}
              placeholder="2025-12-31"
              icon="calendar"
            />
          </View>
        </Row>

        <View style={{ gap: spacing.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Body style={{ fontWeight: '600' }}>{t('create.images')}</Body>
            <Button
              title={t('create.addImage')}
              icon="camera"
              size="sm"
              variant="outline"
              loading={uploading}
              onPress={addImage}
            />
          </Row>
          {images.length > 0 && (
            <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
              {images.map((image, index) => (
                <View key={image.key}>
                  <Image
                    source={{ uri: absoluteUrl(image.url) }}
                    style={{ width: 96, height: 72, borderRadius: radius.sm }}
                  />
                  <Pressable
                    onPress={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      backgroundColor: colors.danger,
                      borderRadius: 10,
                      width: 20,
                      height: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="close" size={10} color={colors.white} />
                  </Pressable>
                </View>
              ))}
            </Row>
          )}
        </View>

        {myModels.length > 0 && (
          <Select
            label={t('create.linkModel')}
            value={modelId ?? undefined}
            options={[
              { value: '', label: '—' },
              ...myModels.map((model) => ({ value: model.id, label: model.title })),
            ]}
            onChange={(value) => setModelId(value || null)}
            icon="cube"
          />
        )}
      </Card>

      {/* --------------------------------------------------- price & tags */}
      <Card style={{ gap: spacing.md }}>
        <H3>{t('create.step3')}</H3>

        {isRequest ? (
          <Row gap={spacing.md} style={{ flexWrap: 'wrap' }}>
            <View style={{ flexGrow: 1, flexBasis: 180 }}>
              <Input
                label={t('create.budgetMin')}
                value={budgetMin}
                onChangeText={setBudgetMin}
                keyboardType="decimal-pad"
                icon="euro"
              />
            </View>
            <View style={{ flexGrow: 1, flexBasis: 180 }}>
              <Input
                label={t('create.budgetMax')}
                value={budgetMax}
                onChangeText={setBudgetMax}
                keyboardType="decimal-pad"
                icon="euro"
              />
            </View>
          </Row>
        ) : (
          <Input
            label={t('create.fixedPrice')}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            icon="euro"
          />
        )}

        <SwitchRow
          label={t('create.allowBidding')}
          hint={t('create.allowBiddingHint')}
          value={allowBidding}
          onValueChange={setAllowBidding}
        />

        {isRequest && (
          <SwitchRow
            label={t('create.hiddenAfterAccept')}
            hint={t('create.hiddenAfterAcceptHint')}
            value={hiddenAfterAccept}
            onValueChange={setHiddenAfterAccept}
          />
        )}

        <View style={{ gap: spacing.sm }}>
          <Body style={{ fontWeight: '600' }}>{t('marketplace.tags')}</Body>
          <Muted>{t('create.tagsHint')}</Muted>
          <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
            {tags.map((tag) => (
              <Chip
                key={tag.id}
                label={tag.label}
                selected={selectedTags.includes(tag.slug)}
                onPress={() => toggleTag(tag.slug)}
              />
            ))}
          </Row>
          {selectedTags.filter((slug) => !tags.some((tag) => tag.slug === slug)).length > 0 && (
            <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
              {selectedTags
                .filter((slug) => !tags.some((tag) => tag.slug === slug))
                .map((slug) => (
                  <Chip
                    key={slug}
                    label={slug}
                    tone={{ bg: colors.orangeSoft, fg: colors.orangeDarker }}
                    onRemove={() => setSelectedTags((prev) => prev.filter((x) => x !== slug))}
                  />
                ))}
            </Row>
          )}
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Input
                value={customTag}
                onChangeText={setCustomTag}
                placeholder={t('create.tagsPlaceholder')}
                icon="tag"
                onSubmitEditing={addCustomTag}
                returnKeyType="done"
              />
            </View>
            <Button title="+" variant="outline" onPress={addCustomTag} style={{ height: 46 }} />
          </Row>
        </View>
      </Card>

      {error && <Body style={{ color: colors.danger }}>{error}</Body>}

      <Row style={{ justifyContent: 'flex-end' }} gap={spacing.sm}>
        <Button title={t('common.cancel')} variant="ghost" onPress={() => router.back()} />
        <Button title={t('create.publish')} icon="plus" size="lg" loading={busy} onPress={submit} />
      </Row>
    </Page>
  );
}
