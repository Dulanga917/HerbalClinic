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
import ScreenHeader from '../../components/ScreenHeader';
import { TranslationKey, useLanguage } from '../../i18n';

type Props = {
  navigation: NativeStackNavigationProp<SkinStackParamList, 'SkinHome'>;
};

const scanOptions: {
  id: 'type' | 'issue';
  emoji: string;
  title: TranslationKey;
  description: TranslationKey;
  gradient: string[];
}[] = [
  {
    id: 'type',
    emoji: '🔬',
    title: 'feature.skinType.title',
    description: 'skin.typeDesc',
    gradient: Colors.gradientGreen,
  },
  {
    id: 'issue',
    emoji: '🩺',
    title: 'feature.skinIssue.title',
    description: 'skin.issueDesc',
    gradient: Colors.gradientVata,
  },
];

const workflowSteps: TranslationKey[] = ['skin.step1', 'skin.step2', 'skin.step3'];

const SkinAnalysisScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScreenHeader emoji="🔬" title={t('skin.title')} subtitle={t('skin.subtitle')} />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>{t('skin.chooseType')}</Text>

        {scanOptions.map(opt => (
          <TouchableOpacity
            key={opt.id}
            style={styles.optionCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('SkinCamera', { analysisType: opt.id })}
            accessibilityRole="button"
            accessibilityLabel={t('common.open', { title: t(opt.title) })}>
            <LinearGradient
              colors={opt.gradient}
              style={styles.optionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}>
              <Text style={styles.optionEmoji}>{opt.emoji}</Text>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{t(opt.title)}</Text>
                <Text style={styles.optionDesc}>{t(opt.description)}</Text>
              </View>
              <Text style={styles.arrowIcon}>›</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📋 {t('skin.howItWorks')}</Text>
          {workflowSteps.map((step, i) => (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNum}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{t(step)}</Text>
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
  optionDesc: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.88)', marginTop: 4, lineHeight: 20 },
  arrowIcon: { fontSize: 32, color: Colors.textPrimary },
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
  stepText: { flex: 1, fontSize: Typography.base, lineHeight: 22, color: Colors.textSecondary },
  bottomPad: { height: Spacing['3xl'] },
});

export default SkinAnalysisScreen;
