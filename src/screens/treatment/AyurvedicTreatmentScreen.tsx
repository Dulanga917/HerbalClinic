import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import ScreenHeader from '../../components/ScreenHeader';
import {
  AnswerValue,
  QUESTIONNAIRE_COPY,
  QUESTIONNAIRE_QUESTIONS,
  QuestionnaireLang,
} from '../../constants/questionnaire';
import { MainStackParamList } from '../../navigation/types';
import {
  QuestionnaireAnswers,
  buildQuestionnaireResult,
  canAdvance,
  categoryLabels,
  firstUnansweredRequiredIndex,
  formatProgress,
  getCategoryIndex,
  getQuestionAt,
  localize,
} from '../../utils/questionnaireLogic';

type Props = NativeStackScreenProps<MainStackParamList, 'AyurvedicTreatment'>;

const AyurvedicTreatmentScreen: React.FC<Props> = ({ navigation }) => {
  const [lang, setLang] = useState<QuestionnaireLang>('en');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const [completed, setCompleted] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo?.({ y: 0, animated: false });
  }, [index, completed]);

  const question = getQuestionAt(index);
  const total = QUESTIONNAIRE_QUESTIONS.length;
  const categories = useMemo(() => categoryLabels(lang), [lang]);
  const result = completed ? buildQuestionnaireResult(answers) : null;
  const nextEnabled = canAdvance(question, answers);

  const t = (key: keyof typeof QUESTIONNAIRE_COPY) => localize(QUESTIONNAIRE_COPY[key], lang);

  const selectAnswer = (value: AnswerValue) => {
    if (!question) {
      return;
    }
    setAnswers(current => ({ ...current, [question.id]: value }));
  };

  const goNext = () => {
    if (!canAdvance(question, answers)) {
      return;
    }
    if (index >= total - 1) {
      const missing = firstUnansweredRequiredIndex(answers);
      if (missing >= 0) {
        setIndex(missing);
        return;
      }
      setCompleted(true);
      return;
    }
    setIndex(current => current + 1);
  };

  const goPrevious = () => {
    if (completed) {
      setCompleted(false);
      return;
    }
    if (index === 0) {
      navigation.goBack();
      return;
    }
    setIndex(current => current - 1);
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ScreenHeader
        variant="compact"
        eyebrow={t('brand')}
        title={t('title')}
        subtitle={t('intro')}
        onBack={() => navigation.goBack()}
        backLabel={t('back')}
        right={
          <View style={styles.langToggle}>
            <TouchableOpacity
              style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}
              onPress={() => setLang('en')}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityLabel="Switch to English"
              accessibilityState={{ selected: lang === 'en' }}>
              <Text style={[styles.langText, lang === 'en' && styles.langTextActive]}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, lang === 'si' && styles.langBtnActive]}
              onPress={() => setLang('si')}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityLabel="Switch to Sinhala"
              accessibilityState={{ selected: lang === 'si' }}>
              <Text style={[styles.langText, lang === 'si' && styles.langTextActive]}>සිංහල</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView ref={scrollRef} style={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.categoryRow}>
          {categories.map(category => {
            const categoryIndex = getCategoryIndex(category.id);
            const active = !completed && categoryIndex === index;
            return (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => {
                  setCompleted(false);
                  setIndex(categoryIndex);
                }}
                accessibilityRole="button"
                accessibilityLabel={category.label}
                accessibilityState={{ selected: active }}>
                <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {completed && result ? (
          <View style={styles.card}>
            <Text style={styles.progress}>{t('resultTitle')}</Text>
            <Text style={styles.notModel}>{t('resultNotModel')}</Text>
            <Text style={styles.prompt}>
              {result.tendency
                ? localize(QUESTIONNAIRE_COPY.tendency, lang).replace(
                    '{dosha}',
                    result.tendency.charAt(0).toUpperCase() + result.tendency.slice(1),
                  )
                : t('noTendency')}
            </Text>
            {result.guidance ? (
              <>
                <Text style={styles.sectionTitle}>{t('skincare')}</Text>
                {result.guidance.skincare.map(item => (
                  <Text key={item} style={styles.bullet}>
                    • {item}
                  </Text>
                ))}
                <Text style={styles.sectionTitle}>{t('herbs')}</Text>
                {result.guidance.herbs.map(herb => (
                  <Text key={herb.id} style={styles.bullet}>
                    {herb.emoji} {herb.name} — {herb.benefits[0]}
                  </Text>
                ))}
                <Text style={styles.sectionTitle}>{t('lifestyle')}</Text>
                {result.guidance.lifestyle.map(item => (
                  <Text key={item} style={styles.bullet}>
                    • {item}
                  </Text>
                ))}
                <Text style={styles.sectionTitle}>{t('meditation')}</Text>
                <Text style={styles.bullet}>
                  {result.guidance.meditation?.title} — {result.guidance.meditation?.subtitle}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>{t('lifestyle')}</Text>
                <Text style={styles.bullet}>• {t('generalLifestyleOne')}</Text>
                <Text style={styles.bullet}>• {t('generalLifestyleTwo')}</Text>
              </>
            )}
          </View>
        ) : question ? (
          <View style={styles.card}>
            <Text style={styles.progress}>{formatProgress(lang, index + 1, total)}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${((index + 1) / total) * 100}%` }]} />
            </View>
            {question.optional ? <Text style={styles.optional}>{t('optional')}</Text> : null}
            <Text style={styles.prompt}>{localize(question.prompt, lang)}</Text>
            {question.options.map(option => {
              const selected = answers[question.id] === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => selectAnswer(option.value)}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityLabel={localize(option.label, lang)}
                  accessibilityState={{ selected, checked: selected }}>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {localize(option.label, lang)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={goPrevious}
            accessibilityRole="button"
            accessibilityLabel={t('previous')}>
            <Text style={styles.navText}>{t('previous')}</Text>
          </TouchableOpacity>
          {!completed ? (
            <TouchableOpacity
              style={[styles.navBtnPrimary, !nextEnabled && styles.navBtnDisabled]}
              onPress={goNext}
              disabled={!nextEnabled}
              accessibilityRole="button"
              accessibilityLabel={index >= total - 1 ? t('finish') : t('next')}
              accessibilityState={{ disabled: !nextEnabled }}>
              <Text style={styles.navTextPrimary}>{index >= total - 1 ? t('finish') : t('next')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.navBtnPrimary}
              onPress={() => {
                setCompleted(false);
                setIndex(0);
                setAnswers({});
              }}
              accessibilityRole="button"
              accessibilityLabel={t('restart')}>
              <Text style={styles.navTextPrimary}>{t('restart')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.disclaimer}>{t('disclaimer')}</Text>
        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  langToggle: { flexDirection: 'row', gap: 6 },
  langBtn: {
    minHeight: 34,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(240,244,241,0.35)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  langBtnActive: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryLight },
  langText: { color: 'rgba(240,244,241,0.85)', fontWeight: '700', fontSize: Typography.sm },
  langTextActive: { color: Colors.primaryLight },
  body: { flex: 1, padding: Spacing.xl },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.base },
  categoryChip: {
    minHeight: 36,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryChipActive: { borderColor: Colors.primaryLight, backgroundColor: Colors.primaryDark },
  categoryEmoji: { fontSize: 14 },
  categoryText: { color: Colors.textSecondary, fontSize: Typography.sm, fontWeight: '600' },
  categoryTextActive: { color: Colors.primaryLight },
  progressTrack: {
    height: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden',
    marginBottom: Spacing.base,
  },
  progressFill: { height: '100%', borderRadius: BorderRadius.full, backgroundColor: Colors.primaryLight },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  progress: { color: Colors.primaryLight, fontWeight: '700', marginBottom: Spacing.sm },
  optional: { color: Colors.accent, fontSize: Typography.xs, marginBottom: Spacing.sm },
  prompt: { color: Colors.textPrimary, fontSize: Typography.lg, fontWeight: '700', marginBottom: Spacing.base },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 52,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
  },
  optionSelected: { borderColor: Colors.primaryLight, backgroundColor: Colors.primaryDark },
  radio: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.primaryLight },
  radioDot: { width: 10, height: 10, borderRadius: BorderRadius.full, backgroundColor: Colors.primaryLight },
  optionText: { flex: 1, color: Colors.textSecondary, fontSize: Typography.base, lineHeight: 21 },
  optionTextSelected: { color: Colors.textPrimary, fontWeight: '700' },
  navRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  navBtn: {
    flex: 1,
    minHeight: 50,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  navBtnPrimary: {
    flex: 1,
    minHeight: 50,
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  navBtnDisabled: { opacity: 0.4 },
  navText: { color: Colors.textSecondary, fontWeight: '700' },
  navTextPrimary: { color: Colors.textPrimary, fontWeight: '700' },
  disclaimer: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
    lineHeight: 18,
    marginTop: Spacing.xl,
  },
  notModel: { color: Colors.accent, fontSize: Typography.sm, lineHeight: 20, marginBottom: Spacing.md },
  sectionTitle: { color: Colors.primaryLight, fontWeight: '700', marginTop: Spacing.md, marginBottom: Spacing.xs },
  bullet: { color: Colors.textSecondary, lineHeight: 20, marginBottom: 4 },
  bottomPad: { height: Spacing['3xl'] },
});

export default AyurvedicTreatmentScreen;
