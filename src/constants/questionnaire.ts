import type { Language } from '../i18n/types';

/** Questionnaire content follows the app-wide language; UI copy lives in `i18n/translations`. */
export type QuestionnaireLang = Language;
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
  { id: 'skin', emoji: '🌿', label: { en: 'Skin', si: "සම" } },
  { id: 'body', emoji: '🧍', label: { en: 'Body', si: "ශරීරය" } },
  { id: 'hair', emoji: '💇', label: { en: 'Hair', si: "කෙස්" } },
  { id: 'womens', emoji: '🌸', label: { en: "Women's Health", si: "කාන්තා සෞඛ්‍යය" } },
  { id: 'mental', emoji: '🧘', label: { en: 'Mental Well-being', si: "මානසික යහපැවැත්ම" } },
];

export const QUESTIONNAIRE_QUESTIONS: QuestionnaireQuestion[] = [
  {
    id: 'skin',
    category: 'skin',
    prompt: {
      en: 'How does your skin usually feel?',
      si: "ඔබේ සම සාමාන්‍යයෙන් දැනෙන්නේ කෙසේද?",
    },
    options: [
      { value: 'vata', label: { en: 'Dry or tight', si: "වියළි හෝ තදව ඇත" } },
      { value: 'pitta', label: { en: 'Warm, sensitive, or easily red', si: "උණුසුම්, සංවේදී, හෝ ඉක්මනින් රතු වේ" } },
      { value: 'kapha', label: { en: 'Oily or thick', si: "තෙල් සහිත හෝ ඝන" } },
    ],
  },
  {
    id: 'body',
    category: 'body',
    prompt: {
      en: 'How does your body usually feel through the day?',
      si: "දවස පුරා ඔබේ ශරීරය සාමාන්‍යයෙන් දැනෙන්නේ කෙසේද?",
    },
    options: [
      { value: 'vata', label: { en: 'Light, cool, or easily unsettled', si: "සැහැල්ලු, සිසිල්, හෝ ඉක්මනින් අස්ථාවර" } },
      { value: 'pitta', label: { en: 'Warm, hungry, or easily overheated', si: "උණුසුම්, බඩගිනි, හෝ ඉක්මනින් රත් වේ" } },
      { value: 'kapha', label: { en: 'Steady, heavy, or slow to start', si: "ස්ථිර, බර, හෝ ආරම්භ කිරීමට ප්‍රමාද" } },
    ],
  },
  {
    id: 'hair',
    category: 'hair',
    prompt: {
      en: 'What best describes your hair?',
      si: "ඔබේ කෙස හොඳින් විස්තර කරන්නේ කුමක්ද?",
    },
    options: [
      { value: 'vata', label: { en: 'Dry or frizzy', si: "වියළි හෝ රළු" } },
      { value: 'pitta', label: { en: 'Fine or easily affected by heat', si: "සිහින් හෝ උණුසුමෙන් ඉක්මනින් බලපායි" } },
      { value: 'kapha', label: { en: 'Thick or oily', si: "ඝන හෝ තෙල් සහිත" } },
    ],
  },
  {
    id: 'womens',
    category: 'womens',
    optional: true,
    prompt: {
      en: 'Optional: would you like women self-care tips? Skip if this is not applicable.',
      si: "විකල්පයි: කාන්තා ස්වයං-රැකවරණ ඉඟි අවශ්‍යද? අදාළ නැතිනම් මඟ හරින්න.",
    },
    options: [
      { value: 'skip', label: { en: 'Not applicable / skip', si: "අදාළ නැත / මඟ හරින්න" } },
      { value: 'vata', label: { en: 'I prefer calming, warming routines', si: "සන්සුන්, උණුසුම් චර්යාවන් කැමතියි" } },
      { value: 'pitta', label: { en: 'I prefer cooling, gentle routines', si: "සිසිල්, මෘදු චර්යාවන් කැමතියි" } },
      { value: 'kapha', label: { en: 'I prefer light, energising routines', si: "සැහැල්ලු, ශක්තිය දෙන චර්යාවන් කැමතියි" } },
    ],
  },
  {
    id: 'mental',
    category: 'mental',
    prompt: {
      en: 'How does your mind most often feel?',
      si: "ඔබේ සිත බොහෝ විට දැනෙන්නේ කෙසේද?",
    },
    options: [
      { value: 'vata', label: { en: 'Restless or worried', si: "නොසන්සුන් හෝ කනස්සල්ලෙන්" } },
      { value: 'pitta', label: { en: 'Intense or impatient', si: "තීව්‍ර හෝ ඉවසීම අඩු" } },
      { value: 'kapha', label: { en: 'Slow to start or low motivation', si: "ආරම්භ කිරීමට ප්‍රමාද හෝ උනන්දුව අඩු" } },
    ],
  },
];
