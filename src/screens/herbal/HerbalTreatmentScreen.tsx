import React, { useState } from 'react';
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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { HERBS } from '../../constants/ayurveda';
import { useAuth } from '../../context/AuthContext';
import geminiService, { HerbRecommendation } from '../../services/geminiService';

type Herb = (typeof HERBS)[keyof typeof HERBS];

const herbList = Object.values(HERBS);

const HerbalTreatmentScreen: React.FC = () => {
  const { user } = useAuth();
  const [selectedHerb, setSelectedHerb] = useState<Herb | null>(null);
  const [aiHerbs, setAiHerbs] = useState<HerbRecommendation[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleAiRecommendation = async () => {
    setAiLoading(true);
    try {
      const condition = user?.dosha
        ? `${user.dosha} dosha skin wellness`
        : 'general skin wellness';
      const herbs = await geminiService.getHerbalRecommendations(condition, user?.dosha || undefined);
      setAiHerbs(herbs);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load herbal recommendations.';
      Alert.alert('Recommendation failed', message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <LinearGradient colors={Colors.gradientKapha} style={styles.header}>
        <Text style={styles.headerEmoji}>🌿</Text>
        <Text style={styles.headerTitle}>Herbal Treatments</Text>
        <Text style={styles.headerSubtitle}>Personalized Ayurvedic herb recommendations</Text>
      </LinearGradient>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleAiRecommendation}
          disabled={aiLoading}
          accessibilityRole="button"
          accessibilityLabel="Get AI herbal recommendation">
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

        <Text style={styles.sectionTitle}>Popular Herbs</Text>
        <View style={styles.herbGrid}>
          {herbList.map(herb => (
            <TouchableOpacity
              key={herb.id}
              style={styles.herbCard}
              activeOpacity={0.85}
              onPress={() => setSelectedHerb(herb)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${herb.name} details`}>
              <Text style={styles.herbEmoji}>{herb.emoji}</Text>
              <Text style={styles.herbName}>{herb.name}</Text>
              <Text style={styles.herbBenefit}>{herb.benefits[0]}</Text>
              <View style={styles.doshaBadge}>
                <Text style={styles.doshaText}>{herb.doshas.map(d => d[0].toUpperCase() + d.slice(1)).join(' · ')}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      <Modal visible={!!selectedHerb} transparent animationType="slide" onRequestClose={() => setSelectedHerb(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>{selectedHerb?.emoji}</Text>
            <Text style={styles.modalTitle}>{selectedHerb?.name}</Text>
            <Text style={styles.modalSub}>{selectedHerb?.sanskrit}</Text>
            <Text style={styles.modalBody}>{selectedHerb?.description}</Text>
            <Text style={styles.modalLabel}>How to use</Text>
            <Text style={styles.modalBody}>{selectedHerb?.usage}</Text>
            <Text style={styles.modalLabel}>Caution</Text>
            <Text style={styles.modalBody}>{selectedHerb?.caution}</Text>
            <Text style={styles.disclaimer}>Informational only. Not a medical diagnosis.</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedHerb(null)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!aiHerbs} transparent animationType="slide" onRequestClose={() => setAiHerbs(null)}>
        <View style={styles.modalBackdrop}>
          <ScrollView style={styles.modalCard} contentContainerStyle={styles.modalScroll}>
            <Text style={styles.modalTitle}>Herbal plan</Text>
            <Text style={styles.modalSub}>
              {user?.dosha ? `For ${user.dosha}` : 'General Ayurvedic guidance'}
            </Text>
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
              If Gemini is offline, this plan uses the in-app herb library. Not a medical diagnosis.
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setAiHerbs(null)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 60,
    paddingBottom: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  headerEmoji: { fontSize: 52, marginBottom: Spacing.sm },
  headerTitle: { fontSize: Typography['3xl'], fontWeight: '800', color: Colors.textPrimary },
  headerSubtitle: { fontSize: Typography.base, color: Colors.textSecondary, marginTop: Spacing.xs, textAlign: 'center' },
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
  aiDesc: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  arrowIcon: { fontSize: 32, color: Colors.textSecondary },
  sectionTitle: { fontSize: Typography.xl, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.base },
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
  },
  modalScroll: { paddingBottom: Spacing.xl },
  modalEmoji: { fontSize: 44, textAlign: 'center' },
  modalTitle: { fontSize: Typography.xl, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  modalSub: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.md },
  modalLabel: { fontSize: Typography.sm, fontWeight: '700', color: Colors.primaryLight, marginTop: Spacing.md },
  modalBody: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20, marginTop: 4 },
  disclaimer: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: Spacing.md, lineHeight: 16 },
  closeBtn: {
    marginTop: Spacing.xl,
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
