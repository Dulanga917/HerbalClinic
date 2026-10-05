export type QuestionnaireLang = 'en' | 'si';
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

export const QUESTIONNAIRE_COPY = {
  title: { en: 'Ayurvedic Treatment', si: "ආයුර්වේද ප්‍රතිකාර" },
  brand: { en: 'HerbalClinic', si: 'HerbalClinic' },
  intro: {
    en: 'Answer a short self-care questionnaire. This is general Ayurvedic guidance, not a medical diagnosis.',
    si: "කෙටි ස්වයං-රැකවරණ ප්‍රශ්නාවලියකට පිළිතුරු දෙන්න. මෙය සාමාන්‍ය ආයුර්වේද මගපෙන්වීමක් මිස වෛද්‍ය රෝග විනිශ්චයක් නොවේ.",
  },
  progress: { en: 'Question {current} of {total}', si: "ප්‍රශ්නය {current} / {total}" },
  previous: { en: 'Previous', si: "පෙර" },
  next: { en: 'Next', si: "ඊළඟ" },
  finish: { en: 'See guidance', si: "මගපෙන්වීම බලන්න" },
  restart: { en: 'Start again', si: "නැවත ආරම්භ කරන්න" },
  back: { en: 'Back', si: "ආපසු" },
  optional: { en: 'Optional — skip if not applicable', si: "විකල්පයි — අදාළ නැතිනම් මඟ හරින්න" },
  resultTitle: {
    en: 'Questionnaire self-care guidance',
    si: "ප්‍රශ්නාවලි මත පදනම් වූ ස්වයං-රැකවරණ මගපෙන්වීම",
  },
  resultNotModel: {
    en: 'This is questionnaire-based Ayurvedic self-care guidance. It is not an AI/model Dosha prediction and has no model confidence score.',
    si: "මෙය ප්‍රශ්නාවලිය මත පදනම් වූ ආයුර්වේද ස්වයං-රැකවරණ මගපෙන්වීමකි. මෙය AI/ආකෘති Dosha අනාවැකියක් නොවන අතර ආකෘති විශ්වාසයක් නැත.",
  },
  tendency: {
    en: 'Your answers most often align with {dosha}-type self-care.',
    si: "ඔබේ පිළිතුරු බොහෝ විට {dosha} ආකාරයේ ස්වයං-රැකවරණයට සමීපයි.",
  },
  noTendency: {
    en: 'Your answers do not point to one clear pattern. Here is general Ayurvedic self-care guidance.',
    si: "ඔබේ පිළිතුරු එක් රටාවකට පැහැදිලිව නොයයි. පහත සාමාන්‍ය ආයුර්වේද ස්වයං-රැකවරණ මගපෙන්වීම බලන්න.",
  },
  generalLifestyleOne: {
    en: 'Warm water, regular sleep, and a simple herbal routine.',
    si: 'උණුසුම් ජලය, නිතිපතා නින්ද, සහ සරල ඔසු චර්යාවක්.',
  },
  generalLifestyleTwo: {
    en: 'Open the Herb Library or Meditation tabs for more self-care ideas.',
    si: 'තවත් ස්වයං-රැකවරණ අදහස් සඳහා Herb Library හෝ Meditation ටැබ් විවෘත කරන්න.',
  },
  skincare: { en: 'Skincare', si: "සම රැකවරණය" },
  herbs: { en: 'Recommended herbs', si: "නිර්දේශිත ඔසු" },
  lifestyle: { en: 'Lifestyle / self-care', si: "ජීවන රටාව / ස්වයං-රැකවරණය" },
  meditation: { en: 'Meditation', si: "භාවනාව" },
  disclaimer: {
    en: 'This questionnaire provides general Ayurvedic self-care guidance and is not a medical diagnosis. Consult a qualified healthcare professional for medical concerns.',
    si: "මෙම ප්‍රශ්නාවලිය සාමාන්‍ය ආයුර්වේද ස්වයං-රැකවරණ මගපෙන්වීමක් ලබා දෙන අතර වෛද්‍ය රෝග විනිශ්චයක් නොවේ. වෛද්‍ය ගැටලු සඳහා සුදුසුකම් ලත් සෞඛ්‍ය වෘත්තිකයෙකුගෙන් උපදෙස් ගන්න.",
  },
};

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
