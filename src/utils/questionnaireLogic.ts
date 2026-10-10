import {
  AnswerValue,
  LocalizedText,
  PREGNANCY_QUESTION_ID,
  QUESTIONNAIRE_CATEGORIES,
  QUESTIONNAIRE_QUESTIONS,
  QuestionnaireCategoryId,
  QuestionnaireLang,
  QuestionnaireQuestion,
} from '../constants/questionnaire';
import { PREGNANCY_CAUTION_HERB_IDS } from '../constants/ayurveda';
import { translate } from '../i18n/translate';
import { getDoshaGuidance, SupportedDoshaKey } from './doshaGuidance';

export type QuestionnaireAnswers = Partial<Record<string, AnswerValue>>;

/**
 * What the answers say about pregnancy. Anything other than an explicit answer to the pregnancy
 * question (not asked, skipped, prefer not to say) stays "unknown" and is never read as "no".
 */
export type PregnancyInfo = 'pregnant_or_possible' | 'not_pregnant' | 'unknown';

export const localize = (text: LocalizedText, lang: QuestionnaireLang): string => text[lang];

export const formatProgress = (lang: QuestionnaireLang, current: number, total: number): string =>
  translate(lang, 'questionnaire.progress', { current, total });

/** Questions the user should see for these answers. Hidden answers are kept but ignored. */
export const visibleQuestions = (answers: QuestionnaireAnswers = {}): QuestionnaireQuestion[] =>
  QUESTIONNAIRE_QUESTIONS.filter(
    question => !question.showWhen || answers[question.showWhen.questionId] === question.showWhen.value,
  );

export const getQuestionAt = (
  index: number,
  answers: QuestionnaireAnswers = {},
): QuestionnaireQuestion | undefined => visibleQuestions(answers)[index];

export const getCategoryIndex = (
  category: QuestionnaireCategoryId,
  answers: QuestionnaireAnswers = {},
): number => visibleQuestions(answers).findIndex(question => question.category === category);

export const canAdvance = (
  question: QuestionnaireQuestion | undefined,
  answers: QuestionnaireAnswers,
): boolean => {
  if (!question) {
    return false;
  }
  if (question.optional) {
    return true;
  }
  return Boolean(answers[question.id]);
};

export const firstUnansweredRequiredIndex = (answers: QuestionnaireAnswers): number =>
  visibleQuestions(answers).findIndex(question => !question.optional && !answers[question.id]);

const visibleAnswer = (answers: QuestionnaireAnswers, questionId: string): AnswerValue | undefined =>
  visibleQuestions(answers).some(question => question.id === questionId) ? answers[questionId] : undefined;

export const pregnancyInfo = (answers: QuestionnaireAnswers): PregnancyInfo => {
  const answer = visibleAnswer(answers, PREGNANCY_QUESTION_ID);
  if (answer === 'yes' || answer === 'not_sure') {
    return 'pregnant_or_possible';
  }
  return answer === 'no' ? 'not_pregnant' : 'unknown';
};

export const scoreQuestionnaire = (answers: QuestionnaireAnswers) => {
  const counts: Record<SupportedDoshaKey, number> = { vata: 0, pitta: 0, kapha: 0 };
  let scored = 0;

  for (const question of visibleQuestions(answers)) {
    const value = answers[question.id];
    if (value === 'vata' || value === 'pitta' || value === 'kapha') {
      counts[value] += 1;
      scored += 1;
    }
  }

  const max = Math.max(counts.vata, counts.pitta, counts.kapha);
  const leaders = (Object.keys(counts) as SupportedDoshaKey[]).filter(key => counts[key] === max);
  // Require a unique leader and a strict majority of scored answers.
  // A 2-1-1 split is not enough evidence to name a Dosha tendency.
  const hasClearTendency = scored >= 3 && max * 2 > scored && leaders.length === 1;
  const tendency = hasClearTendency ? leaders[0] : null;
  const womensAnswer = visibleAnswer(answers, 'womens');
  const skippedWomens = womensAnswer !== 'vata' && womensAnswer !== 'pitta' && womensAnswer !== 'kapha';

  return { counts, scored, tendency, skippedWomens };
};

export const buildQuestionnaireResult = (
  answers: QuestionnaireAnswers,
  lang: QuestionnaireLang = 'en',
) => {
  const score = scoreQuestionnaire(answers);
  const pregnancy = pregnancyInfo(answers);
  const fullGuidance = score.tendency ? getDoshaGuidance(score.tendency, lang) : null;
  const hasPregnancyCaution = (herb: { id: string }) => PREGNANCY_CAUTION_HERB_IDS.has(herb.id);

  const withheldHerbs =
    fullGuidance && pregnancy === 'pregnant_or_possible'
      ? fullGuidance.herbs.filter(hasPregnancyCaution)
      : [];
  const guidance =
    fullGuidance && withheldHerbs.length
      ? { ...fullGuidance, herbs: fullGuidance.herbs.filter(herb => !hasPregnancyCaution(herb)) }
      : fullGuidance;
  // Unknown pregnancy status keeps the herb listed but always shows its pregnancy caution.
  const pregnancyCautionHerbIds =
    guidance && pregnancy === 'unknown'
      ? guidance.herbs.filter(hasPregnancyCaution).map(herb => herb.id)
      : [];

  return {
    ...score,
    guidance,
    pregnancy,
    withheldHerbs,
    pregnancyCautionHerbIds,
    isModelPrediction: false,
  };
};

export const categoryLabels = (lang: QuestionnaireLang) =>
  QUESTIONNAIRE_CATEGORIES.map(category => ({
    id: category.id,
    emoji: category.emoji,
    label: localize(category.label, lang),
  }));
