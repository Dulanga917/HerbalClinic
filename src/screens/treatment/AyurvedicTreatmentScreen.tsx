import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
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
      <LinearGradient colors={Colors.gradientGreen} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={goPrevious}
            accessibilityRole="button"
            accessibilityLabel={t('back')}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.brand}>{t('brand')}</Text>
            <Text style={styles.title}>{t('title')}</Text>
          </View>
          <View style={styles.langToggle}>
            <TouchableOpacity
              style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}
              onPress={() => setLang('en')}
              accessibilityRole="button"
              accessibilityLabel="Switch to English">
              <Text style={[styles.langText, lang === 'en' && styles.langTextActive]}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, lang === 'si' && styles.langBtnActive]}
              onPress={() => setLang('si')}
              accessibilityRole="button"
              accessibilityLabel="Switch to Sinhala">
              <Text style={[styles.langText, lang === 'si' && styles.langTextActive]}>සිංහල</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.intro}>{t('intro')}</Text>
      </LinearGradient>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
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
                accessibilityLabel={category.label}>
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
            {question.optional ? <Text style={styles.optional}>{t('optional')}</Text> : null}
            <Text style={styles.prompt}>{localize(question.prompt, lang)}</Text>
            {question.options.map(option => {
              const selected = answers[question.id] === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => selectAnswer(option.value)}
                  accessibilityRole="button"
                  accessibilityLabel={localize(option.label, lang)}>
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
  header: {
    paddingTop: 56,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backIcon: { fontSize: 36, color: Colors.textPrimary, lineHeight: 36 },
  headerCopy: { flex: 1 },
  brand: { color: Colors.textSecondary, fontSize: Typography.sm, fontWeight: '600' },
  title: { color: Colors.textPrimary, fontSize: Typography.xl, fontWeight: '800' },
  langToggle: { flexDirection: 'row', gap: 6 },
  langBtn: {
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  langBtnActive: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryLight },
  langText: { color: Colors.textSecondary, fontWeight: '700', fontSize: Typography.xs },
  langTextActive: { color: Colors.primaryLight },
  intro: { color: Colors.textSecondary, marginTop: Spacing.md, lineHeight: 20 },
  body: { flex: 1, padding: Spacing.xl },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.base },
  categoryChip: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryChipActive: { borderColor: Colors.primaryLight, backgroundColor: Colors.primaryDark },
  categoryEmoji: { fontSize: 12 },
  categoryText: { color: Colors.textSecondary, fontSize: Typography.xs, fontWeight: '600' },
  categoryTextActive: { color: Colors.primaryLight },
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
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
  },
  optionSelected: { borderColor: Colors.primaryLight, backgroundColor: Colors.primaryDark },
  optionText: { color: Colors.textSecondary },
  optionTextSelected: { color: Colors.textPrimary, fontWeight: '700' },
  navRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  navBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  navBtnPrimary: {
    flex: 1,
    backgroundColor: Colors.primaryDark,
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
