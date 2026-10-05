import { describe, expect, it } from '@jest/globals';
import {
  QUESTIONNAIRE_CATEGORIES,
  QUESTIONNAIRE_COPY,
  QUESTIONNAIRE_QUESTIONS,
} from '../src/constants/questionnaire';
import {
  buildQuestionnaireResult,
  canAdvance,
  formatProgress,
  getQuestionAt,
  localize,
  scoreQuestionnaire,
} from '../src/utils/questionnaireLogic';

describe('Ayurvedic Treatment questionnaire', () => {
  it('includes the five thesis categories', () => {
    expect(QUESTIONNAIRE_CATEGORIES.map(item => item.id)).toEqual([
      'skin',
      'body',
      'hair',
      'womens',
      'mental',
    ]);
    expect(QUESTIONNAIRE_QUESTIONS).toHaveLength(5);
  });

  it('has English and Sinhala labels for copy, questions, and answers', () => {
    expect(QUESTIONNAIRE_COPY.title.en).toBe('Ayurvedic Treatment');
    expect(QUESTIONNAIRE_COPY.title.si).toContain('ආයුර්වේද');
    expect(QUESTIONNAIRE_COPY.disclaimer.en).toMatch(/not a medical diagnosis/i);
    expect(QUESTIONNAIRE_COPY.disclaimer.si).toContain('රෝග විනිශ්චයක් නොවේ');

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

  it('blocks Next on a required unanswered question and allows the optional womens question', () => {
    const skin = getQuestionAt(0);
    const womens = QUESTIONNAIRE_QUESTIONS.find(item => item.id === 'womens');
    expect(canAdvance(skin, {})).toBe(false);
    expect(canAdvance(skin, { skin: 'vata' })).toBe(true);
    expect(canAdvance(womens, {})).toBe(true);
    expect(canAdvance(womens, { womens: 'skip' })).toBe(true);
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
      womens: 'skip',
      mental: 'vata',
    });
    expect(mixed.skippedWomens).toBe(true);
    expect(mixed.tendency).toBeNull();

    const clear = buildQuestionnaireResult({
      skin: 'vata',
      body: 'vata',
      hair: 'vata',
      womens: 'skip',
      mental: 'pitta',
    });
    expect(clear.tendency).toBe('vata');
    expect(clear.isModelPrediction).toBe(false);
    expect(clear.guidance?.name).toBe('Vata');
  });
});
