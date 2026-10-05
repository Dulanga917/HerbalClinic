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
  SkinIssueResult,
  HerbRecommendation,
} from '../../services/geminiService';
import { analyseDosha, DoshaPrediction } from '../../services/doshaModelService';
import { saveScan } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { getDoshaGuidance } from '../../utils/doshaGuidance';

type Props = {
  navigation: NativeStackNavigationProp<SkinStackParamList, 'SkinResult'>;
  route: RouteProp<SkinStackParamList, 'SkinResult'>;
};

type AnalysisResult = DoshaPrediction | SkinIssueResult | null;

const getAnalysisErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);

  if (/API_KEY_INVALID|API key not valid|Gemini is not configured/i.test(message)) {
    return 'Skin-issue analysis is unavailable because the server Gemini key is missing or invalid. Ask the project maintainer to set GEMINI_API_KEY on the API server, then try again.';
  }

  return message || 'Analysis failed. Please try again.';
};

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
        if (sessionToken) {
          try {
            await saveScan(sessionToken, {
              confidence: res.confidence,
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
  const skinIssueResult = !isSkinType ? (result as SkinIssueResult) : null;
  const guidance = doshaResult ? getDoshaGuidance(doshaResult.dosha) : null;

  const severityColor = (s?: string) => {
    if (s === 'Mild') return Colors.success;
    if (s === 'Moderate') return Colors.warning;
    if (s === 'Severe') return Colors.error;
    return Colors.textSecondary;
  };

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
          {isSkinType ? '🌿 Dosha Analysis' : '🩺 Scan Result'}
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
              {isSkinType ? 'Analyzing with your on-device model...' : 'Analyzing with Gemini AI...'}
            </Text>
            <Text style={styles.loadingSubtitle}>
              {isSkinType
                ? 'Classifying the image as Vata, Pitta, or Kapha'
                : 'Identifying skin condition and causes'}
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

        {/* Skin ISSUE Result */}
        {!loading && skinIssueResult && (
          <>
            {skinIssueResult.offline ? (
              <View style={styles.offlineBanner}>
                <Text style={styles.offlineBannerText}>
                  Offline guidance — Gemini is unavailable. This is not an analysis of your photo.
                </Text>
              </View>
            ) : null}
            {/* Issue Badge */}
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View>
                  <Text style={styles.resultLabel}>Detected Condition</Text>
                  <Text style={styles.resultValue}>{skinIssueResult.issue}</Text>
                </View>
                <View style={[styles.doshaBadge, { borderColor: severityColor(skinIssueResult.severity) }]}>
                  <Text style={styles.doshaLabel}>Severity</Text>
                  <Text style={[styles.doshaValue, { color: severityColor(skinIssueResult.severity) }]}>
                    {skinIssueResult.severity}
                  </Text>
                </View>
              </View>
              <ConfidenceBar value={skinIssueResult.confidence} />
              <Text style={styles.descText}>{skinIssueResult.description}</Text>
            </View>

            {/* Causes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔍 Possible Causes</Text>
              {skinIssueResult.causes.map((c, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{c}</Text>
                </View>
              ))}
            </View>

            {/* Herbal Remedies */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌿 Herbal Remedies</Text>
              <View style={styles.herbGrid}>
                {skinIssueResult.herbs.map((h, i) => (
                  <HerbCard key={i} herb={h} index={i} />
                ))}
              </View>
            </View>

            {/* Lifestyle */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🧘 Lifestyle Tips</Text>
              {skinIssueResult.lifestyle.map((l, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>💚</Text>
                  <Text style={styles.bulletText}>{l}</Text>
                </View>
              ))}
            </View>

            {/* Disclaimer */}
            <View style={styles.disclaimerCard}>
              <Text style={styles.disclaimerText}>⚕️ {skinIssueResult.disclaimer}</Text>
            </View>
          </>
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
