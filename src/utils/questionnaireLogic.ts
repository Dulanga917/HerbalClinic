import {
  AnswerValue,
  LocalizedText,
  QUESTIONNAIRE_CATEGORIES,
  QUESTIONNAIRE_COPY,
  QUESTIONNAIRE_QUESTIONS,
  QuestionnaireCategoryId,
  QuestionnaireLang,
  QuestionnaireQuestion,
} from '../constants/questionnaire';
import { getDoshaGuidance, SupportedDoshaKey } from './doshaGuidance';

export type QuestionnaireAnswers = Partial<Record<string, AnswerValue>>;

export const localize = (text: LocalizedText, lang: QuestionnaireLang): string => text[lang];

export const formatProgress = (lang: QuestionnaireLang, current: number, total: number): string =>
  localize(QUESTIONNAIRE_COPY.progress, lang)
    .replace('{current}', String(current))
    .replace('{total}', String(total));

export const getQuestionAt = (index: number): QuestionnaireQuestion | undefined =>
  QUESTIONNAIRE_QUESTIONS[index];

export const getCategoryIndex = (category: QuestionnaireCategoryId): number =>
  QUESTIONNAIRE_QUESTIONS.findIndex(question => question.category === category);

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

export const scoreQuestionnaire = (answers: QuestionnaireAnswers) => {
  const counts: Record<SupportedDoshaKey, number> = { vata: 0, pitta: 0, kapha: 0 };
  let scored = 0;

  for (const question of QUESTIONNAIRE_QUESTIONS) {
    const value = answers[question.id];
    if (value === 'vata' || value === 'pitta' || value === 'kapha') {
      counts[value] += 1;
      scored += 1;
    }
  }

  const max = Math.max(counts.vata, counts.pitta, counts.kapha);
  const leaders = (Object.keys(counts) as SupportedDoshaKey[]).filter(key => counts[key] === max);
  const hasClearTendency = scored >= 3 && max >= 2 && leaders.length === 1;
  const tendency = hasClearTendency ? leaders[0] : null;
  const skippedWomens = answers.womens === 'skip' || answers.womens == null;

  return { counts, scored, tendency, skippedWomens };
};

export const buildQuestionnaireResult = (answers: QuestionnaireAnswers) => {
  const score = scoreQuestionnaire(answers);
  const guidance = score.tendency ? getDoshaGuidance(score.tendency) : null;

  return {
    ...score,
    guidance,
    isModelPrediction: false,
  };
};

export const categoryLabels = (lang: QuestionnaireLang) =>
  QUESTIONNAIRE_CATEGORIES.map(category => ({
    id: category.id,
    emoji: category.emoji,
    label: localize(category.label, lang),
  }));
