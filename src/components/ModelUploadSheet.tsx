import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { api, ApiError } from '../api';
import { absoluteUrl } from '../api/client';
import { CATEGORIES, LICENSES, VISIBILITIES } from '../api/types';
import type {
  Category,
  ModelLicense,
  ModelSummary,
  ModelVisibility,
  UploadResponse,
} from '../api/types';
import { Icon } from './Icon';
import { Body, Button, Input, Muted, Row, Select, Sheet, SwitchRow } from './ui';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { colors, radius, spacing } from '../theme/theme';
import { fileSize, toCents } from '../utils/format';
import { pickAndUploadFiles, pickAndUploadImage } from '../utils/upload';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (model: ModelSummary) => void;
  /** Hidden when the caller publishes the advert itself, so nothing gets listed twice. */
  allowMarketplaceToggle?: boolean;
  defaultCategory?: Category;
  defaultTitle?: string;
  defaultPrice?: string;
}

/**
 * One upload form used by the model library and by the advert form, so a model
 * for sale is always a real model with files behind it.
 */
export function ModelUploadSheet({
  open,
  onClose,
  onCreated,
  allowMarketplaceToggle = false,
  defaultCategory = 'OTHER',
  defaultTitle = '',
  defaultPrice = '0',
}: Props) {
  const { t } = useI18n();
  const toast = useToast();

  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(defaultPrice);
  const [license, setLicense] = useState<ModelLicense>('CC_BY_NC');
  const [visibility, setVisibility] = useState<ModelVisibility>('PUBLIC');
  const [category, setCategory] = useState<Category>(defaultCategory);
  const [listOnMarketplace, setListOnMarketplace] = useState(false);
  const [files, setFiles] = useState<UploadResponse[]>([]);
  const [thumbnail, setThumbnail] = useState<UploadResponse | null>(null);
  const [busy, setBusy] = useState(false);

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
      const upload = await pickAndUploadImage('thumbnails');
      if (upload) setThumbnail(upload);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setTitle('');
    setDescription('');
    setPrice('0');
    setCategory(defaultCategory);
    setListOnMarketplace(false);
    setFiles([]);
    setThumbnail(null);
  };

  const submit = async () => {
    if (title.trim().length < 3 || files.length === 0) return;
    setBusy(true);
    try {
      const detail = await api.createModel({
        title: title.trim(),
        description: description.trim() || undefined,
        license,
        visibility,
        category,
        priceCents: toCents(price) ?? 0,
        thumbnailKey: thumbnail?.objectKey,
        listOnMarketplace: allowMarketplaceToggle && listOnMarketplace,
        files: files.map((file) => ({
          objectKey: file.objectKey,
          fileName: file.fileName,
          sizeBytes: file.sizeBytes,
        })),
      });
      toast.success(t('create.published'));
      reset();
      onCreated(detail.model);
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('models.upload')}
      width={560}
      footer={
        <Row style={{ justifyContent: 'flex-end', gap: spacing.sm }}>
          <Button title={t('common.cancel')} variant="ghost" onPress={onClose} />
          <Button
            title={t('models.upload')}
            icon="upload"
            loading={busy}
            disabled={files.length === 0 || title.trim().length < 3}
            onPress={submit}
          />
        </Row>
      }
    >
      <View style={{ gap: spacing.md }}>
        <Input label={t('create.advertTitle')} value={title} onChangeText={setTitle} icon="cube" />
        <Input label={t('advert.description')} value={description} onChangeText={setDescription} multiline />
        <Row gap={spacing.md} style={{ flexWrap: 'wrap' }}>
          <View style={{ flexGrow: 1, flexBasis: 150 }}>
            <Input
              label={t('models.price')}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              icon="euro"
            />
          </View>
          <View style={{ flexGrow: 1, flexBasis: 180 }}>
            <Select
              label={t('models.category')}
              value={category}
              options={CATEGORIES.map((value) => ({ value, label: t(`categories.${value}`) }))}
              onChange={(value) => setCategory(value as Category)}
              icon="tag"
            />
          </View>
          <View style={{ flexGrow: 1, flexBasis: 180 }}>
            <Select
              label={t('models.license')}
              value={license}
              options={LICENSES.map((value) => ({ value, label: value.replace(/_/g, ' ') }))}
              onChange={(value) => setLicense(value as ModelLicense)}
            />
          </View>
          <View style={{ flexGrow: 1, flexBasis: 180 }}>
            <Select
              label={t('models.visibility')}
              value={visibility}
              options={VISIBILITIES.map((value) => ({ value, label: t(`models.${value}`) }))}
              onChange={(value) => setVisibility(value as ModelVisibility)}
            />
          </View>
        </Row>

        {allowMarketplaceToggle && visibility === 'PUBLIC' && (
          <SwitchRow
            label={t('models.listOnMarketplace')}
            hint={t('models.listOnMarketplaceHint')}
            value={listOnMarketplace}
            onValueChange={setListOnMarketplace}
          />
        )}

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

        {files.length === 0 && <Body style={{ color: colors.textFaint }}>{t('models.uploadFiles')}</Body>}
      </View>
    </Sheet>
  );
}
