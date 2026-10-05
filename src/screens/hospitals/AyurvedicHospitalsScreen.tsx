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
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
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
      <LinearGradient colors={Colors.gradientGreen} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back">
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.brand}>HerbalClinic</Text>
            <Text style={styles.title}>Ayurvedic Hospitals</Text>
          </View>
          <Text style={styles.headerEmoji}>🏥</Text>
        </View>
        <Text style={styles.intro}>Government Ayurvedic hospitals and treatment centres in Sri Lanka</Text>
      </LinearGradient>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.searchInput}
          placeholder="Search hospitals or locations"
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          accessibilityLabel="Search hospitals or locations"
        />
        <View style={styles.filterRow}>
          {FILTERS.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.filterChip, filter === item.id && styles.filterChipActive]}
              onPress={() => setFilter(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${item.label}`}>
              <Text style={[styles.filterText, filter === item.id && styles.filterTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

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
          <Text style={styles.emptyText}>No hospitals match that search and filter.</Text>
        ) : null}

        <Text style={styles.sourceNote}>{HOSPITAL_SOURCE_NOTE}</Text>
        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 56,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backIcon: { fontSize: 36, color: Colors.textPrimary, lineHeight: 36 },
  headerCopy: { flex: 1 },
  brand: { color: Colors.textSecondary, fontSize: Typography.sm, fontWeight: '600' },
  title: { color: Colors.textPrimary, fontSize: Typography.xl, fontWeight: '800' },
  headerEmoji: { fontSize: 32 },
  intro: { color: Colors.textSecondary, marginTop: Spacing.md, lineHeight: 20 },
  body: { flex: 1, padding: Spacing.xl },
  searchInput: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
  filterChip: {
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
  address: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2, lineHeight: 18 },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.base },
  mapBtn: {
    flex: 1,
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
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  directionsText: { color: Colors.textSecondary, fontWeight: '700' },
  emptyText: { color: Colors.textSecondary, marginBottom: Spacing.xl },
  sourceNote: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
    lineHeight: 18,
    marginTop: Spacing.md,
  },
  bottomPad: { height: Spacing['3xl'] },
});

export default AyurvedicHospitalsScreen;
