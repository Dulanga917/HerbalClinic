import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import geminiService, { HerbRecommendation } from '../../services/geminiService';
import {
  filterHerbs,
  herbDisplayName,
  listHerbs,
  HerbDoshaFilter,
  HerbRecord,
} from '../../utils/herbLibrary';
import { friendlyErrorMessage } from '../../utils/userMessages';
import ScreenHeader from '../../components/ScreenHeader';

const DOSHA_FILTERS: { id: HerbDoshaFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'vata', label: 'Vata' },
  { id: 'pitta', label: 'Pitta' },
  { id: 'kapha', label: 'Kapha' },
];

const HerbalTreatmentScreen: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [doshaFilter, setDoshaFilter] = useState<HerbDoshaFilter>('all');
  const [selectedHerb, setSelectedHerb] = useState<HerbRecord | null>(null);
  const [aiHerbs, setAiHerbs] = useState<HerbRecommendation[] | null>(null);
  const [aiOffline, setAiOffline] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const aiLoadingRef = useRef(false);
  const visibleHerbs = filterHerbs(listHerbs(), query, doshaFilter);
  const filtersActive = Boolean(query.trim()) || doshaFilter !== 'all';

  const handleAiRecommendation = async () => {
    if (aiLoadingRef.current) {
      return;
    }
    aiLoadingRef.current = true;
    setAiLoading(true);
    try {
      const condition = user?.dosha
        ? `${user.dosha} dosha skin wellness`
        : 'general skin wellness';
      const result = await geminiService.getHerbalRecommendations(condition, user?.dosha || undefined);
      setAiHerbs(result.herbs);
      setAiOffline(result.offline);
    } catch (error) {
      Alert.alert(
        'Recommendation unavailable',
        friendlyErrorMessage(error, 'Could not load herbal recommendations. Please try again.'),
      );
    } finally {
      aiLoadingRef.current = false;
      setAiLoading(false);
    }
  };

  const resetFilters = () => {
    setQuery('');
    setDoshaFilter('all');
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScreenHeader
        emoji="🌿"
        title="Herb Library"
        subtitle="Search Ayurvedic herbs and filter by Dosha"
        colors={Colors.gradientKapha}
      />

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleAiRecommendation}
          disabled={aiLoading}
          accessibilityRole="button"
          accessibilityLabel="Get AI herbal recommendation"
          accessibilityState={{ disabled: aiLoading, busy: aiLoading }}>
          <LinearGradient
            colors={Colors.gradientAccent}
            style={styles.aiBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}>
            <Text style={styles.aiEmoji}>✨</Text>
            <View style={styles.aiText}>
              <Text style={styles.aiTitle}>
                {aiLoading ? 'Preparing recommendation…' : 'Get AI Recommendation'}
              </Text>
              <Text style={styles.aiDesc}>
                {user?.dosha
                  ? `Personalized herbs for ${user.dosha}`
                  : 'Analyze your dosha & get a personalized herbal plan'}
              </Text>
            </View>
            {aiLoading ? (
              <ActivityIndicator color={Colors.textPrimary} />
            ) : (
              <Text style={styles.arrowIcon}>›</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search herbs, properties, or uses"
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Search herbs"
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
          {DOSHA_FILTERS.map(filter => (
            <TouchableOpacity
              key={filter.id}
              style={[styles.filterChip, doshaFilter === filter.id && styles.filterChipActive]}
              onPress={() => setDoshaFilter(filter.id)}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${filter.label}`}
              accessibilityState={{ selected: doshaFilter === filter.id }}>
              <Text style={[styles.filterText, doshaFilter === filter.id && styles.filterTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Herbs</Text>
          {filtersActive && visibleHerbs.length > 0 ? (
            <Text style={styles.resultCount}>
              {visibleHerbs.length === 1 ? '1 herb' : `${visibleHerbs.length} herbs`}
            </Text>
          ) : null}
        </View>
        <View style={styles.herbGrid}>
          {visibleHerbs.map(herb => (
            <TouchableOpacity
              key={herb.id}
              style={styles.herbCard}
              activeOpacity={0.85}
              onPress={() => setSelectedHerb(herb)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${herb.name} details`}>
              <Text style={styles.herbEmoji}>{herb.emoji}</Text>
              <Text style={styles.herbName}>{herbDisplayName(herb)}</Text>
              <Text style={styles.herbBenefit}>{herb.benefits[0]}</Text>
              <View style={styles.doshaBadge}>
                <Text style={styles.doshaText}>{herb.doshas.map(d => d[0].toUpperCase() + d.slice(1)).join(' · ')}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        {visibleHerbs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No herbs match that search and Dosha filter.</Text>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={resetFilters}
              accessibilityRole="button"
              accessibilityLabel="Show all herbs">
              <Text style={styles.resetText}>Show all herbs</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.bottomPad} />
      </ScrollView>

      <Modal visible={!!selectedHerb} transparent animationType="slide" onRequestClose={() => setSelectedHerb(null)}>
        <View style={styles.modalBackdrop}>
          <ScrollView style={styles.modalCard} contentContainerStyle={styles.modalScroll}>
            <Text style={styles.modalEmoji}>{selectedHerb?.emoji}</Text>
            <Text style={styles.modalTitle}>{selectedHerb ? herbDisplayName(selectedHerb) : ''}</Text>
            <Text style={styles.modalSub}>{selectedHerb?.botanical}</Text>
            <Text style={styles.modalBody}>{selectedHerb?.description}</Text>
            <Text style={styles.modalLabel}>How to use</Text>
            <Text style={styles.modalBody}>{selectedHerb?.usage}</Text>
            <Text style={styles.modalLabel}>Caution</Text>
            <Text style={styles.modalBody}>{selectedHerb?.caution}</Text>
            <Text style={styles.disclaimer}>Informational only. Not a medical diagnosis.</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setSelectedHerb(null)}
              accessibilityRole="button"
              accessibilityLabel="Close herb details">
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={!!aiHerbs} transparent animationType="slide" onRequestClose={() => setAiHerbs(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <View style={styles.planHeaderSide} />
              <View style={styles.planHeaderText}>
                <Text style={styles.modalTitle}>Herbal plan</Text>
                <Text style={styles.modalSub}>
                  {user?.dosha ? `For ${user.dosha}` : 'General Ayurvedic guidance'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.planCloseIcon}
                onPress={() => setAiHerbs(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close herbal plan">
                <Text style={styles.planCloseIconText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.planScroll} contentContainerStyle={styles.modalScroll}>
              {aiOffline ? (
                <Text style={styles.offlineLabel}>
                  Offline library guidance — not a live Gemini response
                </Text>
              ) : null}
              {(aiHerbs || []).map(herb => (
                <View key={herb.name} style={styles.aiHerbRow}>
                  <Text style={styles.herbEmoji}>{herb.emoji}</Text>
                  <View style={styles.aiHerbText}>
                    <Text style={styles.herbName}>{herb.name}</Text>
                    <Text style={styles.herbBenefit}>{herb.benefit}</Text>
                    <Text style={styles.modalBody}>{herb.usage}</Text>
                  </View>
                </View>
              ))}
              <Text style={styles.disclaimer}>
                {aiOffline
                  ? 'Static herb-library guidance while Gemini is unavailable. Not a medical diagnosis.'
                  : 'Informational herbal guidance only. Not a medical diagnosis.'}
              </Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setAiHerbs(null)}
                accessibilityRole="button"
                accessibilityLabel="Close herbal plan">
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1, padding: Spacing.xl },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  aiEmoji: { fontSize: 32 },
  aiText: { flex: 1 },
  aiTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  aiDesc: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.92)', marginTop: 2 },
  arrowIcon: { fontSize: 32, color: Colors.textPrimary },
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
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
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
  filterChipActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryLight,
  },
  filterText: { color: Colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: Colors.primaryLight },
  offlineLabel: {
    fontSize: Typography.sm,
    color: Colors.accent,
    fontWeight: '700',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  sectionTitle: { fontSize: Typography.xl, fontWeight: '700', color: Colors.textPrimary },
  resultCount: { fontSize: Typography.sm, color: Colors.textSecondary },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
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
  herbGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  herbCard: {
    width: '47%',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  herbEmoji: { fontSize: 36, marginBottom: Spacing.sm },
  herbName: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary },
  herbBenefit: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 4, lineHeight: 16 },
  doshaBadge: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  doshaText: { fontSize: Typography.xs, color: Colors.primaryLight, fontWeight: '600' },
  bottomPad: { height: Spacing['3xl'] },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    maxHeight: '85%',
    flexGrow: 0,
  },
  modalScroll: { paddingBottom: Spacing.xl },
  planCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    maxHeight: '85%',
  },
  planHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  planHeaderSide: { width: 40 },
  planHeaderText: { flex: 1, paddingTop: Spacing.xs },
  planCloseIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCloseIconText: { color: Colors.textPrimary, fontSize: Typography.md, fontWeight: '700' },
  planScroll: { flexGrow: 0 },
  modalEmoji: { fontSize: 44, textAlign: 'center' },
  modalTitle: { fontSize: Typography.xl, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  modalSub: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.md },
  modalLabel: { fontSize: Typography.sm, fontWeight: '700', color: Colors.primaryLight, marginTop: Spacing.md },
  modalBody: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20, marginTop: 4 },
  disclaimer: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: Spacing.md, lineHeight: 16 },
  closeBtn: {
    marginTop: Spacing.xl,
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  closeText: { color: Colors.textPrimary, fontWeight: '700' },
  aiHerbRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  aiHerbText: { flex: 1 },
});

export default HerbalTreatmentScreen;
