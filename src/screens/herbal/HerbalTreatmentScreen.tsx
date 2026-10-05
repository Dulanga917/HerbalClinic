import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

const herbs = [
  { id: 'turmeric', emoji: '🟡', name: 'Turmeric', benefit: 'Anti-inflammatory & brightening', dosha: 'Pitta' },
  { id: 'neem', emoji: '🌿', name: 'Neem', benefit: 'Antibacterial & purifying', dosha: 'Kapha' },
  { id: 'ashwagandha', emoji: '🌱', name: 'Ashwagandha', benefit: 'Stress relief & rejuvenation', dosha: 'Vata' },
  { id: 'aloe', emoji: '🌵', name: 'Aloe Vera', benefit: 'Soothing & hydrating', dosha: 'Pitta' },
  { id: 'tulsi', emoji: '🍃', name: 'Tulsi', benefit: 'Immunity & skin healing', dosha: 'Kapha' },
  { id: 'sandalwood', emoji: '🪵', name: 'Sandalwood', benefit: 'Cooling & complexion', dosha: 'Pitta' },
];

const HerbalTreatmentScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={Colors.gradientKapha} style={styles.header}>
        <Text style={styles.headerEmoji}>🌿</Text>
        <Text style={styles.headerTitle}>Herbal Treatments</Text>
        <Text style={styles.headerSubtitle}>Personalized Ayurvedic herb recommendations</Text>
      </LinearGradient>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* AI Recommendation Banner */}
        <TouchableOpacity activeOpacity={0.85}>
          <LinearGradient
            colors={Colors.gradientAccent}
            style={styles.aiBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}>
            <Text style={styles.aiEmoji}>✨</Text>
            <View style={styles.aiText}>
              <Text style={styles.aiTitle}>Get AI Recommendation</Text>
              <Text style={styles.aiDesc}>Analyze your skin & get a personalized herbal plan</Text>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Herb List */}
        <Text style={styles.sectionTitle}>Popular Herbs</Text>
        <View style={styles.herbGrid}>
          {herbs.map(herb => (
            <TouchableOpacity key={herb.id} style={styles.herbCard} activeOpacity={0.85}>
              <Text style={styles.herbEmoji}>{herb.emoji}</Text>
              <Text style={styles.herbName}>{herb.name}</Text>
              <Text style={styles.herbBenefit}>{herb.benefit}</Text>
              <View style={styles.doshaBadge}>
                <Text style={styles.doshaText}>{herb.dosha}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
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
});

export default HerbalTreatmentScreen;
