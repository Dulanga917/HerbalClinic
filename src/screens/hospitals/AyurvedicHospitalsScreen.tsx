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
import {
  AyurvedicHospital,
  HOSPITAL_SOURCE_NOTE,
  HOSPITAL_TYPE_LABELS,
} from '../../constants/ayurvedicHospitals';
import { MainStackParamList } from '../../navigation/types';
import {
  HospitalFilter,
  MapOpenResult,
  filterHospitals,
  listHospitals,
  openHospitalDirections,
  openHospitalOnMap,
} from '../../utils/hospitalDirectory';

type Props = NativeStackScreenProps<MainStackParamList, 'AyurvedicHospitals'>;

const FILTERS: { id: HospitalFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'government', label: 'Government' },
  { id: 'teaching', label: 'Teaching' },
  { id: 'research', label: 'Research' },
  { id: 'provincial', label: 'Provincial' },
];

const reportFailure = (result: MapOpenResult) => {
  if (result === 'failed') {
    Alert.alert('Could not open Google Maps', 'No maps app or browser is available on this device.');
  }
};

const AyurvedicHospitalsScreen: React.FC<Props> = ({ navigation }) => {
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
        eyebrow="HerbalClinic"
        title="Ayurvedic Hospitals"
        emoji="🏥"
        subtitle="Government Ayurvedic hospitals and treatment centres in Sri Lanka"
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
            placeholder="Search hospitals or locations"
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Search hospitals or locations"
          />
          {query ? (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => setQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Clear search">
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
              accessibilityLabel={`Filter ${item.label}`}
              accessibilityState={{ selected: filter === item.id }}>
              <Text style={[styles.filterText, filter === item.id && styles.filterTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {hospitals.length > 0 ? (
          <Text style={styles.resultCount}>
            {hospitals.length === 1 ? '1 hospital' : `${hospitals.length} hospitals`}
          </Text>
        ) : null}

        {hospitals.map(hospital => (
          <View key={hospital.id} style={styles.card}>
            <View style={styles.badgeRow}>
              {hospital.government ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Government</Text>
                </View>
              ) : null}
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{HOSPITAL_TYPE_LABELS[hospital.type]}</Text>
              </View>
            </View>
            <Text style={styles.name}>{hospital.name}</Text>
            <Text style={styles.location}>
              📍 {hospital.city} · {hospital.district} District
            </Text>
            <Text style={styles.address}>{hospital.address}</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.mapBtn}
                onPress={() => viewOnMap(hospital)}
                accessibilityRole="button"
                accessibilityLabel={`View ${hospital.name} on Map`}>
                <Text style={styles.mapBtnText}>View on Map</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.directionsBtn}
                onPress={() => getDirections(hospital)}
                accessibilityRole="button"
                accessibilityLabel={`Get directions to ${hospital.name}`}>
                <Text style={styles.directionsText}>Get Directions</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {hospitals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No hospitals match that search and filter.</Text>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                setQuery('');
                setFilter('all');
              }}
              accessibilityRole="button"
              accessibilityLabel="Show all hospitals">
              <Text style={styles.resetText}>Show all hospitals</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.sourceNote}>{HOSPITAL_SOURCE_NOTE}</Text>
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
  badgeRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm },
  badge: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgeText: { fontSize: Typography.xs, color: Colors.primaryLight, fontWeight: '600' },
  name: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary },
  location: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
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
  mapBtnText: { color: Colors.textPrimary, fontWeight: '700' },
  directionsBtn: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  directionsText: { color: Colors.textSecondary, fontWeight: '700' },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyText: { color: Colors.textSecondary, textAlign: 'center' },
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
