import { DOSHAS, HERBS, MEDITATION_SESSIONS } from '../constants/ayurveda';
import type { TranslationKey } from './translations/en';
import { translate } from './translate';
import type { Language } from './types';

type HerbId = keyof typeof HERBS;
type DoshaId = keyof typeof DOSHAS;
type HerbRecord = (typeof HERBS)[HerbId];
type DoshaRecord = (typeof DOSHAS)[DoshaId];
type MeditationRecord = (typeof MEDITATION_SESSIONS)[number];

type HerbText = Pick<HerbRecord, 'benefits' | 'usage' | 'caution' | 'description'>;
type DoshaText = Pick<
  DoshaRecord,
  'skinType' | 'characteristics' | 'balancedSigns' | 'diet' | 'lifestyle'
>;
type MeditationText = Pick<
  MeditationRecord,
  'title' | 'subtitle' | 'duration' | 'level' | 'description' | 'steps' | 'benefits'
>;

// Sinhala text mirrors the English source in `constants/ayurveda.ts` item for item. Medical and
// safety meaning is kept as written in English; only the language changes.
const HERB_TEXT_SI: Record<HerbId, HerbText> = {
  turmeric: {
    benefits: ['ඉදිමුම අඩු කරයි', 'ප්‍රතිඔක්සිකාරක', 'සමට දීප්තියක් දෙයි', 'ක්ෂුද්‍රජීවී නාශක'],
    usage: 'කහ කුඩු තේ හැඳි 1ක් මී පැණි හෝ කිරි සමඟ මිශ්‍ර කරන්න. මිනිත්තු 15ක් ආලේප කර තබන්න.',
    caution: 'සම තාවකාලිකව කහ පැහැ විය හැක. පළමුව සමේ කුඩා කොටසක අත්හදා බලන්න.',
    description: 'සාම්ප්‍රදායික ආයුර්වේද සම රැකවරණ ආලේපවල භාවිතා වන කහ පැහැති අලයකි; එහි කර්කියුමින් අඩංගු වේ.',
  },
  neem: {
    benefits: ['ක්ෂුද්‍රජීවී නාශක', 'දිලීර නාශක', 'පිරිසිදු කරයි', 'කුරුලෑ අඩු කිරීමට උදවු වේ'],
    usage: 'නැවුම් කොහොඹ කොළ තලා හෝ කොහොඹ කුඩු පේස්ට් එකක් ලෙස සකසා, අදාළ ස්ථානවල ආලේප කරන්න.',
    caution: 'ප්‍රබල ඔසුවකි — නිසි ලෙස තනුක කරන්න. ඇස් අසල භාවිතා නොකරන්න.',
    description: 'තෙල් සහිත හෝ කැළැල් ඇතිවීමට නැඹුරු සම සඳහා ආයුර්වේදයේ සාම්ප්‍රදායිකව භාවිතා වන තිත්ත කොළයකි.',
  },
  aloeVera: {
    benefits: ['සමට ගැඹුරින් තෙතමනය දෙයි', 'සමනය කරයි', 'තුවාල සුව වීමට උදවු වේ', 'වයස්ගත වීමේ ලකුණු අඩු කරයි'],
    usage: 'කොළයෙන් නැවුම් ජෙල් ගෙන සමේ සෘජුවම ආලේප කර එලෙසම තබන්න.',
    caution: 'නැවුම් ජෙල් වඩාත් සුදුසුයි. සමහරුන්ට සංවේදී විය හැක — පළමුව කුඩා කොටසක අත්හදා බලන්න.',
    description:
      'මාංසල කොළ සහිත පැළෑටියකි; එහි කොළයේ ජෙල් වියළි හෝ කෝපයට පත් සම තෙත් කිරීමට සහ සමනය කිරීමට බහුලව භාවිතා වේ.',
  },
  sandalwood: {
    benefits: ['සිසිලස දෙයි', 'ඉදිමුම අඩු කරයි', 'සමට දීප්තියක් දෙයි', 'වයස්ගත වීමේ ලකුණු අඩු කරයි'],
    usage: 'සුදු හඳුන් කුඩු රෝස ජලය සමඟ මිශ්‍ර කර, මිනිත්තු 20ක් මුහුණු ආලේපයක් ලෙස තබන්න.',
    caution: 'පිරිසිදු සුදු හඳුන් පමණක් භාවිතා කරන්න — කෘත්‍රිම වර්ග වළකින්න.',
    description: 'සංවේදී සමට දීප්තියක් දෙන, සමනය කරන, පූජනීය සිසිලන ඔසුවකි.',
  },
  manjistha: {
    benefits: ['රුධිරය පිරිසිදු කරයි', 'සමේ අඳුරු ලප අඩු කිරීමට උදවු වේ', 'වසා පද්ධතිය පිරිසිදු කරයි', 'සමට දීප්තියක් දෙයි'],
    usage: 'අතිරේකයක් ලෙස ගන්න, නැතහොත් පේස්ට් එකක් ලෙස ආලේප කරන්න. අභ්‍යන්තරව ගැනීමෙන් වඩාත් හොඳින් ක්‍රියා කරයි.',
    caution: 'මුත්‍රා/දහඩිය මඳක් රතු පැහැ විය හැක — මෙය සාමාන්‍ය දෙයකි.',
    description: 'සමේ පැහැය සඳහා රුධිරය පිරිසිදු කරන ඔසුවක් ලෙස ආයුර්වේදයේ සාම්ප්‍රදායිකව විස්තර කෙරෙන මුලකි.',
  },
  licorice: {
    benefits: ['සමට දීප්තියක් දෙයි', 'සමේ අඳුරු ලප අඩු කිරීමට උදවු වේ', 'සමනය කරයි', 'ඉදිමුම අඩු කරයි'],
    usage: 'වැල්මී මුල් සාරය හෝ කුඩු කෝමාරිකා ජෙල් සමඟ මිශ්‍ර කර ආලේප කරන්න.',
    caution: 'උපදෙස් නොමැතිව දිගු කාලයක් ආහාරයට ගැනීමෙන් වළකින්න.',
    description: 'අසමාන සම් පැහැය සහ අඳුරු ලප සඳහා ආයුර්වේද සම රැකවරණයේ සාම්ප්‍රදායිකව භාවිතා වන පැණිරස මුලකි.',
  },
  ashwagandha: {
    benefits: ['ආතතියට ඔරොත්තු දීමට උදවු වේ', 'මානසික ආතතිය අඩු කිරීමට සහාය වේ', 'සමේ ප්‍රාණවත් බවට උදවු වේ'],
    usage:
      'සාම්ප්‍රදායිකව කුඩු හෝ තේ ලෙස ගනු ලැබේ. නිෂ්පාදනයේ උපදෙස් සහ සුදුසුකම් ලත් වෛද්‍යවරයෙකුගේ උපදෙස් අනුගමනය කරන්න.',
    caution: 'තොරතුරු සඳහා පමණි. වෛද්‍යවරයෙකු වෙනත් උපදෙසක් නොදෙන්නේ නම් ගර්භණී සමයේදී භාවිතා නොකරන්න.',
    description: 'ශරීරයේ ඔරොත්තු දීමේ හැකියාව සහ සමේ ප්‍රාණවත් බව සඳහා ස්වයං-රැකවරණ චර්යාවල භාවිතා වන ආයුර්වේද මුලකි.',
  },
  jojoba: {
    benefits: ['සම තෙත් කරයි', 'සමේ ආරක්ෂක ස්තරයට සහාය වේ', 'මෘදු තෙලකි'],
    usage: 'බිංදු කිහිපයක් අත්ල අතර උණුසුම් කර, තෙත් සමේ මෘදුව තද කරන්න.',
    caution: 'පළමුව සමේ කුඩා කොටසක අත්හදා බලන්න. මෙය ස්වයං-රැකවරණ තොරතුරක් මිස වෛද්‍ය ප්‍රතිකාරයක් නොවේ.',
    description: 'බර තෙල් ගතියක් ඉතිරි නොකර වියළි සම මෘදු කිරීමට භාවිතා කරන සැහැල්ලු ශාක තෙලකි.',
  },
};

const DOSHA_TEXT_SI: Record<DoshaId, DoshaText> = {
  vata: {
    skinType: 'වියළි සහ සියුම් සම',
    characteristics: [
      'වියළි, තුනී සම',
      'කුඩා සිදුරු',
      'කලින් වයසට යාමේ ලකුණු ඇතිවීමට නැඹුරුයි',
      'අසමතුලිත වූ විට අඳුරු පැහැයක්',
    ],
    balancedSigns: ['සියුම් දීප්තියක්', 'සමාන පැහැයක්', 'මෘදු ස්වභාවයක්'],
    diet: ['උණුසුම්, තෙල් සහිත ආහාර', 'පැණිරස පලතුරු', 'කිරි ආහාර', 'ඇට වර්ග සහ බීජ'],
    lifestyle: ['උණුසුම් තෙල් සම්බාහනය', 'සීතලෙන් සහ සුළඟින් වළකින්න', 'නිතිපතා එකම වේලාවට නින්ද'],
  },
  pitta: {
    skinType: 'සංවේදී සහ ඉක්මනින් ප්‍රතික්‍රියා කරන සම',
    characteristics: ['සංවේදී, ලා පැහැති සම', 'රතු වීමට නැඹුරුයි', 'ස්පර්ශයට උණුසුම්', 'මධ්‍යම ප්‍රමාණයේ සිදුරු'],
    balancedSigns: ['දීප්තිමත් පැහැයක්', 'පැහැදිලි සමක්', 'උණුසුම් දීප්තියක්'],
    diet: ['සිසිල්, පැණිරස ආහාර', 'කුරුම්බා වතුර', 'කොළ එළවළු', 'සැර සහ ඇඹුල් ආහාර වළකින්න'],
    lifestyle: ['අධික අව්වෙන් වළකින්න', 'සිසිල් පරිසර', 'උෂ්ණය අඩු කිරීමට භාවනාව'],
  },
  kapha: {
    skinType: 'තෙල් සහිත සහ ශක්තිමත් සම',
    characteristics: ['තෙල් සහිත, ඝන සම', 'විශාල සිදුරු', 'හොඳ ප්‍රත්‍යාස්ථතාවයක්', 'සිදුරු අවහිර වීමට නැඹුරුයි'],
    balancedSigns: ['දිලිසෙන දීප්තියක්', 'ඝන, නිරෝගී සමක්', 'ඉතා හොඳ ප්‍රත්‍යාස්ථතාවයක්'],
    diet: [
      'සැහැල්ලු, උණුසුම් ආහාර',
      'තිත්ත කොළ වර්ග',
      'පරිප්පු, මුං වැනි ධාන්‍ය',
      'කිරි ආහාර සහ පැණිරස දේ වළකින්න',
    ],
    lifestyle: ['නිතිපතා ව්‍යායාම', 'වියළි බුරුසුවකින් සම පිරිමැදීම', 'සිරුර උත්තේජනය කරන ප්‍රතිකාර'],
  },
};

const MEDITATION_TEXT_SI: Record<string, MeditationText> = {
  pranayama_basic: {
    title: 'ප්‍රාණායාම ශ්වසනය',
    subtitle: 'පිත නිසා ඇතිවන උණුසුම සන්සුන් කරන්න',
    duration: 'මිනිත්තු 10',
    level: 'ආරම්භක',
    description: 'දෝෂ සමබර කිරීමට සහ සමේ ඉදිමුම අඩු කිරීමට නාස්පුඩු මාරුවෙන් කරන ශ්වසන ක්‍රමය.',
    steps: [
      'කොඳු නාරටිය කෙළින් තබාගෙන සුවපහසුවෙන් වාඩි වන්න',
      'දකුණු නාස්පුඩුව වසා, වම් නාස්පුඩුවෙන් ගණන් 4ක් හුස්ම ගන්න',
      'ගණන් 4ක් හුස්ම රඳවා ගන්න',
      'වම් නාස්පුඩුව වසා, දකුණු නාස්පුඩුවෙන් ගණන් 4ක් හුස්ම පිට කරන්න',
      'මෙය 10 වතාවක් නැවත කරන්න',
    ],
    benefits: ['කෝටිසෝල් (ආතති හෝමෝනය) අඩු කරයි', 'දෝෂ සමබර කරයි', 'රුධිර සංසරණය වැඩි දියුණු කරයි', 'සමේ රතු පැහැය අඩු කරයි'],
  },
  body_scan: {
    title: 'ආයුර්වේද ශරීර නිරීක්ෂණ භාවනාව',
    subtitle: 'සම සුව වීමට ගැඹුරු ලිහිල් වීමක්',
    duration: 'මිනිත්තු 15',
    level: 'ආරම්භක',
    description: 'ආතති හෝමෝන අඩු කර සම අලුත් වීමට සහාය වන මඟපෙන්වන ලිහිල් වීමේ ක්‍රමයකි.',
    steps: [
      'සුවපහසුවෙන් වැතිර සිටින්න',
      'ඇස් වසා ස්වාභාවිකව හුස්ම ගන්න',
      'ශරීරයේ එක් එක් කොටස ගැන සිහිය යොමු කරන්න',
      'හිස් මුදුනේ සිට පාදයේ ඇඟිලි දක්වා ආතතිය ලිහිල් කරන්න',
      'මිනිත්තු 5ක් සාමකාමී සිහියෙන් විවේක ගන්න',
    ],
    benefits: ['කෝටිසෝල් අඩු කරයි', 'සුව වීමට උදවු වේ', 'ඉදිමුම අඩු කරයි', 'වඩා හොඳ නින්දක්'],
  },
  skin_affirmations: {
    title: 'සම සුවය සඳහා ධනාත්මක ප්‍රකාශ',
    subtitle: 'සිත, කය සහ සම අතර සම්බන්ධය',
    duration: 'මිනිත්තු 7',
    level: 'ආරම්භක',
    description: 'සිත සහ සම අතර සම්බන්ධය සුව කිරීමට සහ ආත්ම විශ්වාසය වැඩි කිරීමට ධනාත්මක ප්‍රකාශ.',
    steps: [
      'නිශ්ශබ්දව වාඩි වී ගැඹුරින් හුස්ම ගන්න',
      'නැවත නැවත කියන්න: "මගේ සම නිරෝගී සහ දීප්තිමත්"',
      'නැවත නැවත කියන්න: "මම මගේ සිරුර ආදරයෙන් පෝෂණය කරමි"',
      'රන්වන් ආලෝකයක් ඔබේ සම සුව කරන බව සිතින් මවාගන්න',
      'කෘතඥතාවයෙන් අවසන් කරන්න',
    ],
    benefits: ['ධනාත්මක සිතුවිලි', 'ආතතිය අඩු වීම', 'හෝමෝන සමතුලිතතාවය', 'තමන්ට ආදරය කිරීම'],
  },
  vata_grounding: {
    title: 'වාත සමබර කරන භාවනාව',
    subtitle: 'වියළි සම සඳහා පෘථිවි ශක්තිය',
    duration: 'මිනිත්තු 12',
    level: 'මධ්‍යම',
    description: 'වාත දෝෂය සමබර කිරීමට සහ සම තෙත් කිරීමට විශේෂයෙන් සැකසූ, පොළොවට සම්බන්ධ වීමේ භාවනාවකි.',
    steps: [
      'හැකි නම් බිම වාඩි වන්න',
      'පොළොව සමඟ ඇති සම්බන්ධය දැනෙන්නට ඉඩ දෙන්න',
      'සෙමින් සහ ගැඹුරින් හුස්ම ගන්න',
      'උණුසුම සහ තෙතමනය ගැන සිත යොමු කරන්න',
      'සම මෘදු වන බව සිතින් මවාගන්න',
    ],
    benefits: ['වාත ශක්තිය සන්සුන් කරයි', 'කනස්සල්ල අඩු කරයි', 'සමේ තෙතමනය වැඩි කරයි'],
  },
};

/** Herb name for the active language: "Turmeric" in English, "කහ" in Sinhala. */
export const herbDisplayName = (
  herb: Pick<HerbRecord, 'name' | 'sinhala'>,
  language: Language = 'en',
): string => (language === 'si' && herb.sinhala ? herb.sinhala : herb.name);

/** The herb's name in the other language, when one exists (shown as a secondary label). */
export const herbAlternateName = (
  herb: Pick<HerbRecord, 'name' | 'sinhala'>,
  language: Language,
): string | null => {
  const alternate = language === 'si' ? herb.name : herb.sinhala;
  return alternate && alternate !== herbDisplayName(herb, language) ? alternate : null;
};

export const localizeHerb = <T extends HerbRecord>(herb: T, language: Language): T => {
  const text = language === 'si' ? HERB_TEXT_SI[herb.id as HerbId] : undefined;
  return text ? { ...herb, ...text } : herb;
};

export const localizeDosha = <T extends DoshaRecord>(dosha: T, language: Language): T => {
  const text = language === 'si' ? DOSHA_TEXT_SI[dosha.id as DoshaId] : undefined;
  return text ? { ...dosha, ...text } : dosha;
};

export const localizeMeditation = <T extends MeditationRecord>(session: T, language: Language): T => {
  const text = language === 'si' ? MEDITATION_TEXT_SI[session.id] : undefined;
  return text ? { ...session, ...text } : session;
};

const DOSHA_KEYS: Record<string, TranslationKey> = {
  vata: 'dosha.vata',
  pitta: 'dosha.pitta',
  kapha: 'dosha.kapha',
};

/**
 * Display name for a stored or predicted Dosha label (e.g. "Vata-Pitta"). The stored label itself
 * is never changed; unknown parts are shown as they are.
 */
export const doshaName = (raw: string, language: Language): string =>
  raw
    .split('-')
    .map(part => {
      const key = DOSHA_KEYS[part.trim().toLowerCase()];
      return key ? translate(language, key) : part;
    })
    .join('-');

/** Dosha label for result headings: "Vata" in English, "වාත (Vata)" in Sinhala. */
export const doshaLabel = (raw: string, language: Language): string => {
  const name = doshaName(raw, language);
  return name === raw ? raw : `${name} (${raw})`;
};
