import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { api, ApiError } from '../src/api';
import type { CostEstimateResponse, PrinterModel } from '../src/api/types';
import { Icon } from '../src/components/Icon';
import { Page } from '../src/components/Page';
import {
  Badge,
  Body,
  Button,
  Card,
  Divider,
  H1,
  H2,
  H3,
  Input,
  Muted,
  Row,
  Select,
  SwitchRow,
} from '../src/components/ui';
import { useToast } from '../src/context/ToastContext';
import { useI18n } from '../src/i18n';
import { colors, spacing } from '../src/theme/theme';
import { money, toCents, toNumber } from '../src/utils/format';
import { useBreakpoint } from '../src/hooks/useBreakpoint';

const LINE_LABELS: Record<string, string> = {
  filament: 'calculator.lineFilament',
  energy: 'calculator.lineEnergy',
  depreciation: 'calculator.lineDepreciation',
  maintenance: 'calculator.lineMaintenance',
  labour: 'calculator.lineLabour',
  failureRisk: 'calculator.lineFailureRisk',
};

export default function CalculatorScreen() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const { isWide } = useBreakpoint();

  const [printers, setPrinters] = useState<PrinterModel[]>([]);
  const [printerId, setPrinterId] = useState<string | null>(null);
  const [watts, setWatts] = useState('');
  const [hours, setHours] = useState('4');
  const [minutes, setMinutes] = useState('30');
  const [filamentPrice, setFilamentPrice] = useState('22.50');
  const [weight, setWeight] = useState('85');
  const [waste, setWaste] = useState('8');
  const [electricity, setElectricity] = useState('0.34');
  const [failureRate, setFailureRate] = useState('5');
  const [labourMinutes, setLabourMinutes] = useState('15');
  const [labourRate, setLabourRate] = useState('20');
  const [margin, setMargin] = useState('20');
  const [depreciation, setDepreciation] = useState(true);
  const [includeVat, setIncludeVat] = useState(false);
  const [vatPercent, setVatPercent] = useState('21');

  const [result, setResult] = useState<CostEstimateResponse | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .printers()
      .then((list) => {
        setPrinters(list);
        if (list.length && !printerId) setPrinterId(list[0].id);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const printerOptions = useMemo(
    () => [
      ...printers.map((printer) => ({
        value: printer.id,
        label: `${printer.brand} ${printer.name}`,
        hint: `${printer.watts} W · ${printer.technology}`,
      })),
      { value: '', label: t('calculator.manualWatts') },
    ],
    [printers, t],
  );

  const calculate = async () => {
    setBusy(true);
    try {
      const response = await api.estimate({
        printerModelId: printerId || undefined,
        wattsOverride: printerId ? undefined : toNumber(watts),
        printHours: toNumber(hours) || 0.1,
        printMinutes: Math.round(toNumber(minutes) ?? 0),
        filamentPricePerKgCents: toCents(filamentPrice) ?? 2000,
        productWeightGrams: toNumber(weight) ?? 1,
        wasteGrams: toNumber(waste) ?? 0,
        electricityPricePerKwhCents: toCents(electricity) ?? 34,
        failureRatePercent: toNumber(failureRate) ?? 0,
        labourMinutes: toNumber(labourMinutes) ?? 0,
        labourRatePerHourCents: toCents(labourRate) ?? 0,
        marginPercent: toNumber(margin) ?? 0,
        includeMachineDepreciation: depreciation,
        includeVat,
        vatPercent: toNumber(vatPercent) ?? 21,
      });
      setResult(response);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page maxWidth={1040}>
      <View style={{ gap: 4 }}>
        <Row gap={spacing.sm}>
          <Icon name="calculator" size={20} color={colors.orange} />
          <H1>{t('calculator.title')}</H1>
        </Row>
        <Muted>{t('calculator.subtitle')}</Muted>
      </View>

      <View
        style={{
          flexDirection: isWide ? 'row' : 'column',
          gap: spacing.lg,
          alignItems: isWide ? 'flex-start' : 'stretch',
        }}
      >
        <Card style={{ flex: isWide ? 3 : undefined, gap: spacing.md, width: '100%' }}>
          <H3>{t('calculator.printer')}</H3>
          <Select
            label={t('calculator.printerPick')}
            value={printerId ?? ''}
            options={printerOptions}
            onChange={(value) => setPrinterId(value || null)}
            icon="print"
          />
          {!printerId && (
            <Input label={t('calculator.watts')} value={watts} onChangeText={setWatts} keyboardType="number-pad" icon="bolt" />
          )}

          <Divider style={{ marginVertical: spacing.xs }} />
          <H3>{t('calculator.duration')}</H3>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Input label={t('calculator.hours')} value={hours} onChangeText={setHours} keyboardType="decimal-pad" icon="clock" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label={t('calculator.minutes')} value={minutes} onChangeText={setMinutes} keyboardType="number-pad" icon="clock" />
            </View>
          </View>

          <Divider style={{ marginVertical: spacing.xs }} />
          <H3>{t('calculator.lineFilament')}</H3>
          <Input
            label={t('calculator.filamentPrice')}
            value={filamentPrice}
            onChangeText={setFilamentPrice}
            keyboardType="decimal-pad"
            icon="euro"
          />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Input label={t('calculator.weight')} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" icon="weight" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label={t('calculator.waste')} value={waste} onChangeText={setWaste} keyboardType="decimal-pad" icon="weight" />
            </View>
          </View>

          <Divider style={{ marginVertical: spacing.xs }} />
          <H3>{t('calculator.lineEnergy')}</H3>
          <View style={{ flexDirection: isWide ? 'row' : 'column', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Input
                label={t('calculator.electricity')}
                value={electricity}
                onChangeText={setElectricity}
                keyboardType="decimal-pad"
                icon="bolt"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label={t('calculator.failureRate')}
                value={failureRate}
                onChangeText={setFailureRate}
                keyboardType="decimal-pad"
                icon="warning"
              />
            </View>
          </View>

          <Divider style={{ marginVertical: spacing.xs }} />
          <H3>{t('calculator.lineLabour')}</H3>
          <View style={{ flexDirection: isWide ? 'row' : 'column', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Input
                label={t('calculator.labourMinutes')}
                value={labourMinutes}
                onChangeText={setLabourMinutes}
                keyboardType="decimal-pad"
                icon="clock"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label={t('calculator.labourRate')}
                value={labourRate}
                onChangeText={setLabourRate}
                keyboardType="decimal-pad"
                icon="euro"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input label={t('calculator.margin')} value={margin} onChangeText={setMargin} keyboardType="decimal-pad" icon="chart" />
            </View>
          </View>

          <Divider style={{ marginVertical: spacing.xs }} />
          <SwitchRow label={t('calculator.depreciation')} value={depreciation} onValueChange={setDepreciation} />
          <SwitchRow label={t('calculator.vat')} value={includeVat} onValueChange={setIncludeVat} />
          {includeVat && (
            <Input label={t('calculator.vatPercent')} value={vatPercent} onChangeText={setVatPercent} keyboardType="decimal-pad" icon="chart" />
          )}

          <Button title={t('calculator.calculate')} icon="calculator" size="lg" full loading={busy} onPress={calculate} />
        </Card>

        <View style={{ flex: isWide ? 2 : undefined, gap: spacing.lg, width: '100%' }}>
          {result ? (
            <>
              <Card style={{ gap: spacing.sm, backgroundColor: colors.orangeSofter, borderColor: colors.orangeBorder }}>
                <Muted>{t('calculator.suggested')}</Muted>
                <H1 style={{ color: colors.orange, fontSize: isWide ? 34 : 28 }}>{money(result.suggestedPriceCents, locale)}</H1>
                <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
                  {result.printerLabel && (
                    <Badge label={result.printerLabel} tone={{ bg: colors.orange, fg: colors.white }} />
                  )}
                  <Badge label={`${result.watts} W`} tone={{ bg: colors.surface, fg: colors.textMuted }} />
                  <Badge
                    label={`${result.energyKwh.toFixed(2)} kWh`}
                    tone={{ bg: colors.surface, fg: colors.textMuted }}
                  />
                  <Badge
                    label={`${result.filamentGrams.toFixed(0)} g`}
                    tone={{ bg: colors.surface, fg: colors.textMuted }}
                  />
                </Row>
              </Card>

              <Card style={{ gap: spacing.sm }}>
                <H3>{t('calculator.breakdown')}</H3>
                {result.lines.map((line) => (
                  <Row key={line.key} style={{ justifyContent: 'space-between', gap: spacing.sm }}>
                    <Muted style={{ flexShrink: 1 }}>{LINE_LABELS[line.key] ? t(LINE_LABELS[line.key]) : line.key}</Muted>
                    <Body>{money(line.amountCents, locale)}</Body>
                  </Row>
                ))}
                <Divider style={{ marginVertical: spacing.xs }} />
                <Row style={{ justifyContent: 'space-between', gap: spacing.sm }}>
                  <Body style={{ fontWeight: '600', flexShrink: 1 }}>{t('calculator.subtotal')}</Body>
                  <Body style={{ fontWeight: '600' }}>{money(result.subtotalCents, locale)}</Body>
                </Row>
                <Row style={{ justifyContent: 'space-between', gap: spacing.sm }}>
                  <Muted style={{ flexShrink: 1 }}>{t('calculator.marginLine')}</Muted>
                  <Body>{money(result.marginCents, locale)}</Body>
                </Row>
                {result.vatCents > 0 && (
                  <Row style={{ justifyContent: 'space-between', gap: spacing.sm }}>
                    <Muted style={{ flexShrink: 1 }}>{t('calculator.vatLine')}</Muted>
                    <Body>{money(result.vatCents, locale)}</Body>
                  </Row>
                )}
                <Divider style={{ marginVertical: spacing.xs }} />
                <Row style={{ justifyContent: 'space-between', gap: spacing.sm }}>
                  <H3 style={{ flexShrink: 1 }}>{t('calculator.total')}</H3>
                  <H2 style={{ color: colors.orange }}>{money(result.totalCents, locale)}</H2>
                </Row>
              </Card>
            </>
          ) : (
            <Card style={{ gap: spacing.md, alignItems: 'center', paddingVertical: spacing.xxl }}>
              <Icon name="magic" size={26} color={colors.orange} />
              <Muted style={{ textAlign: 'center' }}>{t('calculator.emptyHint')}</Muted>
            </Card>
          )}
        </View>
      </View>
    </Page>
  );
}
