import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SkinStackParamList } from '../../navigation/types';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

type Props = {
  navigation: NativeStackNavigationProp<SkinStackParamList, 'SkinHome'>;
};

const scanOptions = [
  {
    id: 'type' as const,
    emoji: '🔬',
    title: 'Dosha Image Classifier',
    description: 'Experimental image classification: Vata, Pitta, or Kapha',
    gradient: Colors.gradientGreen,
  },
  {
    id: 'issue' as const,
    emoji: '🩺',
    title: 'Detect Skin Issue',
    description: 'Identify acne, pigmentation, rashes and more',
    gradient: Colors.gradientVata,
  },
];

const workflowSteps = [
  'Choose dosha classification or skin-issue analysis',
  'Take or select a clear photo',
  'Dosha classification runs on-device; skin-issue scans use Gemini',
];

const SkinAnalysisScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={Colors.gradientGreen} style={styles.header}>
        <Text style={styles.headerEmoji}>🔬</Text>
        <Text style={styles.headerTitle}>Image Analysis</Text>
        <Text style={styles.headerSubtitle}>
          On-device dosha model and Gemini skin-issue analysis
        </Text>
      </LinearGradient>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Choose Analysis Type</Text>

        {scanOptions.map(opt => (
          <TouchableOpacity
            key={opt.id}
            style={styles.optionCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('SkinCamera', { analysisType: opt.id })}>
            <LinearGradient
              colors={opt.gradient}
              style={styles.optionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}>
              <Text style={styles.optionEmoji}>{opt.emoji}</Text>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{opt.title}</Text>
                <Text style={styles.optionDesc}>{opt.description}</Text>
              </View>
              <Text style={styles.arrowIcon}>›</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}

        {/* Instructions Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📋 How it Works</Text>
          {workflowSteps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNum}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
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
  sectionTitle: { fontSize: Typography.xl, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.base },
  optionCard: { borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: Spacing.md },
  optionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  optionEmoji: { fontSize: 40 },
  optionText: { flex: 1 },
  optionTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  optionDesc: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 4 },
  arrowIcon: { fontSize: 32, color: Colors.textSecondary },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginTop: Spacing.md,
  },
  infoTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.base },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: Spacing.md },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNum: { fontSize: Typography.sm, fontWeight: '800', color: Colors.background },
  stepText: { flex: 1, fontSize: Typography.base, color: Colors.textSecondary },
  bottomPad: { height: Spacing['3xl'] },
});

export default SkinAnalysisScreen;
