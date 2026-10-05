import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { SkinStackParamList } from '../../navigation/types';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import geminiService, {
  SkinGuidanceResult,
  HerbRecommendation,
} from '../../services/geminiService';
import { analyseDosha, DoshaPrediction } from '../../services/doshaModelService';
import { saveScan } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { getDoshaGuidance } from '../../utils/doshaGuidance';
import { LiveSkinGuidance, SKIN_GUIDANCE_DISCLAIMER } from '../../utils/skinGuidance';

type Props = {
  navigation: NativeStackNavigationProp<SkinStackParamList, 'SkinResult'>;
  route: RouteProp<SkinStackParamList, 'SkinResult'>;
};

type AnalysisResult = DoshaPrediction | SkinGuidanceResult | null;

const getAnalysisErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  return message || 'Analysis failed. Please try again.';
};

const liveGuidanceHeading = (guidance: LiveSkinGuidance): { label: string; value: string } => {
  if (guidance.status === 'possible_concern' && guidance.concern) {
    return { label: 'Possible skin concern', value: guidance.concern };
  }
  if (guidance.status === 'no_clear_concern') {
    return { label: 'General observations', value: 'No clear concern noted in this photo' };
  }
  return { label: 'General observations', value: 'This photo could not be assessed' };
};

const BulletList: React.FC<{ items: string[]; bullet?: string }> = ({ items, bullet = '•' }) => (
  <>
    {items.map((item, i) => (
      <View key={i} style={styles.bulletRow}>
        <Text style={styles.bulletDot}>{bullet}</Text>
        <Text style={styles.bulletText}>{item}</Text>
      </View>
    ))}
  </>
);

// ─── Sub-components ───────────────────────────────────────────────────────────

const HerbCard: React.FC<{ herb: HerbRecommendation; index: number }> = ({ herb, index }) => {
  const gradients = [
    Colors.gradientGreen,
    Colors.gradientVata,
    Colors.gradientKapha,
    Colors.gradientPitta,
    Colors.gradientAccent,
  ];
  return (
    <View style={herbStyles.card}>
      <LinearGradient
        colors={gradients[index % gradients.length]}
        style={herbStyles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        <Text style={herbStyles.emoji}>{herb.emoji}</Text>
        <Text style={herbStyles.name}>{herb.name}</Text>
        <Text style={herbStyles.benefit}>{herb.benefit}</Text>
        <View style={herbStyles.usageBox}>
          <Text style={herbStyles.usageLabel}>How to use:</Text>
          <Text style={herbStyles.usageText}>{herb.usage}</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const herbStyles = StyleSheet.create({
  card: { width: '48%', borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: Spacing.md },
  gradient: { padding: Spacing.base, minHeight: 160 },
  emoji: { fontSize: 32, marginBottom: Spacing.xs },
  name: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary },
  benefit: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },
  usageBox: {
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
  },
  usageLabel: { fontSize: Typography.xs, color: Colors.primaryLight, fontWeight: '700' },
  usageText: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 15 },
});

// ─── Confidence Bar ───────────────────────────────────────────────────────────

const ConfidenceBar: React.FC<{ value: number }> = ({ value }) => (
  <View style={confStyles.container}>
    <View style={confStyles.track}>
      <LinearGradient
        colors={Colors.gradientGreen}
        style={[confStyles.fill, { width: `${value}%` }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />
    </View>
    <Text style={confStyles.label}>{value}% model confidence</Text>
  </View>
);

const confStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  track: {
    flex: 1,
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: BorderRadius.full },
  label: { fontSize: Typography.xs, color: Colors.textSecondary, width: 180 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const SkinResultScreen: React.FC<Props> = ({ navigation, route }) => {
  const { imageUri, analysisType } = route.params;
  const { sessionToken, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AnalysisResult>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      if (analysisType === 'type') {
        const res = await analyseDosha(imageUri);
        setResult(res);
        if (sessionToken) {
          try {
            await saveScan(sessionToken, {
              dosha: res.dosha,
              confidence: res.confidence,
              imageReference: imageUri.split('/').pop(),
            });
            await refreshUser();
          } catch {
            // Keep showing the on-device result even if persistence fails.
          }
        }
      } else {
        const res = await geminiService.analyseSkinIssue(imageUri);
        setResult(res);
        // Offline guidance did not look at the photo, so it is never recorded as a scan.
        if (sessionToken && res.kind === 'live') {
          try {
            await saveScan(sessionToken, {
              imageReference: imageUri.split('/').pop(),
            });
            await refreshUser();
          } catch {
            // Keep showing the analysis even if persistence fails.
          }
        }
      }
    } catch (e: unknown) {
      setError(getAnalysisErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const isSkinType = analysisType === 'type';
  const doshaResult = isSkinType ? (result as DoshaPrediction | null) : null;
  const skinGuidance = !isSkinType ? (result as SkinGuidanceResult | null) : null;
  const liveGuidance = skinGuidance?.kind === 'live' ? skinGuidance : null;
  const offlineGuidance = skinGuidance?.kind === 'offline' ? skinGuidance : null;
  const liveHeading = liveGuidance ? liveGuidanceHeading(liveGuidance) : null;
  const guidance = doshaResult ? getDoshaGuidance(doshaResult.dosha) : null;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={isSkinType ? Colors.gradientGreen : Colors.gradientVata}
        style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isSkinType ? '🌿 Dosha Analysis' : '🌿 AI Skin Guidance'}
        </Text>
      </LinearGradient>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Image Preview */}
        <Image source={{ uri: imageUri }} style={styles.imagePreview} />

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.primaryLight} />
            <Text style={styles.loadingTitle}>
              {isSkinType ? 'Analyzing with your on-device model...' : 'Requesting AI skin guidance...'}
            </Text>
            <Text style={styles.loadingSubtitle}>
              {isSkinType
                ? 'Classifying the image as Vata, Pitta, or Kapha'
                : 'Preparing general Ayurvedic self-care suggestions'}
            </Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={styles.errorCard}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorTitle}>Analysis Failed</Text>
            <Text style={styles.errorMsg}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={runAnalysis}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Dosha classification result */}
        {!loading && doshaResult && (
          <>
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View>
                  <Text style={styles.resultLabel}>Dosha prediction</Text>
                  <Text style={styles.resultValue}>{doshaResult.dosha}</Text>
                </View>
              </View>
              <ConfidenceBar value={doshaResult.confidence} />
            </View>
            {guidance ? (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{guidance.emoji} About {guidance.name}</Text>
                  <Text style={styles.descText}>{guidance.explanation}</Text>
                </View>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>🌿 Personalized skincare</Text>
                  {guidance.skincare.map(item => (
                    <View key={item} style={styles.bulletRow}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{item}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>🌱 Recommended herbs</Text>
                  {guidance.herbs.map(herb => (
                    <View key={herb.id} style={styles.bulletRow}>
                      <Text style={styles.bulletDot}>{herb.emoji}</Text>
                      <Text style={styles.bulletText}>
                        {herb.name} — {herb.benefits[0]}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>💚 Lifestyle / self-care</Text>
                  {guidance.lifestyle.map(item => (
                    <View key={item} style={styles.bulletRow}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{item}</Text>
                    </View>
                  ))}
                </View>
                {guidance.meditation ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🧘 Recommended meditation</Text>
                    <Text style={styles.descText}>
                      {guidance.meditation.title} ({guidance.meditation.duration}) — {guidance.meditation.subtitle}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}
            <View style={styles.disclaimerCard}>
              <Text style={styles.disclaimerText}>
                This is an experimental Dosha prediction for informational self-care only.
                Model confidence is not medical accuracy and this is not a diagnosis.
              </Text>
            </View>
          </>
        )}

        {/* Offline general guidance (photo not analysed) */}
        {!loading && offlineGuidance && (
          <>
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerText}>
                Offline general guidance — your photo was not analysed.
              </Text>
            </View>
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>General skincare guidance</Text>
              <Text style={styles.descText}>{offlineGuidance.summary}</Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💚 Self-care suggestions</Text>
              <BulletList items={offlineGuidance.tips} />
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌿 Herbs used in Ayurvedic skincare</Text>
              <View style={styles.herbGrid}>
                {offlineGuidance.herbs.map((h, i) => (
                  <HerbCard key={i} herb={h} index={i} />
                ))}
              </View>
            </View>
          </>
        )}

        {/* Live AI skin guidance */}
        {!loading && liveGuidance && liveHeading && (
          <>
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>{liveHeading.label}</Text>
              <Text style={styles.guidanceValue}>{liveHeading.value}</Text>
              {liveGuidance.observations ? (
                <Text style={styles.descText}>{liveGuidance.observations}</Text>
              ) : null}
              {liveGuidance.status === 'unable_to_assess' ? (
                <Text style={styles.descText}>Try a clear, well-lit close-up photo of the skin.</Text>
              ) : null}
              <Text style={styles.aiNote}>
                Generated by Gemini AI. It can be inaccurate and does not replace an examination.
              </Text>
            </View>
            {liveGuidance.factors.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔍 Possible contributing factors</Text>
                <BulletList items={liveGuidance.factors} />
              </View>
            ) : null}
            {liveGuidance.herbs.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🌿 Herbs used in Ayurvedic skincare</Text>
                <View style={styles.herbGrid}>
                  {liveGuidance.herbs.map((h, i) => (
                    <HerbCard key={i} herb={h} index={i} />
                  ))}
                </View>
              </View>
            ) : null}
            {liveGuidance.selfCare.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>💚 Self-care suggestions</Text>
                <BulletList items={liveGuidance.selfCare} />
              </View>
            ) : null}
          </>
        )}

        {!loading && skinGuidance && (
          <View style={styles.disclaimerCard}>
            <Text style={styles.disclaimerText}>⚕️ {SKIN_GUIDANCE_DISCLAIMER}</Text>
          </View>
        )}

        {/* Scan Again */}
        {!loading && result && (
          <TouchableOpacity style={styles.scanAgainBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.scanAgainText}>📷  Scan Again</Text>
          </TouchableOpacity>
        )}

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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  backBtn: { padding: Spacing.xs },
  backIcon: { fontSize: 36, color: Colors.textPrimary, lineHeight: 36 },
  headerTitle: { fontSize: Typography.xl, fontWeight: '800', color: Colors.textPrimary },
  body: { flex: 1, padding: Spacing.xl },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
    resizeMode: 'cover',
    borderWidth: 2,
    borderColor: Colors.cardBorder,
  },

  // Loading
  loadingCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  loadingTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  loadingSubtitle: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center' },

  // Error
  errorCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorEmoji: { fontSize: 48 },
  errorTitle: { fontSize: Typography.xl, fontWeight: '700', color: Colors.error },
  errorMsg: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  retryText: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },

  // Result
  resultCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.xl,
  },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  resultLabel: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: '600' },
  resultValue: { fontSize: Typography['2xl'], fontWeight: '800', color: Colors.textPrimary },
  doshaBadge: {
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  doshaLabel: { fontSize: Typography.xs, color: Colors.textSecondary },
  doshaValue: { fontSize: Typography.base, fontWeight: '700', color: Colors.primaryLight },
  descText: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20, marginTop: Spacing.md },
  guidanceValue: { fontSize: Typography.xl, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  aiNote: { fontSize: Typography.xs, color: Colors.textMuted, lineHeight: 16, marginTop: Spacing.md },
  offlineBanner: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.accent,
    marginBottom: Spacing.xl,
  },
  offlineBannerText: { fontSize: Typography.sm, color: Colors.accent, lineHeight: 20, fontWeight: '600' },

  // Section
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  bulletRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm, alignItems: 'flex-start' },
  bulletDot: { fontSize: Typography.base, lineHeight: 22 },
  bulletText: { flex: 1, fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 22 },

  herbGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },

  // Disclaimer
  disclaimerCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.warning,
    marginBottom: Spacing.xl,
  },
  disclaimerText: { fontSize: Typography.xs, color: Colors.textSecondary, lineHeight: 18 },

  // Scan Again
  scanAgainBtn: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.md,
  },
  scanAgainText: { fontSize: Typography.md, fontWeight: '600', color: Colors.primaryLight },

  bottomPad: { height: Spacing['3xl'] },
});

export default SkinResultScreen;
