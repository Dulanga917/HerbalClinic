import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import ScreenHeader from '../../components/ScreenHeader';
import { AyurvedicHospital } from '../../constants/ayurvedicHospitals';
import { MainStackParamList } from '../../navigation/types';
import {
  HospitalFilter,
  MapOpenResult,
  filterHospitals,
  listHospitals,
  openHospitalDirections,
  openHospitalOnMap,
} from '../../utils/hospitalDirectory';
import { TranslationKey, useLanguage } from '../../i18n';
import { districtName } from '../../i18n/content';

type Props = NativeStackScreenProps<MainStackParamList, 'AyurvedicHospitals'>;

const FILTERS: { id: HospitalFilter; label: TranslationKey }[] = [
  { id: 'all', label: 'common.all' },
  { id: 'government', label: 'hospitals.filter.government' },
  { id: 'teaching', label: 'hospitals.filter.teaching' },
  { id: 'research', label: 'hospitals.filter.research' },
  { id: 'provincial', label: 'hospitals.filter.provincial' },
];

const TYPE_LABELS: Record<AyurvedicHospital['type'], TranslationKey> = {
  teaching: 'hospitals.filter.teaching',
  research: 'hospitals.filter.research',
  provincial: 'hospitals.filter.provincial',
};

const AyurvedicHospitalsScreen: React.FC<Props> = ({ navigation }) => {
  const { language, t } = useLanguage();
  const reportFailure = (result: MapOpenResult) => {
    if (result === 'failed') {
      Alert.alert(t('hospitals.mapsFailedTitle'), t('hospitals.mapsFailedBody'));
    }
  };
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<HospitalFilter>('all');
  const hospitals = filterHospitals(listHospitals(), query, filter);

  const viewOnMap = async (hospital: AyurvedicHospital) => {
    reportFailure(await openHospitalOnMap(hospital));
  };

  const getDirections = async (hospital: AyurvedicHospital) => {
    reportFailure(await openHospitalDirections(hospital));
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ScreenHeader
        variant="compact"
        eyebrow={t('common.appName')}
        title={t('feature.hospitals.title')}
        emoji="🏥"
        subtitle={t('hospitals.subtitle')}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('hospitals.searchPlaceholder')}
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel={t('hospitals.searchPlaceholder')}
          />
          {query ? (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => setQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('common.clearSearch')}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.filterRow}>
          {FILTERS.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.filterChip, filter === item.id && styles.filterChipActive]}
              onPress={() => setFilter(item.id)}
              accessibilityRole="button"
              accessibilityLabel={t('common.filter', { label: t(item.label) })}
              accessibilityState={{ selected: filter === item.id }}>
              <Text style={[styles.filterText, filter === item.id && styles.filterTextActive]}>
                {t(item.label)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {hospitals.length > 0 ? (
          <Text style={styles.resultCount}>
            {hospitals.length === 1
              ? t('hospitals.countOne')
              : t('hospitals.countOther', { count: hospitals.length })}
          </Text>
        ) : null}

        {hospitals.map(hospital => (
          <View key={hospital.id} style={styles.card}>
            <View style={styles.badgeRow}>
              {hospital.government ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t('hospitals.filter.government')}</Text>
                </View>
              ) : null}
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{t(TYPE_LABELS[hospital.type])}</Text>
              </View>
            </View>
            <Text style={styles.name}>{hospital.name}</Text>
            <Text style={styles.location}>
              📍{' '}
              {t('hospitals.location', {
                city: hospital.city,
                district: districtName(hospital.district, language),
              })}
            </Text>
            <Text style={styles.address}>{hospital.address}</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.mapBtn}
                onPress={() => viewOnMap(hospital)}
                accessibilityRole="button"
                accessibilityLabel={t('hospitals.viewOnMapA11y', { name: hospital.name })}>
                <Text style={styles.mapBtnText}>{t('hospitals.viewOnMap')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.directionsBtn}
                onPress={() => getDirections(hospital)}
                accessibilityRole="button"
                accessibilityLabel={t('hospitals.directionsA11y', { name: hospital.name })}>
                <Text style={styles.directionsText}>{t('hospitals.directions')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {hospitals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('hospitals.empty')}</Text>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                setQuery('');
                setFilter('all');
              }}
              accessibilityRole="button"
              accessibilityLabel={t('hospitals.showAll')}>
              <Text style={styles.resetText}>{t('hospitals.showAll')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.sourceNote}>{t('hospitals.sourceNote')}</Text>
        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1, padding: Spacing.xl },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingLeft: Spacing.base,
    marginBottom: Spacing.md,
  },
  searchIcon: { fontSize: 14, marginRight: Spacing.sm },
  searchInput: {
    flex: 1,
    minHeight: 48,
    color: Colors.textPrimary,
    fontSize: Typography.base,
    paddingVertical: Spacing.md,
  },
  clearBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  clearText: { color: Colors.textSecondary, fontSize: Typography.md, fontWeight: '700' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.base },
  resultCount: { color: Colors.textSecondary, fontSize: Typography.sm, marginBottom: Spacing.md },
  filterChip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
  },
  filterChipActive: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryLight },
  filterText: { color: Colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: Colors.primaryLight },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.md,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  badge: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgeText: { fontSize: Typography.xs, color: Colors.primaryLight, fontWeight: '600' },
  name: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary },
  location: { fontSize: Typography.sm, lineHeight: 20, color: Colors.textSecondary, marginTop: Spacing.xs },
  address: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.base },
  mapBtn: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  mapBtnText: { color: Colors.textPrimary, fontWeight: '700', textAlign: 'center' },
  directionsBtn: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  directionsText: { color: Colors.primaryLight, fontWeight: '700', textAlign: 'center' },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  resetBtn: {
    marginTop: Spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  resetText: { color: Colors.primaryLight, fontWeight: '700' },
  sourceNote: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
    lineHeight: 18,
    marginTop: Spacing.md,
  },
  bottomPad: { height: Spacing['3xl'] },
});

export default AyurvedicHospitalsScreen;
