import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, ApiError } from '../src/api';
import { absoluteUrl } from '../src/api/client';
import { ADVERT_TYPES, CATEGORIES } from '../src/api/types';
import type { AdvertType, Category, ModelSummary, Tag } from '../src/api/types';
import { Icon } from '../src/components/Icon';
import { AppImage } from '../src/components/AppImage';
import { ModelUploadSheet } from '../src/components/ModelUploadSheet';
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
  Sheet,
  SwitchRow,
} from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';
import { useToast } from '../src/context/ToastContext';
import { useGoBack } from '../src/hooks/useGoBack';
import { useBreakpoint } from '../src/hooks/useBreakpoint';
import { useI18n } from '../src/i18n';
import { advertTypeColor, colors, radius, spacing } from '../src/theme/theme';
import { toCents } from '../src/utils/format';
import { pickAndUploadImages } from '../src/utils/upload';

const TYPE_ICONS: Record<AdvertType, 'print' | 'cube' | 'coins' | 'box'> = {
  PRINT_REQUEST: 'print',
  MODEL_REQUEST: 'cube',
  MODEL_FOR_SALE: 'coins',
  PRINT_FOR_SALE: 'box',
};

export default function CreateAdvertScreen() {
  const router = useRouter();
  const { edit: editId } = useLocalSearchParams<{ edit?: string }>();
  const isEditing = typeof editId === 'string' && editId.length > 0;
  const goBack = useGoBack('/');
  const { t, locale } = useI18n();
  const { user, booting } = useAuth();
  const toast = useToast();
  const { isWide } = useBreakpoint();

  const [type, setType] = useState<AdvertType>('PRINT_REQUEST');
  const [category, setCategory] = useState<Category>('OTHER');
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
  const [uploadOpen, setUploadOpen] = useState(false);
  const [thumbnailModalOpen, setThumbnailModalOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  const [tags, setTags] = useState<Tag[]>([]);
  const [loadingAdvert, setLoadingAdvert] = useState(false);
  const [myModels, setMyModels] = useState<ModelSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /** Clears a field's error as soon as the visitor starts fixing it. */
  const clearField = (field: string) =>
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));

  const isRequest = type === 'PRINT_REQUEST' || type === 'MODEL_REQUEST';
  // Selling a digital model means handing over files, so the advert must carry one.
  const needsModel = type === 'MODEL_FOR_SALE';

  useEffect(() => {
    api.tags(undefined, 40).then(setTags).catch(() => undefined);
  }, [locale]);

  useEffect(() => {
    if (!user) return;
    api.myModels().then(setMyModels).catch(() => undefined);
    if (!isEditing) setCity((prev) => prev || user.city || '');
  }, [user, isEditing]);

  // Editing reuses this form: load the advert once and prefill every field.
  useEffect(() => {
    if (!isEditing || !user) return;
    let cancelled = false;
    setLoadingAdvert(true);
    api
      .advert(editId as string)
      .then((advert) => {
        if (cancelled) return;
        setType(advert.type);
        setCategory(advert.category);
        setTitle(advert.title);
        setDescription(advert.description);
        setPrice(advert.priceCents != null ? (advert.priceCents / 100).toFixed(2) : '');
        setAllowBidding(advert.allowBidding);
        setBudgetMin(advert.budgetMinCents != null ? (advert.budgetMinCents / 100).toFixed(2) : '');
        setBudgetMax(advert.budgetMaxCents != null ? (advert.budgetMaxCents / 100).toFixed(2) : '');
        setHiddenAfterAccept(advert.hiddenAfterAccept);
        setCity(advert.city ?? '');
        setDeadline(advert.deadline ?? '');
        setSelectedTags(advert.tags.map((tag) => tag.slug));
        setModelId(advert.model?.id ?? null);
        setImages(
          advert.imageUrls
            .map((url, index) => ({ key: advert.imageKeys?.[index] ?? '', url: absoluteUrl(url) ?? url }))
            .filter((image) => image.key),
        );
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t('errors.generic')))
      .finally(() => !cancelled && setLoadingAdvert(false));
    return () => {
      cancelled = true;
    };
  }, [isEditing, editId, user, t]);

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
              <View style={{ flexDirection: isWide ? 'row' : 'column', gap: spacing.sm }}>
                <Button
                  title={t('common.createAccount')}
                  onPress={() => router.push({ pathname: '/auth/register', params: { redirect: '/create' } })}
                />
                <Button
                  title={t('common.orSignIn')}
                  variant="outline"
                  onPress={() => router.push({ pathname: '/auth/login', params: { redirect: '/create' } })}
                />
              </View>
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

  const addImages = async () => {
    setUploading(true);
    setUploadProgress(null);
    try {
      const uploads = await pickAndUploadImages('listings', (current, total) => {
        setUploadProgress({ current, total });
      });
      if (uploads.length > 0) {
        const newEntries = uploads.map((u) => ({ key: u.objectKey, url: u.url }));
        setImages((prev) => {
          const next = [...prev, ...newEntries];
          // If multiple images were uploaded in batch, open thumbnail picker if more than 1 image exists
          if (uploads.length > 1 && next.length > 1) {
            setTimeout(() => setThumbnailModalOpen(true), 300);
          }
          return next;
        });
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const setThumbnail = (index: number) => {
    if (index === 0 || index >= images.length) return;
    setImages((prev) => {
      const chosen = prev[index];
      const remaining = prev.filter((_, i) => i !== index);
      return [chosen, ...remaining];
    });
    toast.success(t('create.setAsThumbnail'));
  };

  const moveImage = (index: number, direction: 'left' | 'right') => {
    const target = direction === 'left' ? index - 1 : index + 1;
    if (target < 0 || target >= images.length) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  /** Everything the backend would reject, checked up front and reported per field. */
  const validate = () => {
    const errors: Record<string, string> = {};
    if (title.trim().length < 4) errors.title = t('create.titleTooShort');
    if (needsModel && !modelId) errors.modelId = t('create.attachModelRequired');
    if (description.trim().length < 10) errors.description = t('create.descriptionTooShort');
    if (deadline.trim() && !isValidDate(deadline.trim())) errors.deadline = t('create.invalidDate');

    const amounts: [string, string][] = isRequest
      ? [['budgetMinCents', budgetMin], ['budgetMaxCents', budgetMax]]
      : [['priceCents', price]];
    amounts.forEach(([field, raw]) => {
      if (!raw.trim()) return;
      const cents = toCents(raw);
      if (cents === undefined || cents < 0) errors[field] = t('create.invalidAmount');
    });

    const min = toCents(budgetMin);
    const max = toCents(budgetMax);
    if (isRequest && min !== undefined && max !== undefined && min > max) {
      errors.budgetMaxCents = t('create.budgetOrder');
    }
    return errors;
  };

  const submit = async () => {
    setError(null);
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(t('create.fixErrors'));
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      const body = {
        type,
        category,
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
      };
      const advert = isEditing ? await api.updateAdvert(editId as string, body) : await api.createAdvert(body);
      toast.success(isEditing ? t('create.saved') : t('create.published'));
      router.replace(`/advert/${advert.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.fields && Object.keys(err.fields).length > 0) {
        // The backend names its fields exactly like the request body, so they map 1:1.
        setFieldErrors(err.fields);
        setError(t('create.fixErrors'));
      } else {
        setError(err instanceof ApiError ? err.message : t('errors.generic'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page maxWidth={820}>
      <View style={{ gap: 4 }}>
        <H1>{isEditing ? t('create.editTitle') : t('create.title')}</H1>
        <Muted>{isEditing ? t('create.editSubtitle') : t('create.subtitle')}</Muted>
      </View>

      {/* --------------------------------------------------- type */}
      <Card style={{ gap: spacing.md }}>
        <H3>{t('create.step1')}</H3>
        {isEditing && <Muted>{t('create.typeLocked')}</Muted>}
        <View style={{ flexDirection: isWide ? 'row' : 'column', flexWrap: 'wrap', gap: spacing.md }}>
          {ADVERT_TYPES.filter((value) => !isEditing || value === type).map((value) => {
            const selected = value === type;
            const tone = advertTypeColor[value];
            return (
              <Pressable
                key={value}
                disabled={isEditing}
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
          error={fieldErrors.title}
          onChangeText={(value) => {
            setTitle(value);
            clearField('title');
          }}
          placeholder={t('create.advertTitlePlaceholder')}
          maxLength={140}
        />
        <Input
          label={t('advert.description')}
          value={description}
          error={fieldErrors.description}
          onChangeText={(value) => {
            setDescription(value);
            clearField('description');
          }}
          placeholder={t('create.descriptionPlaceholder')}
          multiline
        />
        <Select
          label={t('create.category')}
          value={category}
          options={CATEGORIES.map((value) => ({ value, label: t(`categories.${value}`) }))}
          onChange={(value) => setCategory(value as Category)}
          icon="tag"
        />
        <Muted>{t('create.categoryHint')}</Muted>

        <View style={{ gap: spacing.sm }}>
          <Body style={{ fontWeight: '600' }}>{needsModel ? t('create.attachModel') : t('create.linkModel')}</Body>
          {needsModel && <Muted>{t('create.attachModelHint')}</Muted>}
          {myModels.length > 0 ? (
            <Select
              label={t('create.pickFromLibrary')}
              value={modelId ?? ''}
              error={fieldErrors.modelId}
              options={[
                { value: '', label: '—' },
                ...myModels.map((model) => ({ value: model.id, label: model.title })),
              ]}
              onChange={(value) => {
                setModelId(value || null);
                clearField('modelId');
                if (value && images.length === 0) {
                  const selectedModel = myModels.find((m) => m.id === value);
                  if (selectedModel?.thumbnailUrl) {
                    const key = selectedModel.thumbnailUrl.replace(/^\/api\/files\//, '');
                    setImages([{ key, url: selectedModel.thumbnailUrl }]);
                  }
                }
              }}
              icon="cube"
            />
          ) : (
            <Muted>{t('create.noModelsYet')}</Muted>
          )}
          <Row>
            <Button
              title={t('create.uploadNewModel')}
              icon="upload"
              size="sm"
              variant="outline"
              onPress={() => setUploadOpen(true)}
            />
          </Row>
        </View>
        <View style={{ flexDirection: isWide ? 'row' : 'column', gap: spacing.md }}>
          <View style={{ flexGrow: 1, flexBasis: 200 }}>
            <Input label={t('profile.city')} value={city} onChangeText={setCity} icon="location" />
          </View>
          <View style={{ flexGrow: 1, flexBasis: 200 }}>
            <Input
              label={t('create.deadline')}
              value={deadline}
              error={fieldErrors.deadline}
              onChangeText={(value) => {
                setDeadline(value);
                clearField('deadline');
              }}
              placeholder="2026-12-31"
              icon="calendar"
            />
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs }}>
            <Row gap={spacing.xs} style={{ alignItems: 'center' }}>
              <Body style={{ fontWeight: '600' }}>{t('create.images')}</Body>
              {images.length > 0 && (
                <View
                  style={{
                    backgroundColor: colors.surfaceAlt,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: radius.pill,
                  }}
                >
                  <Muted style={{ fontSize: 12, fontWeight: '600' }}>{images.length}</Muted>
                </View>
              )}
            </Row>
            <Row gap={spacing.sm}>
              {images.length > 1 && (
                <Button
                  title={t('create.selectThumbnail')}
                  icon="star"
                  size="sm"
                  variant="outline"
                  onPress={() => setThumbnailModalOpen(true)}
                />
              )}
              <Button
                title={
                  uploadProgress
                    ? `${t('create.uploadingCount')} (${uploadProgress.current}/${uploadProgress.total})`
                    : t('create.addImages')
                }
                icon="camera"
                size="sm"
                variant={images.length === 0 ? 'primary' : 'outline'}
                loading={uploading}
                onPress={addImages}
              />
            </Row>
          </Row>

          {images.length > 1 && (
            <Muted style={{ fontSize: 13 }}>{t('create.imagesHint')}</Muted>
          )}

          {images.length > 0 && (
            <Row gap={spacing.md} style={{ flexWrap: 'wrap', marginTop: spacing.xs }}>
              {images.map((image, index) => {
                const isThumbnail = index === 0;
                return (
                  <View
                    key={image.key}
                    style={{
                      width: isWide ? 130 : 100,
                      borderRadius: radius.md,
                      overflow: 'hidden',
                      borderWidth: isThumbnail ? 2.5 : 1,
                      borderColor: isThumbnail ? colors.orange : colors.border,
                      backgroundColor: colors.surfaceAlt,
                      position: 'relative',
                    }}
                  >
                    <Pressable
                      onPress={() => {
                        if (!isThumbnail) setThumbnail(index);
                      }}
                      style={{ width: '100%', height: isWide ? 95 : 75, cursor: !isThumbnail ? 'pointer' : (undefined as any) }}
                    >
                      <AppImage
                        uri={absoluteUrl(image.url)}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    </Pressable>

                    {/* Thumbnail star badge or Make Thumbnail button */}
                    {isThumbnail ? (
                      <View
                        style={{
                          backgroundColor: colors.orange,
                          paddingVertical: 3,
                          paddingHorizontal: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                        }}
                      >
                        <Icon name="star" size={10} color="#FFFFFF" />
                        <Body style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                          {t('create.thumbnail')}
                        </Body>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => setThumbnail(index)}
                        style={({ pressed, hovered }: any) => [
                          {
                            paddingVertical: 3,
                            paddingHorizontal: 4,
                            backgroundColor: hovered ? colors.orangeSoft : colors.surfaceAlt,
                            alignItems: 'center',
                            cursor: 'pointer' as any,
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                      >
                        <Body
                          style={{
                            fontSize: 10,
                            fontWeight: '600',
                            color: colors.orangeDarker,
                          }}
                          numberOfLines={1}
                        >
                          {t('create.setAsThumbnail')}
                        </Body>
                      </Pressable>
                    )}

                    {/* Reorder arrows */}
                    {images.length > 1 && (
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          paddingHorizontal: 4,
                          paddingVertical: 2,
                          backgroundColor: colors.surface,
                          borderTopWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <Pressable
                          disabled={index === 0}
                          onPress={() => moveImage(index, 'left')}
                          style={{ opacity: index === 0 ? 0.3 : 1, padding: 3, cursor: index > 0 ? 'pointer' : (undefined as any) }}
                        >
                          <Icon name="chevronLeft" size={10} color={colors.textMuted} />
                        </Pressable>
                        <Muted style={{ fontSize: 10, alignSelf: 'center' }}>#{index + 1}</Muted>
                        <Pressable
                          disabled={index === images.length - 1}
                          onPress={() => moveImage(index, 'right')}
                          style={{ opacity: index === images.length - 1 ? 0.3 : 1, padding: 3, cursor: index < images.length - 1 ? 'pointer' : (undefined as any) }}
                        >
                          <Icon name="chevronRight" size={10} color={colors.textMuted} />
                        </Pressable>
                      </View>
                    )}

                    {/* Delete button */}
                    <Pressable
                      onPress={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                      style={({ pressed }: any) => [
                        {
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          backgroundColor: 'rgba(0,0,0,0.65)',
                          borderRadius: 12,
                          width: 22,
                          height: 22,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: pressed ? 0.7 : 1,
                          cursor: 'pointer' as any,
                        },
                      ]}
                    >
                      <Icon name="close" size={10} color="#FFFFFF" />
                    </Pressable>
                  </View>
                );
              })}
            </Row>
          )}
        </View>

      </Card>

      {/* --------------------------------------------------- price & tags */}
      <Card style={{ gap: spacing.md }}>
        <H3>{t('create.step3')}</H3>

        {isRequest ? (
          <View style={{ flexDirection: isWide ? 'row' : 'column', gap: spacing.md }}>
            <View style={{ flexGrow: 1, flexBasis: 180 }}>
              <Input
                label={t('create.budgetMin')}
                value={budgetMin}
                error={fieldErrors.budgetMinCents}
                onChangeText={(value) => {
                  setBudgetMin(value);
                  clearField('budgetMinCents');
                }}
                keyboardType="decimal-pad"
                icon="euro"
              />
            </View>
            <View style={{ flexGrow: 1, flexBasis: 180 }}>
              <Input
                label={t('create.budgetMax')}
                value={budgetMax}
                error={fieldErrors.budgetMaxCents}
                onChangeText={(value) => {
                  setBudgetMax(value);
                  clearField('budgetMaxCents');
                }}
                keyboardType="decimal-pad"
                icon="euro"
              />
            </View>
          </View>
        ) : (
          <Input
            label={t('create.fixedPrice')}
            value={price}
            error={fieldErrors.priceCents}
            onChangeText={(value) => {
              setPrice(value);
              clearField('priceCents');
            }}
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

      {error && (
        <Card
          style={{
            borderColor: colors.dangerSoft,
            backgroundColor: colors.dangerSoft,
            gap: 4,
          }}
        >
          <Row gap={spacing.sm} style={{ alignItems: 'flex-start' }}>
            <Icon name="warning" size={14} color={colors.danger} />
            <Body style={{ color: colors.danger, fontWeight: '600', flex: 1 }}>{error}</Body>
          </Row>
          {Object.entries(fieldErrors)
            .filter(([, message]) => !!message)
            .map(([field, message]) => (
              <Muted key={field} style={{ color: colors.danger }}>
                {`${fieldLabel(field, t)}: ${message}`}
              </Muted>
            ))}
        </Card>
      )}

      <ModelUploadSheet
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        defaultCategory={category}
        onCreated={(model) => {
          // The advert itself is the listing, so the model is not published twice.
          setMyModels((prev) => [model, ...prev]);
          setModelId(model.id);
          clearField('modelId');
          if (model.thumbnailUrl && images.length === 0) {
            const key = model.thumbnailUrl.replace(/^\/api\/files\//, '');
            setImages([{ key, url: model.thumbnailUrl }]);
          }
          toast.success(t('create.modelSelected'));
        }}
      />

      {/* Thumbnail Selection Overlay Modal */}
      <Sheet
        open={thumbnailModalOpen}
        onClose={() => setThumbnailModalOpen(false)}
        title={t('create.selectThumbnail')}
        width={640}
      >
        <View style={{ gap: spacing.md }}>
          <Muted>{t('create.selectThumbnailDesc')}</Muted>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.sm,
              justifyContent: 'space-between',
            }}
          >
            {images.map((image, index) => {
              const isThumbnail = index === 0;
              return (
                <Pressable
                  key={image.key}
                  onPress={() => {
                    setThumbnail(index);
                    setThumbnailModalOpen(false);
                  }}
                  style={({ pressed, hovered }: any) => [
                    {
                      width: isWide ? 190 : '48%',
                      aspectRatio: 16 / 10,
                      borderRadius: radius.md,
                      overflow: 'hidden',
                      borderWidth: 3,
                      borderColor: isThumbnail ? colors.orange : hovered ? colors.orangeBorder : colors.border,
                      position: 'relative',
                      cursor: 'pointer' as any,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                      backgroundColor: colors.surfaceAlt,
                    },
                  ]}
                >
                  <AppImage
                    uri={absoluteUrl(image.url)}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                  {isThumbnail ? (
                    <View
                      style={{
                        position: 'absolute',
                        top: 6,
                        left: 6,
                        backgroundColor: colors.orange,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: radius.sm,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Icon name="star" size={10} color="#FFFFFF" />
                      <Body style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                        {t('create.thumbnail')}
                      </Body>
                    </View>
                  ) : (
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        left: 6,
                        right: 6,
                        backgroundColor: 'rgba(0,0,0,0.65)',
                        paddingVertical: 5,
                        paddingHorizontal: 6,
                        borderRadius: radius.sm,
                        alignItems: 'center',
                      }}
                    >
                      <Body style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>
                        {t('create.setAsThumbnail')}
                      </Body>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          <Button
            title={t('common.close')}
            variant="outline"
            onPress={() => setThumbnailModalOpen(false)}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </Sheet>

      <View style={{ flexDirection: isWide ? 'row' : 'column-reverse', justifyContent: isWide ? 'flex-end' : undefined, gap: spacing.sm }}>
        <Button title={t('common.cancel')} variant="ghost" onPress={goBack} />
        <Button
          title={isEditing ? t('common.save') : t('create.publish')}
          icon={isEditing ? 'check' : 'plus'}
          size="lg"
          loading={busy || loadingAdvert}
          onPress={submit}
        />
      </View>
    </Page>
  );
}

/** Accepts an ISO date and checks it is a real calendar day (the backend parses LocalDate). */
function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Maps a request field name back to the label the visitor actually sees. */
function fieldLabel(field: string, t: (key: string) => string) {
  switch (field) {
    case 'title':
      return t('create.advertTitle');
    case 'description':
      return t('advert.description');
    case 'deadline':
      return t('create.deadline');
    case 'priceCents':
      return t('create.fixedPrice');
    case 'budgetMinCents':
      return t('create.budgetMin');
    case 'budgetMaxCents':
      return t('create.budgetMax');
    case 'city':
      return t('profile.city');
    case 'tags':
      return t('marketplace.tags');
    case 'modelId':
      return t('create.attachModel');
    case 'category':
      return t('create.category');
    default:
      return field;
  }
}
