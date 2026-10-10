import { describe, expect, it } from '@jest/globals';
import { QUESTIONNAIRE_CATEGORIES, QUESTIONNAIRE_QUESTIONS } from '../src/constants/questionnaire';
import { translate } from '../src/i18n';
import {
  QuestionnaireAnswers,
  buildQuestionnaireResult,
  canAdvance,
  firstUnansweredRequiredIndex,
  formatProgress,
  getCategoryIndex,
  getQuestionAt,
  localize,
  pregnancyInfo,
  scoreQuestionnaire,
  visibleQuestions,
} from '../src/utils/questionnaireLogic';

const GENERAL_VATA: QuestionnaireAnswers = {
  skin: 'vata',
  body: 'vata',
  hair: 'vata',
  mental: 'pitta',
};
const herbIds = (answers: QuestionnaireAnswers) =>
  buildQuestionnaireResult(answers).guidance?.herbs.map(herb => herb.id) ?? [];

describe('Ayurvedic Treatment questionnaire', () => {
  it('includes the five thesis categories', () => {
    expect(QUESTIONNAIRE_CATEGORIES.map(item => item.id)).toEqual([
      'skin',
      'body',
      'hair',
      'womens',
      'mental',
    ]);
    expect(QUESTIONNAIRE_QUESTIONS.map(item => item.id)).toEqual([
      'skin',
      'body',
      'hair',
      'reproductiveRelevant',
      'pregnancy',
      'womens',
      'mental',
    ]);
  });

  it('has English and Sinhala labels for copy, questions, and answers', () => {
    expect(translate('en', 'questionnaire.title')).toBe('Ayurvedic Treatment');
    expect(translate('si', 'questionnaire.title')).toContain('ආයුර්වේද');
    expect(translate('en', 'questionnaire.disclaimer')).toMatch(/not a medical diagnosis/i);
    expect(translate('si', 'questionnaire.disclaimer')).toContain('රෝග විනිශ්චයක් නොවේ');
    expect(translate('si', 'questionnaire.pregnancyHerbsWithheld', { herbs: 'අමුක්කරා' })).toContain(
      'අමුක්කරා',
    );

    for (const question of QUESTIONNAIRE_QUESTIONS) {
      expect(question.prompt.en.length).toBeGreaterThan(0);
      expect(question.prompt.si.length).toBeGreaterThan(0);
      expect(question.options.length).toBeGreaterThan(1);
      for (const option of question.options) {
        expect(option.label.en.length).toBeGreaterThan(0);
        expect(option.label.si.length).toBeGreaterThan(0);
      }
    }
  });

  it('blocks Next on a required unanswered question and allows the optional reproductive questions', () => {
    const skin = getQuestionAt(0);
    expect(canAdvance(skin, {})).toBe(false);
    expect(canAdvance(skin, { skin: 'vata' })).toBe(true);
    for (const id of ['reproductiveRelevant', 'pregnancy', 'womens']) {
      const question = QUESTIONNAIRE_QUESTIONS.find(item => item.id === id);
      expect(question?.optional).toBe(true);
      expect(canAdvance(question, {})).toBe(true);
    }
  });

  it('offers Not applicable, Prefer not to say, and Skip on the sensitive questions', () => {
    const values = (id: string) =>
      QUESTIONNAIRE_QUESTIONS.find(item => item.id === id)?.options.map(option => option.value);
    expect(values('reproductiveRelevant')).toEqual(['yes', 'not_applicable', 'prefer_not_to_say', 'skip']);
    expect(values('pregnancy')).toEqual(['yes', 'no', 'not_sure', 'prefer_not_to_say', 'skip']);
    expect(values('womens')).toEqual(['vata', 'pitta', 'kapha', 'prefer_not_to_say', 'skip']);
  });

  it('never asks about or decides relevance from gender', () => {
    for (const question of QUESTIONNAIRE_QUESTIONS) {
      const text = [question.prompt.en, ...question.options.map(option => option.label.en)].join(' ');
      expect(text).not.toMatch(/\b(gender|male|female|man|woman|women|men|sex)\b/i);
    }
  });

  it('finds the first unanswered required question and ignores the optional ones', () => {
    expect(firstUnansweredRequiredIndex({ mental: 'vata' })).toBe(0);
    expect(firstUnansweredRequiredIndex({ skin: 'vata', body: 'vata', mental: 'vata' })).toBe(2);
    expect(
      firstUnansweredRequiredIndex({ skin: 'vata', body: 'vata', hair: 'vata', mental: 'vata' }),
    ).toBe(-1);
  });

  it('preserves answers independently of language labels', () => {
    const answers = { skin: 'pitta' as const };
    expect(localize(QUESTIONNAIRE_QUESTIONS[0].prompt, 'en')).toMatch(/skin/i);
    expect(localize(QUESTIONNAIRE_QUESTIONS[0].prompt, 'si')).toContain('සම');
    expect(answers.skin).toBe('pitta');
    expect(formatProgress('en', 2, 5)).toBe('Question 2 of 5');
    expect(formatProgress('si', 2, 5)).toBe('ප්‍රශ්නය 2 / 5');
  });

  it('does not invent a Dosha when answers are mixed or skipped', () => {
    const mixed = scoreQuestionnaire({
      skin: 'vata',
      body: 'pitta',
      hair: 'kapha',
      reproductiveRelevant: 'skip',
      mental: 'vata',
    });
    expect(mixed.skippedWomens).toBe(true);
    expect(mixed.tendency).toBeNull();

    const clear = buildQuestionnaireResult({ ...GENERAL_VATA, reproductiveRelevant: 'skip' });
    expect(clear.tendency).toBe('vata');
    expect(clear.isModelPrediction).toBe(false);
    expect(clear.guidance?.name).toBe('Vata');

    const sinhala = buildQuestionnaireResult({ ...GENERAL_VATA, reproductiveRelevant: 'skip' }, 'si');
    expect(sinhala.tendency).toBe('vata');
    expect(sinhala.counts).toEqual(clear.counts);
    expect(sinhala.guidance?.name).toBe('වාත');
  });
});

describe('conditional reproductive-health questions', () => {
  it('hides the follow-ups until the user says the topics are relevant', () => {
    const general = ['skin', 'body', 'hair', 'reproductiveRelevant', 'mental'];
    expect(visibleQuestions({}).map(item => item.id)).toEqual(general);
    for (const value of ['not_applicable', 'prefer_not_to_say', 'skip'] as const) {
      expect(visibleQuestions({ reproductiveRelevant: value }).map(item => item.id)).toEqual(general);
    }
    expect(visibleQuestions({ reproductiveRelevant: 'yes' }).map(item => item.id)).toEqual([
      'skin',
      'body',
      'hair',
      'reproductiveRelevant',
      'pregnancy',
      'womens',
      'mental',
    ]);
    expect(getCategoryIndex('mental', {})).toBe(4);
    expect(getCategoryIndex('mental', { reproductiveRelevant: 'yes' })).toBe(6);
  });

  it('user who marks the topics Not applicable (e.g. a male user): same score, pregnancy unknown, caution shown', () => {
    const result = buildQuestionnaireResult({ ...GENERAL_VATA, reproductiveRelevant: 'not_applicable' });
    expect(result.tendency).toBe('vata');
    expect(result.counts).toEqual(scoreQuestionnaire(GENERAL_VATA).counts);
    expect(result.pregnancy).toBe('unknown');
    expect(herbIds({ ...GENERAL_VATA, reproductiveRelevant: 'not_applicable' })).toContain('ashwagandha');
    expect(result.pregnancyCautionHerbIds).toEqual(['ashwagandha']);
    expect(result.withheldHerbs).toEqual([]);
  });

  it('user for whom the topics are relevant and who is not pregnant: routine answer counts, no pregnancy caution', () => {
    const answers: QuestionnaireAnswers = {
      skin: 'vata',
      body: 'vata',
      hair: 'pitta',
      reproductiveRelevant: 'yes',
      pregnancy: 'no',
      womens: 'vata',
      mental: 'kapha',
    };
    const result = buildQuestionnaireResult(answers);
    expect(result.scored).toBe(5);
    expect(result.skippedWomens).toBe(false);
    expect(result.tendency).toBe('vata');
    expect(result.pregnancy).toBe('not_pregnant');
    expect(result.pregnancyCautionHerbIds).toEqual([]);
    expect(herbIds(answers)).toContain('ashwagandha');
  });

  it('pregnant or possibly pregnant user: herbs with a pregnancy caution are withheld, not silently listed', () => {
    for (const pregnancy of ['yes', 'not_sure'] as const) {
      const answers: QuestionnaireAnswers = { ...GENERAL_VATA, reproductiveRelevant: 'yes', pregnancy };
      const result = buildQuestionnaireResult(answers);
      expect(result.pregnancy).toBe('pregnant_or_possible');
      expect(result.tendency).toBe('vata');
      expect(herbIds(answers)).not.toContain('ashwagandha');
      expect(result.withheldHerbs.map(herb => herb.id)).toEqual(['ashwagandha']);
      expect(result.guidance?.herbs.length).toBeGreaterThan(0);
    }
  });

  it('user who skips or prefers not to say: unknown is never treated as "not pregnant"', () => {
    const variants: QuestionnaireAnswers[] = [
      { reproductiveRelevant: 'prefer_not_to_say' },
      { reproductiveRelevant: 'skip' },
      {},
      { reproductiveRelevant: 'yes', pregnancy: 'prefer_not_to_say' },
      { reproductiveRelevant: 'yes', pregnancy: 'skip' },
      { reproductiveRelevant: 'yes' },
    ];
    for (const extra of variants) {
      const answers = { ...GENERAL_VATA, ...extra };
      expect(pregnancyInfo(answers)).toBe('unknown');
      const result = buildQuestionnaireResult(answers);
      expect(result.pregnancyCautionHerbIds).toEqual(['ashwagandha']);
      expect(result.counts).toEqual(scoreQuestionnaire(GENERAL_VATA).counts);
      expect(result.tendency).toBe('vata');
    }
  });

  it('skipping the routine question does not lower or change the general score', () => {
    for (const womens of ['skip', 'prefer_not_to_say'] as const) {
      const result = scoreQuestionnaire({ ...GENERAL_VATA, reproductiveRelevant: 'yes', womens });
      expect(result).toEqual(scoreQuestionnaire(GENERAL_VATA));
    }
  });

  it('ignores follow-up answers once the user changes the relevance answer away from yes', () => {
    const answers: QuestionnaireAnswers = {
      skin: 'vata',
      body: 'pitta',
      hair: 'pitta',
      reproductiveRelevant: 'not_applicable',
      pregnancy: 'yes',
      womens: 'vata',
      mental: 'vata',
    };
    const result = buildQuestionnaireResult(answers);
    expect(result.scored).toBe(4);
    expect(result.counts).toEqual({ vata: 2, pitta: 2, kapha: 0 });
    expect(result.tendency).toBeNull();
    expect(result.pregnancy).toBe('unknown');
    expect(answers.womens).toBe('vata');
  });

  it('Kapha guidance also flags Ashwagandha; Pitta guidance has no pregnancy-caution herb', () => {
    const kapha = buildQuestionnaireResult({ skin: 'kapha', body: 'kapha', hair: 'kapha', mental: 'kapha' });
    expect(kapha.pregnancyCautionHerbIds).toEqual(['ashwagandha']);
    const pitta = buildQuestionnaireResult({ skin: 'pitta', body: 'pitta', hair: 'pitta', mental: 'pitta' });
    expect(pitta.pregnancyCautionHerbIds).toEqual([]);
    expect(pitta.withheldHerbs).toEqual([]);
  });
});
