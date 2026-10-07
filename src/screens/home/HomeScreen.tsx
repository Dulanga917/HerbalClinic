import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeTabParamList, MainStackParamList } from '../../navigation/types';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import geminiService from '../../services/geminiService';
import { homeDoshaState } from '../../utils/homeDashboard';
import { useTopInset } from '../../components/ScreenHeader';
import { TranslationKey, useLanguage } from '../../i18n';
import { offlineDailyTip } from '../../services/offlineFallbacks';

type Props = CompositeScreenProps<
  BottomTabScreenProps<HomeTabParamList, 'Home'>,
  NativeStackScreenProps<MainStackParamList>
>;

type Feature = {
  id: string;
  emoji: string;
  title: TranslationKey;
  description: TranslationKey;
  gradient: string[];
};

const features: Feature[] = [
  {
    id: 'skin-type',
    emoji: '🔬',
    title: 'feature.skinType.title',
    description: 'feature.skinType.desc',
    gradient: Colors.gradientGreen,
  },
  {
    id: 'skin-issue',
    emoji: '🩺',
    title: 'feature.skinIssue.title',
    description: 'feature.skinIssue.desc',
    gradient: Colors.gradientVata,
  },
  {
    id: 'herbal',
    emoji: '🌿',
    title: 'feature.herbal.title',
    description: 'feature.herbal.desc',
    gradient: Colors.gradientKapha,
  },
  {
    id: 'meditation',
    emoji: '🧘',
    title: 'feature.meditation.title',
    description: 'feature.meditation.desc',
    gradient: Colors.gradientAccent,
  },
  {
    id: 'ayurveda-treatment',
    emoji: '📋',
    title: 'feature.treatment.title',
    description: 'feature.treatment.desc',
    gradient: Colors.gradientGreen,
  },
  {
    id: 'ayurveda-hospitals',
    emoji: '🏥',
    title: 'feature.hospitals.title',
    description: 'feature.hospitals.desc',
    gradient: Colors.gradientKapha,
  },
];

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const topInset = useTopInset();
  const doshaCard = homeDoshaState(user, language);
  const [dailyTip, setDailyTip] = useState(() => offlineDailyTip(undefined, language));
  const [tipOffline, setTipOffline] = useState(true);
  const [tipLoading, setTipLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setTipLoading(true);
    geminiService
      .getDailyTip(user?.dosha || undefined, language)
      .then(result => {
        if (!cancelled && result?.tip) {
          setDailyTip(result.tip);
          setTipOffline(Boolean(result.offline));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDailyTip(offlineDailyTip(undefined, language));
          setTipOffline(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTipLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.dosha, language]);

  const handleFeaturePress = (featureId: string) => {
    switch (featureId) {
      case 'skin-type':
        navigation.navigate('SkinAnalysis', {
          screen: 'SkinCamera',
          params: { analysisType: 'type' },
        });
        break;
      case 'skin-issue':
        navigation.navigate('SkinAnalysis', {
          screen: 'SkinCamera',
          params: { analysisType: 'issue' },
        });
        break;
      case 'herbal':
        navigation.navigate('HerbalTreatment');
        break;
      case 'meditation':
        navigation.navigate('Meditation');
        break;
      case 'ayurveda-treatment':
        navigation.navigate('AyurvedicTreatment');
        break;
      case 'ayurveda-hospitals':
        navigation.navigate('AyurvedicHospitals');
        break;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero Header */}
        <LinearGradient
          colors={Colors.gradientGreen}
          style={[styles.hero, { paddingTop: topInset + Spacing.xl }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}>
          <Text style={styles.greeting}>{doshaCard.greeting} 🌿</Text>
          <Text style={styles.heroTitle}>{t('common.appName')}</Text>
          <Text style={styles.heroSubtitle}>{t('home.tagline')}</Text>
        </LinearGradient>

        <View style={styles.section}>
          <View style={styles.doshaCard}>
            <Text style={styles.doshaEyebrow}>
              {doshaCard.hasDosha ? t('home.yourAyurvedicDosha') : t('home.yourDosha')}
            </Text>
            <Text style={styles.doshaValue}>{doshaCard.doshaLabel}</Text>
            <Text style={styles.doshaSubtitle}>{doshaCard.subtitle}</Text>
            {!doshaCard.hasDosha ? (
              <TouchableOpacity
                style={styles.assessBtn}
                onPress={() =>
                  navigation.navigate('SkinAnalysis', {
                    screen: 'SkinCamera',
                    params: { analysisType: 'type' },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={t('home.takeAssessment')}>
                <Text style={styles.assessBtnText}>{t('home.takeAssessment')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.coreFeatures')}</Text>
          <View style={styles.featuresGrid}>
            {features.map(f => (
              <TouchableOpacity
                key={f.id}
                style={styles.featureCard}
                activeOpacity={0.85}
                onPress={() => handleFeaturePress(f.id)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${f.title}`}>
                <LinearGradient
                  colors={f.gradient}
                  style={styles.featureGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}>
                  <View style={styles.featureTopRow}>
                    <Text style={styles.featureEmoji}>{f.emoji}</Text>
                    <View style={styles.featureChevron}>
                      <Text style={styles.featureChevronText}>›</Text>
                    </View>
                  </View>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.description}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Daily Tip */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Ayurveda Tip</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipEmoji}>💡</Text>
            {tipLoading ? (
              <View style={styles.tipLoading} accessibilityLiveRegion="polite">
                <ActivityIndicator size="small" color={Colors.primaryLight} />
                <Text style={styles.tipLoadingText}>Loading today's tip…</Text>
              </View>
            ) : (
              <View style={styles.tipCopy}>
                {tipOffline ? (
                  <Text style={styles.offlineLabel}>Offline guidance — not a live Gemini response</Text>
                ) : null}
                <Text style={styles.tipText}>{dailyTip}</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.homeDisclaimer}>
          Informational Ayurvedic self-care only. Not a medical diagnosis.
        </Text>

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: {
    paddingBottom: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  greeting: { fontSize: Typography.base, color: 'rgba(240,244,241,0.85)', marginBottom: Spacing.xs },
  heroTitle: {
    fontSize: Typography['4xl'],
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  heroSubtitle: { fontSize: Typography.md, color: 'rgba(240,244,241,0.85)', marginTop: Spacing.xs },
  section: { padding: Spacing.xl, paddingTop: Spacing['2xl'] },
  doshaCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginTop: -Spacing['3xl'],
  },
  doshaEyebrow: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  doshaValue: {
    fontSize: Typography['3xl'],
    fontWeight: '800',
    color: Colors.primaryLight,
    marginTop: Spacing.xs,
  },
  doshaSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  assessBtn: {
    marginTop: Spacing.base,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  assessBtnText: { color: Colors.textPrimary, fontWeight: '700' },
  tipCopy: { flex: 1 },
  offlineLabel: {
    fontSize: Typography.xs,
    color: Colors.accent,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  homeDisclaimer: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    fontSize: Typography.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
    letterSpacing: 0.3,
  },
  featuresGrid: { gap: Spacing.md },
  featureCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  featureGradient: {
    padding: Spacing.xl,
    minHeight: 120,
    justifyContent: 'flex-end',
  },
  featureTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  featureEmoji: { fontSize: 36 },
  featureChevron: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureChevronText: {
    fontSize: 24,
    lineHeight: 26,
    color: Colors.textPrimary,
    marginTop: -2,
    marginLeft: 1,
    includeFontPadding: false,
  },
  featureTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  featureDesc: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.88)', lineHeight: 19 },
  tipLoading: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 28 },
  tipLoadingText: { fontSize: Typography.sm, color: Colors.textSecondary },
  tipCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: Spacing.md,
  },
  tipEmoji: { fontSize: 28 },
  tipText: {
    flex: 1,
    fontSize: Typography.base,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  bottomPad: { height: Spacing['3xl'] },
});

export default HomeScreen;
