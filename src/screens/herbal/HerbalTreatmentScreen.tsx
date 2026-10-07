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
  herbAlternateName,
  herbDisplayName,
  listHerbs,
  HerbDoshaFilter,
  HerbRecord,
} from '../../utils/herbLibrary';
import { describeError, resolveMessage } from '../../utils/userMessages';
import ScreenHeader from '../../components/ScreenHeader';
import { TranslationKey, useLanguage } from '../../i18n';
import { doshaName, localizeHerb } from '../../i18n/content';

const DOSHA_FILTERS: { id: HerbDoshaFilter; label: TranslationKey }[] = [
  { id: 'all', label: 'common.all' },
  { id: 'vata', label: 'dosha.vata' },
  { id: 'pitta', label: 'dosha.pitta' },
  { id: 'kapha', label: 'dosha.kapha' },
];

const HerbalTreatmentScreen: React.FC = () => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [doshaFilter, setDoshaFilter] = useState<HerbDoshaFilter>('all');
  const [selectedHerb, setSelectedHerb] = useState<HerbRecord | null>(null);
  const [aiHerbs, setAiHerbs] = useState<HerbRecommendation[] | null>(null);
  const [aiOffline, setAiOffline] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const aiLoadingRef = useRef(false);
  const visibleHerbs = filterHerbs(listHerbs(), query, doshaFilter).map(herb =>
    localizeHerb(herb, language),
  );
  const filtersActive = Boolean(query.trim()) || doshaFilter !== 'all';
  const herbDetail = selectedHerb ? localizeHerb(selectedHerb, language) : null;
  const herbSubtitle = herbDetail
    ? [herbAlternateName(herbDetail, language), herbDetail.botanical].filter(Boolean).join(' · ')
    : '';
  const userDosha = user?.dosha ? doshaName(user.dosha, language) : null;

  const handleAiRecommendation = async () => {
    if (aiLoadingRef.current) {
      return;
    }
    aiLoadingRef.current = true;
    setAiLoading(true);
    try {
      // The condition is a server-validated query term, so it stays in English.
      const condition = user?.dosha
        ? `${user.dosha} dosha skin wellness`
        : 'general skin wellness';
      const result = await geminiService.getHerbalRecommendations(
        condition,
        user?.dosha || undefined,
        language,
      );
      setAiHerbs(result.herbs);
      setAiOffline(result.offline);
    } catch (error) {
      Alert.alert(
        t('herbal.unavailableTitle'),
        resolveMessage(describeError(error, 'herbal.unavailableBody'), language),
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
        title={t('feature.herbal.title')}
        subtitle={t('herbal.subtitle')}
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
          accessibilityLabel={t('herbal.aiA11y')}
          accessibilityState={{ disabled: aiLoading, busy: aiLoading }}>
          <LinearGradient
            colors={Colors.gradientAccent}
            style={styles.aiBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}>
            <Text style={styles.aiEmoji}>✨</Text>
            <View style={styles.aiText}>
              <Text style={styles.aiTitle}>
                {aiLoading ? t('herbal.aiPreparing') : t('herbal.aiTitle')}
              </Text>
              <Text style={styles.aiDesc}>
                {userDosha ? t('herbal.aiDescFor', { dosha: userDosha }) : t('herbal.aiDescNone')}
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
            placeholder={t('herbal.searchPlaceholder')}
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel={t('herbal.searchA11y')}
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
          {DOSHA_FILTERS.map(filter => (
            <TouchableOpacity
              key={filter.id}
              style={[styles.filterChip, doshaFilter === filter.id && styles.filterChipActive]}
              onPress={() => setDoshaFilter(filter.id)}
              accessibilityRole="button"
              accessibilityLabel={t('common.filter', { label: t(filter.label) })}
              accessibilityState={{ selected: doshaFilter === filter.id }}>
              <Text style={[styles.filterText, doshaFilter === filter.id && styles.filterTextActive]}>
                {t(filter.label)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('herbal.popular')}</Text>
          {filtersActive && visibleHerbs.length > 0 ? (
            <Text style={styles.resultCount}>
              {visibleHerbs.length === 1
                ? t('herbal.countOne')
                : t('herbal.countOther', { count: visibleHerbs.length })}
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
              accessibilityLabel={t('herbal.openDetailsA11y', { name: herbDisplayName(herb, language) })}>
              <Text style={styles.herbEmoji}>{herb.emoji}</Text>
              <Text style={styles.herbName}>{herbDisplayName(herb, language)}</Text>
              <Text style={styles.herbBenefit}>{herb.benefits[0]}</Text>
              <View style={styles.doshaBadge}>
                <Text style={styles.doshaText}>
                  {herb.doshas.map(d => doshaName(d, language)).join(' · ')}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        {visibleHerbs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('herbal.empty')}</Text>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={resetFilters}
              accessibilityRole="button"
              accessibilityLabel={t('herbal.showAll')}>
              <Text style={styles.resetText}>{t('herbal.showAll')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.bottomPad} />
      </ScrollView>

      <Modal visible={!!selectedHerb} transparent animationType="slide" onRequestClose={() => setSelectedHerb(null)}>
        <View style={styles.modalBackdrop}>
          <ScrollView style={styles.modalCard} contentContainerStyle={styles.modalScroll}>
            <Text style={styles.modalEmoji}>{herbDetail?.emoji}</Text>
            <Text style={styles.modalTitle}>{herbDetail ? herbDisplayName(herbDetail, language) : ''}</Text>
            <Text style={styles.modalSub}>{herbSubtitle}</Text>
            <Text style={styles.modalBody}>{herbDetail?.description}</Text>
            <Text style={styles.modalLabel}>{t('herbal.howToUse')}</Text>
            <Text style={styles.modalBody}>{herbDetail?.usage}</Text>
            <Text style={styles.modalLabel}>{t('herbal.caution')}</Text>
            <Text style={styles.modalBody}>{herbDetail?.caution}</Text>
            <Text style={styles.disclaimer}>{t('common.notDiagnosis')}</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setSelectedHerb(null)}
              accessibilityRole="button"
              accessibilityLabel={t('herbal.closeDetailsA11y')}>
              <Text style={styles.closeText}>{t('common.close')}</Text>
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
                <Text style={styles.modalTitle}>{t('herbal.planTitle')}</Text>
                <Text style={styles.modalSub}>
                  {userDosha ? t('herbal.planFor', { dosha: userDosha }) : t('herbal.planGeneral')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.planCloseIcon}
                onPress={() => setAiHerbs(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('herbal.closePlanA11y')}>
                <Text style={styles.planCloseIconText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.planScroll} contentContainerStyle={styles.modalScroll}>
              {aiOffline ? <Text style={styles.offlineLabel}>{t('herbal.planOffline')}</Text> : null}
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
                {aiOffline ? t('herbal.planOfflineDisclaimer') : t('herbal.planDisclaimer')}
              </Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setAiHerbs(null)}
                accessibilityRole="button"
                accessibilityLabel={t('herbal.closePlanA11y')}>
                <Text style={styles.closeText}>{t('common.close')}</Text>
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
  aiDesc: { fontSize: Typography.sm, lineHeight: 20, color: 'rgba(255,255,255,0.92)', marginTop: 2 },
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
    lineHeight: 20,
    color: Colors.accent,
    fontWeight: '700',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
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
  resetText: { color: Colors.primaryLight, fontWeight: '700', textAlign: 'center' },
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
  herbBenefit: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 4, lineHeight: 17 },
  doshaBadge: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  doshaText: { fontSize: Typography.xs, lineHeight: 17, color: Colors.primaryLight, fontWeight: '600' },
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
  modalSub: {
    fontSize: Typography.sm,
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  modalLabel: { fontSize: Typography.sm, fontWeight: '700', color: Colors.primaryLight, marginTop: Spacing.md },
  modalBody: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 21, marginTop: 4 },
  disclaimer: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: Spacing.md, lineHeight: 17 },
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
