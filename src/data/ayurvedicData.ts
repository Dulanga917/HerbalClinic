// src/data/ayurvedicData.ts
// Sri Lankan Ayurvedic Treatment Data
// Categories: Skin, Body, Hair, Women, Mental

export type Category = 'skin' | 'body' | 'hair' | 'women' | 'mental';
export type Language = 'en' | 'si';

export interface Question {
  id:      string;
  en:      string;
  si:      string;
  options: { en: string; si: string; value: string }[];
}

export interface CategoryInfo {
  id:       Category;
  emoji:    string;
  en:       string;
  si:       string;
  color:    string;
  questions: Question[];
}

// ── Category definitions ──────────────────────────────────────
export const CATEGORIES: CategoryInfo[] = [
  {
    id:    'skin',
    emoji: '✨',
    en:    'Skin Conditions',
    si:    'සම රෝග',
    color: '#16a34a',
    questions: [
      {
        id: 'skin_type',
        en: 'What is your skin type?',
        si: 'ඔබේ සම වර්ගය කුමක්ද?',
        options: [
          { en:'Oily',       si:'තෙල් සහිත',    value:'oily'    },
          { en:'Dry',        si:'වියළි',         value:'dry'     },
          { en:'Combination',si:'මිශ්‍ර',         value:'combo'   },
          { en:'Normal',     si:'සාමාන්‍ය',       value:'normal'  },
        ],
      },
      {
        id: 'skin_problem',
        en: 'What is your main skin problem?',
        si: 'ඔබේ ප්‍රධාන සම ගැටලුව කුමක්ද?',
        options: [
          { en:'Acne / Pimples',  si:'කුරුලෑ',         value:'acne'    },
          { en:'Dark spots',      si:'කළු පැල්ලම්',     value:'spots'   },
          { en:'Rashes / Eczema', si:'රෑන / ගෙඩි',      value:'rash'    },
          { en:'Dryness / Itching',si:'වියළිබව',        value:'dry'     },
        ],
      },
      {
        id: 'skin_duration',
        en: 'How long have you had this problem?',
        si: 'මෙම ගැටලුව කොපමණ කාලයක් තිස්සේ ඇත්ද?',
        options: [
          { en:'Less than 1 week', si:'සතියකට අඩු',    value:'new'     },
          { en:'1-4 weeks',        si:'සති 1-4',        value:'month'   },
          { en:'1-6 months',       si:'මාස 1-6',        value:'months'  },
          { en:'More than 6 months',si:'මාස 6+',        value:'chronic' },
        ],
      },
    ],
  },
  {
    id:    'body',
    emoji: '💪',
    en:    'Body Conditions',
    si:    'ශරීර රෝග',
    color: '#2563eb',
    questions: [
      {
        id: 'body_area',
        en: 'Which area is affected?',
        si: 'බලපෑමට ලක් වූ ප්‍රදේශය කුමක්ද?',
        options: [
          { en:'Joints / Knees', si:'සන්ධි / දනහිස',  value:'joints'  },
          { en:'Stomach / Digestion',si:'බඩ / ජීර්ණය', value:'digestion'},
          { en:'Back pain',      si:'පිට වේදනාව',      value:'back'    },
          { en:'Whole body',     si:'මුළු ශරීරය',       value:'body'    },
        ],
      },
      {
        id: 'body_symptom',
        en: 'What symptoms do you have?',
        si: 'ඔබට ඇති රෝග ලක්ෂණ මොනවාද?',
        options: [
          { en:'Pain / Swelling',  si:'වේදනාව / ඉදිමීම',  value:'pain'   },
          { en:'Weakness / Fatigue',si:'දුර්වලතාව',        value:'weak'   },
          { en:'Bloating / Gas',   si:'බඩ ඉදිමීම',        value:'bloat'  },
          { en:'Constipation',     si:'මලබද්ධය',           value:'const'  },
        ],
      },
      {
        id: 'body_diet',
        en: 'How is your diet?',
        si: 'ඔබේ ආහාර රටාව කෙසේද?',
        options: [
          { en:'Spicy / Oily food', si:'කුළුබඩු / තෙල් ආහාර', value:'spicy' },
          { en:'Healthy / Balanced',si:'සෞඛ්‍ය සම්පන්න',       value:'good'  },
          { en:'Irregular meals',   si:'අක්‍රමවත් ආහාර',       value:'irreg' },
          { en:'Skip meals often',  si:'නිතර ආහාර මඟ හරිනවා',  value:'skip'  },
        ],
      },
    ],
  },
  {
    id:    'hair',
    emoji: '💆',
    en:    'Hair & Scalp',
    si:    'හිසකෙස් & හිස සම',
    color: '#7c3aed',
    questions: [
      {
        id: 'hair_problem',
        en: 'What is your main hair problem?',
        si: 'ඔබේ ප්‍රධාන හිසකෙස් ගැටලුව කුමක්ද?',
        options: [
          { en:'Hair fall / Thinning', si:'හිසකෙස් ගැලවීම',  value:'fall'    },
          { en:'Dandruff',             si:'හිස කැක්කුම',      value:'dandruff'},
          { en:'Premature greying',    si:'කලින් ඉදිමීම',     value:'grey'    },
          { en:'Dry / Rough hair',     si:'වියළි හිසකෙස්',    value:'dry'     },
        ],
      },
      {
        id: 'hair_scalp',
        en: 'How is your scalp condition?',
        si: 'ඔබේ හිස සම තත්වය කෙසේද?',
        options: [
          { en:'Oily scalp',    si:'තෙල් සහිත',     value:'oily'   },
          { en:'Dry / Itchy',   si:'වියළි / කැසිල්ල', value:'dry'    },
          { en:'Normal',        si:'සාමාන්‍ය',        value:'normal' },
          { en:'Flaky scalp',   si:'කොට ගැලවෙන',     value:'flaky'  },
        ],
      },
      {
        id: 'hair_duration',
        en: 'How long have you had this issue?',
        si: 'මෙම ගැටලුව කොපමණ කාලයකින්ද?',
        options: [
          { en:'Recent (< 1 month)', si:'මෑත (මාසයකට අඩු)', value:'recent'  },
          { en:'Few months',         si:'මාස කිහිපයක්',      value:'months'  },
          { en:'Over a year',        si:'අවුරුද්දකට වැඩි',   value:'year'    },
          { en:'Since childhood',    si:'ළමා කාලයේ සිට',     value:'always'  },
        ],
      },
    ],
  },
  {
    id:    'women',
    emoji: '🌸',
    en:    "Women's Health",
    si:    'කාන්තා සෞඛ්‍යය',
    color: '#db2777',
    questions: [
      {
        id: 'women_issue',
        en: 'What is your main concern?',
        si: 'ඔබේ ප්‍රධාන ගැටලුව කුමක්ද?',
        options: [
          { en:'Irregular periods',   si:'අක්‍රමවත් ඔසප්',    value:'period'  },
          { en:'Period pain / Cramps',si:'ඔසප් වේදනාව',       value:'cramps'  },
          { en:'Hormonal imbalance',  si:'හෝමෝන අසමතුලිතතාව', value:'hormone' },
          { en:'Skin during periods', si:'ඔසප් සමයේ සම',      value:'skin'    },
        ],
      },
      {
        id: 'women_age',
        en: 'What is your age group?',
        si: 'ඔබේ වයස් කාණ්ඩය කුමක්ද?',
        options: [
          { en:'13-19 years', si:'අවු. 13-19', value:'teen'   },
          { en:'20-30 years', si:'අවු. 20-30', value:'young'  },
          { en:'31-45 years', si:'අවු. 31-45', value:'mid'    },
          { en:'45+ years',   si:'අවු. 45+',   value:'mature' },
        ],
      },
      {
        id: 'women_lifestyle',
        en: 'How is your lifestyle?',
        si: 'ඔබේ ජීවන රටාව කෙසේද?',
        options: [
          { en:'Very busy / Stressed',  si:'ඉතා කාර්යබහුල',   value:'stress' },
          { en:'Mostly sedentary',      si:'ශාරීරික ක්‍රියා අඩු', value:'sit'  },
          { en:'Active / Exercise',     si:'ක්‍රියාශීලී',        value:'active' },
          { en:'Irregular sleep',       si:'නිද්‍රා ගැටලු',      value:'sleep'  },
        ],
      },
    ],
  },
  {
    id:    'mental',
    emoji: '🧘',
    en:    'Mental Wellness',
    si:    'මානසික සෞඛ්‍යය',
    color: '#0891b2',
    questions: [
      {
        id: 'mental_issue',
        en: 'What are you experiencing?',
        si: 'ඔබ අත්විඳින ගැටලුව කුමක්ද?',
        options: [
          { en:'Stress / Anxiety',  si:'ආතතිය',          value:'stress'  },
          { en:'Poor sleep',        si:'නිදා ගැනීමේ ගැටලු', value:'sleep'   },
          { en:'Low energy / Tired',si:'අඩු ශක්තිය',      value:'energy'  },
          { en:'Low mood / Sad',    si:'දුක / බලාපොරොත්තු රහිත', value:'mood' },
        ],
      },
      {
        id: 'mental_trigger',
        en: 'What triggers it most?',
        si: 'වඩාත් ම ඇති කරන්නේ කුමක්ද?',
        options: [
          { en:'Work pressure',    si:'රැකියා පීඩනය',    value:'work'   },
          { en:'Family / Personal',si:'පවුල් ගැටලු',     value:'family' },
          { en:'Health concerns',  si:'සෞඛ්‍ය කනස්සල්ල', value:'health' },
          { en:'No specific reason',si:'නිශ්චිත හේතුවක් නැත', value:'none' },
        ],
      },
      {
        id: 'mental_sleep',
        en: 'How many hours do you sleep?',
        si: 'ඔබ දිනකට කොපමණ කාලයක් නිදා ගනිද?',
        options: [
          { en:'Less than 5 hours', si:'පැය 5ට අඩු',  value:'low'    },
          { en:'5-6 hours',         si:'පැය 5-6',      value:'fair'   },
          { en:'7-8 hours',         si:'පැය 7-8',      value:'good'   },
          { en:'More than 8 hours', si:'පැය 8+',       value:'excess' },
        ],
      },
    ],
  },
];
