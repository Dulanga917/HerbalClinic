// src/data/appData.ts

export type Dosha = 'Vata' | 'Pitta' | 'Kapha' | null;
export type Screen = 'splash' | 'login' | 'home' | 'skinAnalysis' | 'meditation' | 'herbs' | 'stress';

export interface MeditationSession {
  id: string; title: string; duration: string;
  dosha: string; description: string; emoji: string;
}
export interface HerbEntry {
  id: string; name: string; use: string; dosha: string; emoji: string; icon?: any;
}
export interface ProgressEntry {
  id: string; date: string; stressLevel: number; note: string;
}

export const MEDITATIONS: MeditationSession[] = [
  { id: '1', title: 'Cooling Moon Breath', duration: '10 min', dosha: 'Pitta', description: 'Sheetali pranayama to cool inflammation and calm frustration.', emoji: '🌙' },
  { id: '2', title: 'Grounding Earth Meditation', duration: '15 min', dosha: 'Vata', description: 'Root chakra meditation for anxiety relief and dry skin healing.', emoji: '🌍' },
  { id: '3', title: 'Energising Sun Breath', duration: '8 min', dosha: 'Kapha', description: 'Kapalbhati breathing to stimulate circulation and clear congestion.', emoji: '☀️' },
  { id: '4', title: 'Mindfulness Body Scan', duration: '20 min', dosha: 'All', description: 'Full body relaxation reducing cortisol for all skin types.', emoji: '🧘' },
  { id: '5', title: '5-Minute Stress Relief', duration: '5 min', dosha: 'All', description: 'Quick breathing reset for high-stress moments.', emoji: '💨' },
];

export const HERBS: HerbEntry[] = [
  { id: '1', name: 'Turmeric', use: 'Anti-inflammatory, acne & pigmentation', dosha: 'Pitta', emoji: '🌼' },
  { id: '2', name: 'Neem', use: 'Antimicrobial, oily & acne-prone skin', dosha: 'Kapha', emoji: '🌿' },
  { id: '3', name: 'Aloe Vera', use: 'Hydration, soothing dry & sensitive skin', dosha: 'Vata', emoji: '🪴' },
  { id: '4', name: 'Sandalwood', use: 'Cooling, redness & inflammation relief', dosha: 'Pitta', emoji: '🪵' },
  { id: '5', name: 'Ashwagandha', use: 'Stress relief, anti-aging & barrier repair', dosha: 'Vata', emoji: '🌱' },
  { id: '6', name: 'Manjistha', use: 'Blood purification, pigmentation & glow', dosha: 'All', emoji: '🌸' },
];

export const DOSHA_QUIZ = [
  { q: 'How does your skin usually feel?', q_si: 'ඔබේ සම සාමාන්‍යයෙන් කෙසේ දැනේද?', options: ['Dry & flaky', 'Oily & shiny', 'Normal but dull'], options_si: ['වියළි සහ කැබලි සහිත', 'තෙල් සහිත සහ බැබළෙන', 'සාමාන්‍ය නමුත් අඳුරු'], doshas: ['Vata', 'Pitta', 'Kapha'] },
  { q: 'How does stress affect you?', q_si: 'ආතතිය ඔබට කෙසේ බලපාද?', options: ['Anxiety & worry', 'Anger & irritability', 'Low energy & withdrawal'], options_si: ['කාංසාව සහ කරදර', 'කෝපය සහ කෝපකාරී බව', 'අඩු ශක්තිය සහ ඉවත්වීම'], doshas: ['Vata', 'Pitta', 'Kapha'] },
  { q: 'Your main skin concern?', q_si: 'ඔබේ ප්‍රධාන සම ගැටලුව?', options: ['Dryness & fine lines', 'Redness & inflammation', 'Acne & congestion'], options_si: ['වියළීම සහ සියුම් රේඛා', 'රතු පැහැය සහ දැවිල්ල', 'කුරුලෑ සහ අවහිරතා'], doshas: ['Vata', 'Pitta', 'Kapha'] },
];

export const DOSHA_DETAILS: Record<string, { skin: string; herb: string; meditation: string; skin_si: string; herb_si: string; meditation_si: string }> = {
  Vata: { skin: 'Dry, thin, prone to fine lines & flaking', herb: 'Aloe Vera + Ashwagandha for hydration & stress relief', meditation: 'Grounding Earth Meditation (15 min daily)', skin_si: 'වියළි, තුනී, සියුම් රේඛා සහ කැබලි වලට නැඹුරු', herb_si: 'කෝමාරිකා + අශ්වගන්ධ ජලාපවහනය සහ ආතතිය සමනය සඳහා', meditation_si: 'භූමි භාවනාව (දිනකට මිනිත්තු 15)' },
  Pitta: { skin: 'Sensitive, oily T-zone, prone to redness & acne', herb: 'Neem + Sandalwood for cooling & anti-inflammation', meditation: 'Cooling Moon Breath (10 min daily)', skin_si: 'සංවේදී, තෙල් සහිත T-කලාපය, රතු පැහැය සහ කුරුලෑ වලට නැඹුරු', herb_si: 'කොහොඹ + සඳුන් සිසිල් කිරීම සහ දැවිල්ල විරෝධී', meditation_si: 'සිසිල් සඳ හුස්ම ගැනීම (දිනකට මිනිත්තු 10)' },
  Kapha: { skin: 'Oily, thick, prone to congestion & dull complexion', herb: 'Turmeric + Neem for cleansing & brightening', meditation: 'Energising Sun Breath (8 min daily)', skin_si: 'තෙල් සහිත, ඝන, අවහිරතා සහ අඳුරු පැහැයට නැඹුරු', herb_si: 'කහ + කොහොඹ පිරිසිදු කිරීම සහ දීප්තිමත් කිරීම සඳහා', meditation_si: 'ශක්තිමත් සූර්ය හුස්ම ගැනීම (දිනකට මිනිත්තු 8)' },
};
