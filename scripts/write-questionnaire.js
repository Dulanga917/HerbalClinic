const fs = require('fs');
const path = require('path');

const si = {
  title: '\u0d86\u0dba\u0dd4\u0dbb\u0dca\u0dc0\u0dda\u0daf \u0db4\u0dca\u200d\u0dbb\u0dad\u0dd2\u0d9a\u0dcf\u0dbb',
  intro:
    '\u0d9a\u0dd9\u0da7\u0dd2 \u0dc3\u0dca\u0dc0\u0dba\u0d82-\u0dbb\u0dd0\u0d9a\u0dc0\u0dbb\u0dab \u0db4\u0dca\u200d\u0dbb\u0dc1\u0dca\u0db1\u0dcf\u0dc0\u0dbd\u0dd2\u0dba\u0d9a\u0da7 \u0db4\u0dd2\u0dc5\u0dd2\u0dad\u0dd4\u0dbb\u0dd4 \u0daf\u0dd9\u0db1\u0dca\u0db1. \u0db8\u0dd9\u0dba \u0dc3\u0dcf\u0db8\u0dcf\u0db1\u0dca\u200d\u0dba \u0d86\u0dba\u0dd4\u0dbb\u0dca\u0dc0\u0dda\u0daf \u0db8\u0d9c\u0db4\u0dd9\u0db1\u0dca\u0dc0\u0dd3\u0db8\u0d9a\u0dca \u0db8\u0dd2\u0dc3 \u0dc0\u0ddb\u0daf\u0dca\u200d\u0dba \u0dbb\u0ddd\u0d9c \u0dc0\u0dd2\u0db1\u0dd2\u0dc1\u0dca\u0da0\u0dba\u0d9a\u0dca \u0db1\u0ddc\u0dc0\u0dda.',
  progress: '\u0db4\u0dca\u200d\u0dbb\u0dc1\u0dca\u0db1\u0dba {current} / {total}',
  previous: '\u0db4\u0dd9\u0dbb',
  next: '\u0d8a\u0dc5\u0d9f',
  finish: '\u0db8\u0d9c\u0db4\u0dd9\u0db1\u0dca\u0dc0\u0dd3\u0db8 \u0db6\u0dbd\u0db1\u0dca\u0db1',
  restart: '\u0db1\u0dd0\u0dc0\u0dad \u0d86\u0dbb\u0db8\u0dca\u0db7 \u0d9a\u0dbb\u0db1\u0dca\u0db1',
  back: '\u0d86\u0db4\u0dc3\u0dd4',
  optional: '\u0dc0\u0dd2\u0d9a\u0dbd\u0dca\u0db4\u0dba\u0dd2 \u2014 \u0d85\u0daf\u0dcf\u0dc5 \u0db1\u0dd0\u0dad\u0dd2\u0db1\u0db8\u0dca \u0db8\u0d9f \u0dc4\u0dbb\u0dd2\u0db1\u0dca\u0db1',
  resultTitle:
    '\u0db4\u0dca\u200d\u0dbb\u0dc1\u0dca\u0db1\u0dcf\u0dc0\u0dbd\u0dd2 \u0db8\u0dad \u0db4\u0daf\u0db1\u0db8\u0dca \u0dc0\u0dd6 \u0dc3\u0dca\u0dc0\u0dba\u0d82-\u0dbb\u0dd0\u0d9a\u0dc0\u0dbb\u0dab \u0db8\u0d9c\u0db4\u0dd9\u0db1\u0dca\u0dc0\u0dd3\u0db8',
  resultNotModel:
    '\u0db8\u0dd9\u0dba \u0db4\u0dca\u200d\u0dbb\u0dc1\u0dca\u0db1\u0dcf\u0dc0\u0dbd\u0dd2\u0dba \u0db8\u0dad \u0db4\u0daf\u0db1\u0db8\u0dca \u0dc0\u0dd6 \u0d86\u0dba\u0dd4\u0dbb\u0dca\u0dc0\u0dda\u0daf \u0dc3\u0dca\u0dc0\u0dba\u0d82-\u0dbb\u0dd0\u0d9a\u0dc0\u0dbb\u0dab \u0db8\u0d9c\u0db4\u0dd9\u0db1\u0dca\u0dc0\u0dd3\u0db8\u0d9a\u0dd2. \u0db8\u0dd9\u0dba AI/\u0d86\u0d9a\u0dd8\u0dad\u0dd2 Dosha \u0d85\u0db1\u0dcf\u0dc0\u0dd0\u0d9a\u0dd2\u0dba\u0d9a\u0dca \u0db1\u0ddc\u0dc0\u0db1 \u0d85\u0dad\u0dbb \u0d86\u0d9a\u0dd8\u0dad\u0dd2 \u0dc0\u0dd2\u0dc1\u0dca\u0dc0\u0dcf\u0dc3\u0dba\u0d9a\u0dca \u0db1\u0dd0\u0dad.',
  tendency: '\u0d94\u0db6\u0dda \u0db4\u0dd2\u0dc5\u0dd2\u0dad\u0dd4\u0dbb\u0dd4 \u0db6\u0ddc\u0dc4\u0ddd \u0dc0\u0dd2\u0da7 {dosha} \u0d86\u0d9a\u0dcf\u0dbb\u0dba\u0dda \u0dc3\u0dca\u0dc0\u0dba\u0d82-\u0dbb\u0dd0\u0d9a\u0dc0\u0dbb\u0dab\u0dba\u0da7 \u0dc3\u0db8\u0dd3\u0db4\u0dba\u0dd2.',
  noTendency:
    '\u0d94\u0db6\u0dda \u0db4\u0dd2\u0dc5\u0dd2\u0dad\u0dd4\u0dbb\u0dd4 \u0d91\u0d9a\u0dca \u0dbb\u0da7\u0dcf\u0dc0\u0d9a\u0da7 \u0db4\u0dd0\u0dc4\u0dd0\u0daf\u0dd2\u0dbd\u0dd2\u0dc0 \u0db1\u0ddc\u0dba\u0dba\u0dd2. \u0db4\u0dc4\u0dad \u0dc3\u0dcf\u0db8\u0dcf\u0db1\u0dca\u200d\u0dba \u0d86\u0dba\u0dd4\u0dbb\u0dca\u0dc0\u0dda\u0daf \u0dc3\u0dca\u0dc0\u0dba\u0d82-\u0dbb\u0dd0\u0d9a\u0dc0\u0dbb\u0dab \u0db8\u0d9c\u0db4\u0dd9\u0db1\u0dca\u0dc0\u0dd3\u0db8 \u0db6\u0dbd\u0db1\u0dca\u0db1.',
  skincare: '\u0dc3\u0db8 \u0dbb\u0dd0\u0d9a\u0dc0\u0dbb\u0dab\u0dba',
  herbs: '\u0db1\u0dd2\u0dbb\u0dca\u0daf\u0dda\u0dc1\u0dd2\u0dad \u0d94\u0dc3\u0dd4',
  lifestyle: '\u0da2\u0dd3\u0dc0\u0db1 \u0dbb\u0da7\u0dcf\u0dc0 / \u0dc3\u0dca\u0dc0\u0dba\u0d82-\u0dbb\u0dd0\u0d9a\u0dc0\u0dbb\u0dab\u0dba',
  meditation: '\u0db7\u0dcf\u0dc0\u0db1\u0dcf\u0dc0',
  disclaimer:
    '\u0db8\u0dd9\u0db8 \u0db4\u0dca\u200d\u0dbb\u0dc1\u0dca\u0db1\u0dcf\u0dc0\u0dbd\u0dd2\u0dba \u0dc3\u0dcf\u0db8\u0dcf\u0db1\u0dca\u200d\u0dba \u0d86\u0dba\u0dd4\u0dbb\u0dca\u0dc0\u0dda\u0daf \u0dc3\u0dca\u0dc0\u0dba\u0d82-\u0dbb\u0dd0\u0d9a\u0dc0\u0dbb\u0dab \u0db8\u0d9c\u0db4\u0dd9\u0db1\u0dca\u0dc0\u0dd3\u0db8\u0d9a\u0dca \u0dbd\u0db6\u0dcf \u0daf\u0dd9\u0db1 \u0d85\u0dad\u0dbb \u0dc0\u0ddb\u0daf\u0dca\u200d\u0dba \u0dbb\u0ddd\u0d9c \u0dc0\u0dd2\u0db1\u0dd2\u0dc1\u0dca\u0da0\u0dba\u0d9a\u0dca \u0db1\u0ddc\u0dc0\u0dda. \u0dc0\u0ddb\u0daf\u0dca\u200d\u0dba \u0d9c\u0dd0\u0da7\u0dbd\u0dd4 \u0dc3\u0db3\u0dc4\u0dcf \u0dc3\u0dd4\u0daf\u0dd4\u0dc3\u0dd4\u0d9a\u0db8\u0dca \u0dbd\u0dad\u0dca \u0dc3\u0dde\u0d9b\u0dca\u200d\u0dba \u0dc0\u0dd8\u0dad\u0dca\u0dad\u0dd2\u0d9a\u0dba\u0dd9\u0d9a\u0dd4\u0d9c\u0dd9\u0db1\u0dca \u0d8b\u0db4\u0daf\u0dd9\u0dc3\u0dca \u0d9c\u0db1\u0dca\u0db1.',
  skin: '\u0dc3\u0db8',
  body: '\u0dc1\u0dbb\u0dd3\u0dbb\u0dba',
  hair: '\u0d9a\u0dd9\u0dc3\u0dca',
  womens: '\u0d9a\u0dcf\u0db1\u0dca\u0dad\u0dcf \u0dc3\u0dde\u0d9b\u0dca\u200d\u0dba\u0dba',
  mental: '\u0db8\u0dcf\u0db1\u0dc3\u0dd2\u0d9a \u0dba\u0dc4\u0db4\u0dd0\u0dc0\u0dd0\u0dad\u0dca\u0db8',
  qSkin: '\u0d94\u0db6\u0dda \u0dc3\u0db8 \u0dc3\u0dcf\u0db8\u0dcf\u0db1\u0dca\u200d\u0dba\u0dba\u0dd9\u0db1\u0dca \u0daf\u0dd0\u0db1\u0dd9\u0db1\u0dca\u0db1\u0dda \u0d9a\u0dd9\u0dc3\u0dda\u0daf?',
  qBody: '\u0daf\u0dc0\u0dc3 \u0db4\u0dd4\u0dbb\u0dcf \u0d94\u0db6\u0dda \u0dc1\u0dbb\u0dd3\u0dbb\u0dba \u0dc3\u0dcf\u0db8\u0dcf\u0db1\u0dca\u200d\u0dba\u0dba\u0dd9\u0db1\u0dca \u0daf\u0dd0\u0db1\u0dd9\u0db1\u0dca\u0db1\u0dda \u0d9a\u0dd9\u0dc3\u0dda\u0daf?',
  qHair: '\u0d94\u0db6\u0dda \u0d9a\u0dd9\u0dc3 \u0dc4\u0ddc\u0db3\u0dd2\u0db1\u0dca \u0dc0\u0dd2\u0dc3\u0dca\u0dad\u0dbb \u0d9a\u0dbb\u0db1\u0dca\u0db1\u0dda \u0d9a\u0dd4\u0db8\u0d9a\u0dca\u0daf?',
  qWomens:
    '\u0dc0\u0dd2\u0d9a\u0dbd\u0dca\u0db4\u0dba\u0dd2: \u0d9a\u0dcf\u0db1\u0dca\u0dad\u0dcf \u0dc3\u0dca\u0dc0\u0dba\u0d82-\u0dbb\u0dd0\u0d9a\u0dc0\u0dbb\u0dab \u0d89\u0d9f\u0dd2 \u0d85\u0dc0\u0dc1\u0dca\u200d\u0dba\u0daf? \u0d85\u0daf\u0dcf\u0dc5 \u0db1\u0dd0\u0dad\u0dd2\u0db1\u0db8\u0dca \u0db8\u0d9f \u0dc4\u0dbb\u0dd2\u0db1\u0dca\u0db1.',
  qMental: '\u0d94\u0db6\u0dda \u0dc3\u0dd2\u0dad \u0db6\u0ddc\u0dc4\u0ddd \u0dc0\u0dd2\u0da7 \u0daf\u0dd0\u0db1\u0dd9\u0db1\u0dca\u0db1\u0dda \u0d9a\u0dd9\u0dc3\u0dda\u0daf?',
  dryTight: '\u0dc0\u0dd2\u0dba\u0dc5\u0dd2 \u0dc4\u0ddd \u0dad\u0daf\u0dc0 \u0d87\u0dad',
  warmRed: '\u0d8b\u0dab\u0dd4\u0dc3\u0dd4\u0db8\u0dca, \u0dc3\u0d82\u0dc0\u0dda\u0daf\u0dd3, \u0dc4\u0ddd \u0d89\u0d9a\u0dca\u0db8\u0db1\u0dd2\u0db1\u0dca \u0dbb\u0dad\u0dd4 \u0dc0\u0dda',
  oilyThick: '\u0dad\u0dd9\u0dbd\u0dca \u0dc3\u0dc4\u0dd2\u0dad \u0dc4\u0ddd \u0d9d\u0db1',
  lightCool: '\u0dc3\u0dd0\u0dc4\u0dd0\u0dbd\u0dca\u0dbd\u0dd4, \u0dc3\u0dd2\u0dc3\u0dd2\u0dbd\u0dca, \u0dc4\u0ddd \u0d89\u0d9a\u0dca\u0db8\u0db1\u0dd2\u0db1\u0dca \u0d85\u0dc3\u0dca\u0dae\u0dcf\u0dc0\u0dbb',
  warmHungry: '\u0d8b\u0dab\u0dd4\u0dc3\u0dd4\u0db8\u0dca, \u0db6\u0da9\u0d9c\u0dd2\u0db1\u0dd2, \u0dc4\u0ddd \u0d89\u0d9a\u0dca\u0db8\u0db1\u0dd2\u0db1\u0dca \u0dbb\u0dad\u0dca \u0dc0\u0dda',
  steadyHeavy: '\u0dc3\u0dca\u0dae\u0dd2\u0dbb, \u0db6\u0dbb, \u0dc4\u0ddd \u0d86\u0dbb\u0db8\u0dca\u0db7 \u0d9a\u0dd2\u0dbb\u0dd3\u0db8\u0da7 \u0db4\u0dca\u200d\u0dbb\u0db8\u0dcf\u0daf',
  dryFrizzy: '\u0dc0\u0dd2\u0dba\u0dc5\u0dd2 \u0dc4\u0ddd \u0dbb\u0dc5\u0dd4',
  fineHeat: '\u0dc3\u0dd2\u0dc4\u0dd2\u0db1\u0dca \u0dc4\u0ddd \u0d8b\u0dab\u0dd4\u0dc3\u0dd4\u0db8\u0dd9\u0db1\u0dca \u0d89\u0d9a\u0dca\u0db8\u0db1\u0dd2\u0db1\u0dca \u0db6\u0dbd\u0db4\u0dcf\u0dba\u0dd2',
  thickOily: '\u0d9d\u0db1 \u0dc4\u0ddd \u0dad\u0dd9\u0dbd\u0dca \u0dc3\u0dc4\u0dd2\u0dad',
  skip: '\u0d85\u0daf\u0dcf\u0dc5 \u0db1\u0dd0\u0dad / \u0db8\u0d9f \u0dc4\u0dbb\u0dd2\u0db1\u0dca\u0db1',
  warmRoutine: '\u0dc3\u0db1\u0dca\u0dc3\u0dd4\u0db1\u0dca, \u0d8b\u0dab\u0dd4\u0dc3\u0dd4\u0db8\u0dca \u0da0\u0dbb\u0dca\u0dba\u0dcf\u0dc0\u0db1\u0dca \u0d9a\u0dd0\u0db8\u0dad\u0dd2\u0dba\u0dd2',
  coolRoutine: '\u0dc3\u0dd2\u0dc3\u0dd2\u0dbd\u0dca, \u0db8\u0dd8\u0daf\u0dd4 \u0da0\u0dbb\u0dca\u0dba\u0dcf\u0dc0\u0db1\u0dca \u0d9a\u0dd0\u0db8\u0dad\u0dd2\u0dba\u0dd2',
  lightRoutine: '\u0dc3\u0dd0\u0dc4\u0dd0\u0dbd\u0dca\u0dbd\u0dd4, \u0dc1\u0d9a\u0dca\u0dad\u0dd2\u0dba \u0daf\u0dd9\u0db1 \u0da0\u0dbb\u0dca\u0dba\u0dcf\u0dc0\u0db1\u0dca \u0d9a\u0dd0\u0db8\u0dad\u0dd2\u0dba\u0dd2',
  restless: '\u0db1\u0ddc\u0dc3\u0db1\u0dca\u0dc3\u0dd4\u0db1\u0dca \u0dc4\u0ddd \u0d9a\u0db1\u0dc3\u0dca\u0dc3\u0dbd\u0dca\u0dbd\u0dd9\u0db1\u0dca',
  intense: '\u0dad\u0dd3\u0dc0\u0dca\u200d\u0dbb \u0dc4\u0ddd \u0d89\u0dc0\u0dc3\u0dd3\u0db8 \u0d85\u0da9\u0dd4',
  slowStart: '\u0d86\u0dbb\u0db8\u0dca\u0db7 \u0d9a\u0dd2\u0dbb\u0dd3\u0db8\u0da7 \u0db4\u0dca\u200d\u0dbb\u0db8\u0dcf\u0daf \u0dc4\u0ddd \u0d8b\u0db1\u0db1\u0dca\u0daf\u0dd4\u0dc0 \u0d85\u0da9\u0dd4',
};

const file = `export type QuestionnaireLang = 'en' | 'si';
export type AnswerValue = 'vata' | 'pitta' | 'kapha' | 'skip';
export type QuestionnaireCategoryId = 'skin' | 'body' | 'hair' | 'womens' | 'mental';

export type LocalizedText = {
  en: string;
  si: string;
};

export type AnswerOption = {
  value: AnswerValue;
  label: LocalizedText;
};

export type QuestionnaireQuestion = {
  id: string;
  category: QuestionnaireCategoryId;
  optional?: boolean;
  prompt: LocalizedText;
  options: AnswerOption[];
};

export const QUESTIONNAIRE_CATEGORIES: {
  id: QuestionnaireCategoryId;
  emoji: string;
  label: LocalizedText;
}[] = [
  { id: 'skin', emoji: '🌿', label: { en: 'Skin', si: ${JSON.stringify(si.skin)} } },
  { id: 'body', emoji: '🧍', label: { en: 'Body', si: ${JSON.stringify(si.body)} } },
  { id: 'hair', emoji: '💇', label: { en: 'Hair', si: ${JSON.stringify(si.hair)} } },
  { id: 'womens', emoji: '🌸', label: { en: "Women's Health", si: ${JSON.stringify(si.womens)} } },
  { id: 'mental', emoji: '🧘', label: { en: 'Mental Well-being', si: ${JSON.stringify(si.mental)} } },
];

export const QUESTIONNAIRE_COPY = {
  title: { en: 'Ayurvedic Treatment', si: ${JSON.stringify(si.title)} },
  brand: { en: 'HerbalClinic', si: 'HerbalClinic' },
  intro: {
    en: 'Answer a short self-care questionnaire. This is general Ayurvedic guidance, not a medical diagnosis.',
    si: ${JSON.stringify(si.intro)},
  },
  progress: { en: 'Question {current} of {total}', si: ${JSON.stringify(si.progress)} },
  previous: { en: 'Previous', si: ${JSON.stringify(si.previous)} },
  next: { en: 'Next', si: ${JSON.stringify(si.next)} },
  finish: { en: 'See guidance', si: ${JSON.stringify(si.finish)} },
  restart: { en: 'Start again', si: ${JSON.stringify(si.restart)} },
  back: { en: 'Back', si: ${JSON.stringify(si.back)} },
  optional: { en: 'Optional — skip if not applicable', si: ${JSON.stringify(si.optional)} },
  resultTitle: {
    en: 'Questionnaire self-care guidance',
    si: ${JSON.stringify(si.resultTitle)},
  },
  resultNotModel: {
    en: 'This is questionnaire-based Ayurvedic self-care guidance. It is not an AI/model Dosha prediction and has no model confidence score.',
    si: ${JSON.stringify(si.resultNotModel)},
  },
  tendency: {
    en: 'Your answers most often align with {dosha}-type self-care.',
    si: ${JSON.stringify(si.tendency)},
  },
  noTendency: {
    en: 'Your answers do not point to one clear pattern. Here is general Ayurvedic self-care guidance.',
    si: ${JSON.stringify(si.noTendency)},
  },
  skincare: { en: 'Skincare', si: ${JSON.stringify(si.skincare)} },
  herbs: { en: 'Recommended herbs', si: ${JSON.stringify(si.herbs)} },
  lifestyle: { en: 'Lifestyle / self-care', si: ${JSON.stringify(si.lifestyle)} },
  meditation: { en: 'Meditation', si: ${JSON.stringify(si.meditation)} },
  disclaimer: {
    en: 'This questionnaire provides general Ayurvedic self-care guidance and is not a medical diagnosis. Consult a qualified healthcare professional for medical concerns.',
    si: ${JSON.stringify(si.disclaimer)},
  },
};

export const QUESTIONNAIRE_QUESTIONS: QuestionnaireQuestion[] = [
  {
    id: 'skin',
    category: 'skin',
    prompt: {
      en: 'How does your skin usually feel?',
      si: ${JSON.stringify(si.qSkin)},
    },
    options: [
      { value: 'vata', label: { en: 'Dry or tight', si: ${JSON.stringify(si.dryTight)} } },
      { value: 'pitta', label: { en: 'Warm, sensitive, or easily red', si: ${JSON.stringify(si.warmRed)} } },
      { value: 'kapha', label: { en: 'Oily or thick', si: ${JSON.stringify(si.oilyThick)} } },
    ],
  },
  {
    id: 'body',
    category: 'body',
    prompt: {
      en: 'How does your body usually feel through the day?',
      si: ${JSON.stringify(si.qBody)},
    },
    options: [
      { value: 'vata', label: { en: 'Light, cool, or easily unsettled', si: ${JSON.stringify(si.lightCool)} } },
      { value: 'pitta', label: { en: 'Warm, hungry, or easily overheated', si: ${JSON.stringify(si.warmHungry)} } },
      { value: 'kapha', label: { en: 'Steady, heavy, or slow to start', si: ${JSON.stringify(si.steadyHeavy)} } },
    ],
  },
  {
    id: 'hair',
    category: 'hair',
    prompt: {
      en: 'What best describes your hair?',
      si: ${JSON.stringify(si.qHair)},
    },
    options: [
      { value: 'vata', label: { en: 'Dry or frizzy', si: ${JSON.stringify(si.dryFrizzy)} } },
      { value: 'pitta', label: { en: 'Fine or easily affected by heat', si: ${JSON.stringify(si.fineHeat)} } },
      { value: 'kapha', label: { en: 'Thick or oily', si: ${JSON.stringify(si.thickOily)} } },
    ],
  },
  {
    id: 'womens',
    category: 'womens',
    optional: true,
    prompt: {
      en: 'Optional: would you like women self-care tips? Skip if this is not applicable.',
      si: ${JSON.stringify(si.qWomens)},
    },
    options: [
      { value: 'skip', label: { en: 'Not applicable / skip', si: ${JSON.stringify(si.skip)} } },
      { value: 'vata', label: { en: 'I prefer calming, warming routines', si: ${JSON.stringify(si.warmRoutine)} } },
      { value: 'pitta', label: { en: 'I prefer cooling, gentle routines', si: ${JSON.stringify(si.coolRoutine)} } },
      { value: 'kapha', label: { en: 'I prefer light, energising routines', si: ${JSON.stringify(si.lightRoutine)} } },
    ],
  },
  {
    id: 'mental',
    category: 'mental',
    prompt: {
      en: 'How does your mind most often feel?',
      si: ${JSON.stringify(si.qMental)},
    },
    options: [
      { value: 'vata', label: { en: 'Restless or worried', si: ${JSON.stringify(si.restless)} } },
      { value: 'pitta', label: { en: 'Intense or impatient', si: ${JSON.stringify(si.intense)} } },
      { value: 'kapha', label: { en: 'Slow to start or low motivation', si: ${JSON.stringify(si.slowStart)} } },
    ],
  },
];
`;

const out = path.join(__dirname, '..', 'src', 'constants', 'questionnaire.ts');
fs.writeFileSync(out, file, 'utf8');
console.log('wrote', out);
