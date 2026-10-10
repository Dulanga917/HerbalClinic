import type { Language } from '../i18n/types';

/** Questionnaire content follows the app-wide language; UI copy lives in `i18n/translations`. */
export type QuestionnaireLang = Language;
export type DoshaAnswerValue = 'vata' | 'pitta' | 'kapha';
export type AnswerValue =
  | DoshaAnswerValue
  | 'yes'
  | 'no'
  | 'not_sure'
  | 'not_applicable'
  | 'prefer_not_to_say'
  | 'skip';
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
  /** Shown only when the referenced question has this answer; hidden answers are never scored. */
  showWhen?: { questionId: string; value: AnswerValue };
  prompt: LocalizedText;
  options: AnswerOption[];
};

const SKIP_OPTION: AnswerOption = { value: 'skip', label: { en: 'Skip', si: 'මඟ හරින්න' } };
const PREFER_NOT_TO_SAY_OPTION: AnswerOption = {
  value: 'prefer_not_to_say',
  label: { en: 'Prefer not to say', si: 'පැවසීමට අකමැතියි' },
};

/** Answered first; the reproductive-health follow-ups appear only after an explicit "yes". */
export const REPRODUCTIVE_RELEVANCE_QUESTION_ID = 'reproductiveRelevant';
export const PREGNANCY_QUESTION_ID = 'pregnancy';
const SHOW_IF_REPRODUCTIVE_RELEVANT = {
  questionId: REPRODUCTIVE_RELEVANCE_QUESTION_ID,
  value: 'yes',
} as const;

export const QUESTIONNAIRE_CATEGORIES: {
  id: QuestionnaireCategoryId;
  emoji: string;
  label: LocalizedText;
}[] = [
  { id: 'skin', emoji: '🌿', label: { en: 'Skin', si: "සම" } },
  { id: 'body', emoji: '🧍', label: { en: 'Body', si: "ශරීරය" } },
  { id: 'hair', emoji: '💇', label: { en: 'Hair', si: "කෙස්" } },
  { id: 'womens', emoji: '🌸', label: { en: 'Reproductive Health', si: 'ප්‍රජනක සෞඛ්‍යය' } },
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
    id: REPRODUCTIVE_RELEVANCE_QUESTION_ID,
    category: 'womens',
    optional: true,
    prompt: {
      en: 'Optional: are menstruation, pregnancy, fertility, or other reproductive-health topics relevant to your health needs? Choose only what applies to you.',
      si: 'විකල්පයි: ඔසප් වීම, ගර්භණීභාවය, සරුභාවය හෝ වෙනත් ප්‍රජනක සෞඛ්‍ය කරුණු ඔබේ සෞඛ්‍ය අවශ්‍යතාවලට අදාළද? ඔබට අදාළ දේ පමණක් තෝරන්න.',
    },
    options: [
      { value: 'yes', label: { en: 'Yes, show these questions', si: 'ඔව්, මෙම ප්‍රශ්න පෙන්වන්න' } },
      { value: 'not_applicable', label: { en: 'Not applicable', si: 'අදාළ නොවේ' } },
      PREFER_NOT_TO_SAY_OPTION,
      SKIP_OPTION,
    ],
  },
  {
    id: PREGNANCY_QUESTION_ID,
    category: 'womens',
    optional: true,
    showWhen: SHOW_IF_REPRODUCTIVE_RELEVANT,
    prompt: {
      en: 'Are you pregnant, possibly pregnant, trying to conceive, or breastfeeding? This is only used to show herb safety notes.',
      si: 'ඔබ ගර්භණීද, ගර්භණී විය හැකිද, දරුවෙකු ලැබීමට උත්සාහ කරනවාද, නැතහොත් මව්කිරි දෙනවාද? මෙය ඔසු පිළිබඳ ආරක්ෂිත සටහන් පෙන්වීමට පමණක් භාවිතා වේ.',
    },
    options: [
      { value: 'yes', label: { en: 'Yes', si: 'ඔව්' } },
      { value: 'no', label: { en: 'No', si: 'නැත' } },
      { value: 'not_sure', label: { en: 'Not sure', si: 'විශ්වාස නැත' } },
      PREFER_NOT_TO_SAY_OPTION,
      SKIP_OPTION,
    ],
  },
  {
    id: 'womens',
    category: 'womens',
    optional: true,
    showWhen: SHOW_IF_REPRODUCTIVE_RELEVANT,
    prompt: {
      en: 'Optional: which self-care routine do you prefer for menstrual or reproductive-health comfort?',
      si: 'විකල්පයි: ඔසප් හෝ ප්‍රජනක සෞඛ්‍ය සුවපහසුව සඳහා ඔබ කැමති ස්වයං-රැකවරණ චර්යාව කුමක්ද?',
    },
    options: [
      { value: 'vata', label: { en: 'I prefer calming, warming routines', si: "සන්සුන්, උණුසුම් චර්යාවන් කැමතියි" } },
      { value: 'pitta', label: { en: 'I prefer cooling, gentle routines', si: "සිසිල්, මෘදු චර්යාවන් කැමතියි" } },
      { value: 'kapha', label: { en: 'I prefer light, energising routines', si: "සැහැල්ලු, ශක්තිය දෙන චර්යාවන් කැමතියි" } },
      PREFER_NOT_TO_SAY_OPTION,
      SKIP_OPTION,
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
