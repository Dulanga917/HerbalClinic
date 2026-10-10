import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
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
import { herbDisplayName } from '../../utils/herbLibrary';
import { LiveSkinGuidance } from '../../utils/skinGuidance';
import { describeError, resolveMessage, UserMessage } from '../../utils/userMessages';
import {
  IMAGE_CHECK_UNAVAILABLE,
  ImageRejectedError,
  ImageRejection,
  imageRejectionKey,
} from '../../utils/imageCheck';
import { offlineSkinGuidance } from '../../services/offlineFallbacks';
import ScreenHeader from '../../components/ScreenHeader';
import HerbalButton from '../../components/HerbalButton';
import { useLanguage } from '../../i18n';
import type { LanguageContextValue } from '../../i18n';
import { doshaLabel } from '../../i18n/content';

type Props = {
  navigation: NativeStackNavigationProp<SkinStackParamList, 'SkinResult'>;
  route: RouteProp<SkinStackParamList, 'SkinResult'>;
};

type AnalysisResult = DoshaPrediction | SkinGuidanceResult | null;

const liveGuidanceHeading = (
  guidance: LiveSkinGuidance,
  t: LanguageContextValue['t'],
): { label: string; value: string } => {
  if (guidance.status === 'possible_concern' && guidance.concern) {
    return { label: t('result.possibleConcern'), value: guidance.concern };
  }
  if (guidance.status === 'no_clear_concern') {
    return { label: t('result.generalObservations'), value: t('result.noClearConcern') };
  }
  return { label: t('result.generalObservations'), value: t('result.couldNotAssess') };
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
  const { t } = useLanguage();
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
          <Text style={herbStyles.usageLabel}>{t('result.howToUse')}</Text>
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
  benefit: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 17 },
  usageBox: {
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
  },
  usageLabel: { fontSize: Typography.xs, color: Colors.primaryLight, fontWeight: '700' },
  usageText: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 17 },
});

// ─── Confidence Bar ───────────────────────────────────────────────────────────

const ConfidenceBar: React.FC<{ value: number }> = ({ value }) => {
  const { t } = useLanguage();
  return (
    <View style={confStyles.container}>
      <View style={confStyles.track}>
        <LinearGradient
          colors={Colors.gradientGreen}
          style={[confStyles.fill, { width: `${value}%` }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </View>
      <Text style={confStyles.label}>{t('result.modelConfidence', { value })}</Text>
    </View>
  );
};

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
  label: { fontSize: Typography.xs, lineHeight: 17, color: Colors.textSecondary, flexShrink: 1, maxWidth: '55%' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const SkinResultScreen: React.FC<Props> = ({ navigation, route }) => {
  const { imageUri, analysisType } = route.params;
  const { sessionToken, refreshUser } = useAuth();
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AnalysisResult>(null);
  const [error, setError] = useState<UserMessage | null>(null);
  const [rejection, setRejection] = useState<ImageRejection | null>(null);
  const [checkingPhoto, setCheckingPhoto] = useState(false);
  const analysingRef = useRef(false);
  const liveScanSavedRef = useRef(false);

  useEffect(() => {
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAnalysis = async () => {
    if (analysingRef.current) {
      return;
    }
    analysingRef.current = true;
    try {
      setLoading(true);
      setError(null);
      setRejection(null);

      if (analysisType === 'type') {
        // The on-device classifier labels any image, so the photo must pass the server check first.
        setCheckingPhoto(true);
        await geminiService.checkSkinTypePhoto(imageUri);
        setCheckingPhoto(false);
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
        const res = await geminiService.analyseSkinIssue(imageUri, language);
        setResult(res);
        // Offline guidance did not look at the photo and "unable to assess" assessed nothing,
        // so neither is recorded as a scan. Re-analysing in another language is not a new scan.
        if (
          sessionToken &&
          res.kind === 'live' &&
          res.status !== 'unable_to_assess' &&
          !liveScanSavedRef.current
        ) {
          liveScanSavedRef.current = true;
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
      setResult(null);
      if (e instanceof ImageRejectedError) {
        setRejection(e.imageCheck);
      } else if (e instanceof Error && (e as { code?: unknown }).code === IMAGE_CHECK_UNAVAILABLE) {
        setError({ key: 'imageCheck.unavailable' });
      } else {
        setError(describeError(e, analysisType === 'type' ? 'result.modelFailure' : 'error.generic'));
      }
    } finally {
      analysingRef.current = false;
      setCheckingPhoto(false);
      setLoading(false);
    }
  };

  const isSkinType = analysisType === 'type';
  const doshaResult = isSkinType ? (result as DoshaPrediction | null) : null;
  const skinGuidance = !isSkinType ? (result as SkinGuidanceResult | null) : null;
  const liveGuidance = skinGuidance?.kind === 'live' ? skinGuidance : null;
  // Live AI text cannot follow a language switch, so it is hidden rather than shown under the new headings.
  const liveInOtherLanguage = Boolean(liveGuidance?.language && liveGuidance.language !== language);
  // Offline guidance is static app text, so it is rebuilt to follow the current language.
  const offlineGuidance = skinGuidance?.kind === 'offline' ? offlineSkinGuidance(language) : null;
  const liveHeading = liveGuidance ? liveGuidanceHeading(liveGuidance, t) : null;
  const guidance = doshaResult ? getDoshaGuidance(doshaResult.dosha, language) : null;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScreenHeader
        variant="compact"
        eyebrow={t(isSkinType ? 'result.eyebrowType' : 'result.eyebrowIssue')}
        title={t(isSkinType ? 'result.titleType' : 'feature.skinIssue.title')}
        emoji={isSkinType ? '🔬' : '🩺'}
        colors={isSkinType ? Colors.gradientGreen : Colors.gradientVata}
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <Image
          source={{ uri: imageUri }}
          style={styles.imagePreview}
          accessibilityLabel={t('result.photoA11y')}
        />

        {loading && (
          <View style={styles.loadingCard} accessibilityLiveRegion="polite">
            <ActivityIndicator size="large" color={Colors.primaryLight} />
            <Text style={styles.loadingTitle}>
              {t(checkingPhoto ? 'imageCheck.checking' : isSkinType ? 'result.loadingType' : 'result.loadingIssue')}
            </Text>
            <Text style={styles.loadingSubtitle}>
              {t(
                checkingPhoto
                  ? 'imageCheck.checkingSub'
                  : isSkinType
                    ? 'result.loadingTypeSub'
                    : 'result.loadingIssueSub',
              )}
            </Text>
          </View>
        )}

        {rejection && !loading && (
          <View style={styles.errorCard} accessibilityRole="alert">
            <Text style={styles.errorEmoji}>📷</Text>
            <Text style={styles.rejectionTitle}>{t('imageCheck.title')}</Text>
            <Text style={styles.errorMsg}>{t(imageRejectionKey(rejection.reason))}</Text>
            <Text style={styles.rejectionNote}>{t('imageCheck.noResult')}</Text>
            <HerbalButton
              title={t('imageCheck.retake')}
              onPress={() => navigation.goBack()}
              style={styles.errorAction}
            />
          </View>
        )}

        {error && !loading && (
          <View style={styles.errorCard} accessibilityRole="alert">
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorTitle}>{t('result.failedTitle')}</Text>
            <Text style={styles.errorMsg}>{resolveMessage(error, language)}</Text>
            <HerbalButton title={t('result.tryAgain')} onPress={runAnalysis} style={styles.errorAction} />
            <HerbalButton
              title={t('result.chooseAnother')}
              variant="secondary"
              onPress={() => navigation.goBack()}
              style={styles.errorAction}
            />
          </View>
        )}

        {/* Dosha classification result */}
        {!loading && doshaResult && (
          <>
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View style={styles.resultHeaderCopy}>
                  <Text style={styles.resultLabel}>{t('result.doshaPrediction')}</Text>
                  <Text style={styles.resultValue}>{doshaLabel(doshaResult.dosha, language)}</Text>
                </View>
              </View>
              <ConfidenceBar value={doshaResult.confidence} />
            </View>
            {guidance ? (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {guidance.emoji} {t('result.about', { name: guidance.name })}
                  </Text>
                  <Text style={styles.descText}>{guidance.explanation}</Text>
                </View>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>🌿 {t('result.personalizedSkincare')}</Text>
                  {guidance.skincare.map(item => (
                    <View key={item} style={styles.bulletRow}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{item}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>🌱 {t('result.recommendedHerbs')}</Text>
                  {guidance.herbs.map(herb => (
                    <View key={herb.id} style={styles.bulletRow}>
                      <Text style={styles.bulletDot}>{herb.emoji}</Text>
                      <Text style={styles.bulletText}>
                        {herbDisplayName(herb, language)} — {herb.benefits[0]}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>💚 {t('result.lifestyle')}</Text>
                  {guidance.lifestyle.map(item => (
                    <View key={item} style={styles.bulletRow}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{item}</Text>
                    </View>
                  ))}
                </View>
                {guidance.meditation ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🧘 {t('result.recommendedMeditation')}</Text>
                    <Text style={styles.descText}>
                      {guidance.meditation.title} ({guidance.meditation.duration}) — {guidance.meditation.subtitle}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}
            <View style={styles.disclaimerCard}>
              <Text style={styles.disclaimerText}>{t('result.doshaDisclaimer')}</Text>
            </View>
          </>
        )}

        {/* Offline general guidance (photo not analysed) */}
        {!loading && offlineGuidance && (
          <>
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerText}>{t('result.offlineBanner')}</Text>
            </View>
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>{t('result.generalSkincare')}</Text>
              <Text style={styles.descText}>{offlineGuidance.summary}</Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💚 {t('result.selfCare')}</Text>
              <BulletList items={offlineGuidance.tips} />
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌿 {t('result.herbsUsed')}</Text>
              <View style={styles.herbGrid}>
                {offlineGuidance.herbs.map((h, i) => (
                  <HerbCard key={i} herb={h} index={i} />
                ))}
              </View>
            </View>
          </>
        )}

        {!loading && liveInOtherLanguage && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>{t('result.languageChanged')}</Text>
            <HerbalButton
              title={t('result.analyseAgainInLanguage')}
              onPress={runAnalysis}
              style={styles.errorAction}
            />
          </View>
        )}

        {/* Live AI skin guidance */}
        {!loading && liveGuidance && liveHeading && !liveInOtherLanguage && (
          <>
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>{liveHeading.label}</Text>
              <Text style={styles.guidanceValue}>{liveHeading.value}</Text>
              {liveGuidance.observations ? (
                <Text style={styles.descText}>{liveGuidance.observations}</Text>
              ) : null}
              {liveGuidance.status === 'unable_to_assess' ? (
                <Text style={styles.descText}>{t('result.unableTip')}</Text>
              ) : null}
              <Text style={styles.aiNote}>{t('result.aiNote')}</Text>
            </View>
            {liveGuidance.factors.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔍 {t('result.factors')}</Text>
                <BulletList items={liveGuidance.factors} />
              </View>
            ) : null}
            {liveGuidance.herbs.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🌿 {t('result.herbsUsed')}</Text>
                <View style={styles.herbGrid}>
                  {liveGuidance.herbs.map((h, i) => (
                    <HerbCard key={i} herb={h} index={i} />
                  ))}
                </View>
              </View>
            ) : null}
            {liveGuidance.selfCare.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>💚 {t('result.selfCare')}</Text>
                <BulletList items={liveGuidance.selfCare} />
              </View>
            ) : null}
          </>
        )}

        {!loading && skinGuidance && (
          <View style={styles.disclaimerCard}>
            <Text style={styles.disclaimerText}>⚕️ {t('result.disclaimer')}</Text>
          </View>
        )}

        {!loading && result && (
          <HerbalButton
            title={`📷  ${t('result.scanAgain')}`}
            accessibilityLabel={t('result.scanAgain')}
            accessibilityHint={t('result.scanAgainHint')}
            variant="outline"
            onPress={() => navigation.goBack()}
            style={styles.scanAgainBtn}
          />
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  loadingTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  loadingSubtitle: { fontSize: Typography.sm, lineHeight: 20, color: Colors.textSecondary, textAlign: 'center' },

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
  errorMsg: { fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  errorAction: { marginTop: Spacing.xs },
  rejectionTitle: { fontSize: Typography.xl, fontWeight: '700', color: Colors.warning, textAlign: 'center' },
  rejectionNote: { fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

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
  resultHeaderCopy: { flex: 1 },
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
  aiNote: { fontSize: Typography.xs, color: Colors.textMuted, lineHeight: 17, marginTop: Spacing.md },
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
  scanAgainBtn: { marginBottom: Spacing.md },

  bottomPad: { height: Spacing['3xl'] },
});

export default SkinResultScreen;
