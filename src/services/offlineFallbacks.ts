// src/services/offlineFallbacks.ts
// Offline fallback data when Gemini API is unavailable

export const FALLBACK_CHAT: Record<string, string> = {
  acne: 'For acne, try a Neem (කොහොඹ) face pack mixed with turmeric. Apply for 15 minutes and wash off. Neem is a powerful antibacterial herb used in Sri Lankan Ayurveda for centuries. Also consider drinking Iramusu (ඉරමුසු) tea daily to purify blood. Please consult a dermatologist if acne is severe.',
  dry: 'For dry skin, Aloe Vera (කෝමාරිකා) gel applied directly is wonderful. Mix with a few drops of sesame oil for deep hydration. Ashwagandha (අශ්වගන්ධ) taken internally also helps nourish dry, Vata-type skin from within.',
  redness: 'Sandalwood (සඳුන්) paste is the traditional Ayurvedic remedy for redness and inflammation. Mix sandalwood powder with rose water and apply as a cooling face pack. Gotukola (ගොටුකොළ) tea also helps reduce skin inflammation.',
  glow: 'For a natural glow, mix turmeric (කහ) with raw honey and apply as a face mask twice weekly. Manjistha (මංජිෂ්ඨා) is the best Ayurvedic herb for skin radiance — take it as a tea or supplement. Also eat plenty of papaya and amla fruits.',
  turmeric: 'Turmeric (කහ/Haridra) is one of the most powerful Ayurvedic herbs. Curcumin in turmeric fights inflammation, brightens skin, and has antibacterial properties. Mix with honey for a face pack, or drink golden milk (turmeric + warm milk) before bed.',
  stress: 'Stress directly affects your skin through elevated cortisol. Practice Sheetali Pranayama (cooling breath) for 5 minutes daily. Ashwagandha tea before bed reduces cortisol by up to 30%. Also try applying Brahmi (බ්‍රාහ්මී) oil to your scalp.',
  meditation: 'For skin health, try Sheetali Pranayama: curl your tongue, inhale through it for cooling effect. This calms Pitta dosha and reduces skin inflammation. Practice for 5-10 minutes daily, preferably in the morning.',
  default: 'I recommend starting with a daily Gotukola (ගොටුකොළ) tea — it\'s wonderful for overall skin health and is a staple in Sri Lankan Ayurveda. For specific concerns, try Neem for oily skin, Aloe Vera for dry skin, or Sandalwood for sensitive skin. Always consult a qualified Ayurvedic practitioner for persistent issues.',
};

export function getFallbackChat(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes('acne') || msg.includes('pimple') || msg.includes('කුරුලෑ')) return FALLBACK_CHAT.acne;
  if (msg.includes('dry') || msg.includes('වියළි')) return FALLBACK_CHAT.dry;
  if (msg.includes('red') || msg.includes('rash') || msg.includes('රතු')) return FALLBACK_CHAT.redness;
  if (msg.includes('glow') || msg.includes('bright') || msg.includes('දීප්ති')) return FALLBACK_CHAT.glow;
  if (msg.includes('turmeric') || msg.includes('කහ')) return FALLBACK_CHAT.turmeric;
  if (msg.includes('stress') || msg.includes('ආතතිය')) return FALLBACK_CHAT.stress;
  if (msg.includes('meditat') || msg.includes('breath') || msg.includes('භාවනා')) return FALLBACK_CHAT.meditation;
  return FALLBACK_CHAT.default;
}

export function getFallbackHerbs(dosha: string, concerns: string[]): string {
  const herbs: Record<string, string> = {
    Vata: `🌿 **1. Ashwagandha (අශ්වගන්ධ / Withania somnifera)**
Ideal for Vata dosha — reduces anxiety and nourishes dry skin from within. Take as warm milk decoction before bed.

🌿 **2. Aloe Vera (කෝමාරිකා / Aloe barbadensis)**
Deep hydration for Vata's dry, flaky skin. Apply fresh gel directly to face for 20 minutes. Best used in the morning.

🌿 **3. Sesame Oil (තල තෙල්)**
Warm sesame oil self-massage (Abhyanga) grounds Vata energy and deeply moisturizes skin. Massage before bath, 3x weekly.

🌿 **4. Shatavari (හතවාරිය / Asparagus racemosus)**
Nourishes and rejuvenates dry, aging skin. Take as powder mixed with warm milk. Best time: morning.`,

    Pitta: `🌿 **1. Sandalwood (සඳුන් / Santalum album)**
The #1 cooling herb for Pitta skin. Mix powder with rose water for a soothing face pack. Apply 2-3 times weekly.

🌿 **2. Neem (කොහොඹ / Azadirachta indica)**
Powerful antibacterial for Pitta's acne-prone skin. Boil leaves and use water as a face wash. Morning use recommended.

🌿 **3. Gotukola (ගොටුකොළ / Centella asiatica)**
Reduces inflammation and promotes healing. Drink as herbal tea 2x daily. Also apply crushed leaves topically.

🌿 **4. Manjistha (මංජිෂ්ඨා / Rubia cordifolia)**
Best blood purifier in Ayurveda — clears pigmentation and redness. Take as tea or capsule. Morning is ideal.`,

    Kapha: `🌿 **1. Turmeric (කහ / Curcuma longa)**
Fights Kapha congestion and brightens dull skin. Mix with honey for face pack, or drink golden milk daily.

🌿 **2. Neem (කොහොඹ / Azadirachta indica)**
Controls excess oil and prevents acne. Use neem water face wash daily. Also effective as steam facial.

🌿 **3. Triphala (ත්‍රිපලා)**
Detoxifies and stimulates sluggish Kapha digestion, which reflects in clearer skin. Take with warm water before bed.

🌿 **4. Tulsi (මාදුරුතලා / Ocimum sanctum)**
Purifies blood and clears skin congestion. Drink as morning tea. Also use tulsi-infused water as toner.`,
  };
  return herbs[dosha] || herbs.Pitta;
}

export function getFallbackTreatment(category: string, language: 'en' | 'si') {
  if (language === 'si') {
    return {
      diagnosis: 'ඔබේ රෝග ලක්ෂණ අනුව, මෙය සාමාන්‍ය සම ආබාධයකි. ශ්‍රී ලාංකේය ආයුර්වේද වෛද්‍ය විද්‍යාව අනුව මෙය ත්‍රිදෝෂ අසමතුලිතතාවයක් නිසා ඇති විය හැක. නිසි ප්‍රතිකාර මගින් සුව කළ හැකිය.',
      herbs: '🌿 කොහොඹ (Azadirachta indica) — බැක්ටීරියා විරෝධී, සම පිරිසිදු කරයි\n🌿 කහ (Curcuma longa) — දැවිල්ල අඩු කරයි, සම දීප්තිමත් කරයි\n🌿 ගොටුකොළ (Centella asiatica) — සම සුව කරයි, රුධිර සංසරණය වැඩි දියුණු කරයි\n🌿 ඉරමුසු (Hemidesmus indicus) — රුධිරය පිරිසිදු කරයි, සම රෝග සමනය කරයි',
      preparation: '1. කොහොඹ කොළ මිටක් සෝදා පිරිසිදු කරන්න\n2. කහ තේ හැන්දක් සමඟ මිශ්‍ර කරන්න\n3. ජලය කෝප්ප 2ක් එකතු කර විනාඩි 15 උතුරන්න\n4. සිසිල් වූ පසු පෙරා ගන්න\n5. දිනකට 2 වතාවක් පානය කරන්න',
      lifestyle: '• උදේ 6ට පෙර අවදි වන්න\n• දිනකට ජලය ලීටර් 2ක් පානය කරන්න\n• සවස 6ට පසු සැහැල්ලු ආහාර ගන්න\n• දිනපතා මිනිත්තු 15ක් භාවනා කරන්න',
      diet: '✅ ගන්න: ගොටුකොළ කොළ, පිපිඤ්ඤ, පප්පාසි, කොමඩු, බතල\n❌ වළකින්න: අධික මේද ආහාර, ක්ෂණික ආහාර, අධික සීනි, මත්පැන්',
      warning: '⚕️ දින 7කට වැඩි කාලයක් රෝග ලක්ෂණ පවතින්නේ නම් සුදුසුකම් ලත් ආයුර්වේද වෛද්‍යවරයෙකු හමුවන්න. මෙය සාම්ප්‍රදායික දැනුම පමණි.',
    };
  }
  return {
    diagnosis: 'Based on your symptoms, this appears to be a common condition related to dosha imbalance. In Sri Lankan Ayurvedic tradition (Deshiya Chikitsa), this is typically treated with a combination of herbal remedies and lifestyle changes.',
    herbs: '🌿 Kohomba/Neem (කොහොඹ) — Powerful antibacterial, purifies skin and blood\n🌿 Kaha/Turmeric (කහ) — Anti-inflammatory, brightens skin, fights infection\n🌿 Gotukola (ගොටුකොළ) — Promotes healing, improves circulation, rejuvenates skin\n🌿 Iramusu (ඉරමුසු) — Blood purifier, traditionally used for all skin conditions in Sri Lanka',
    preparation: '1. Wash a handful of fresh Neem leaves thoroughly\n2. Mix with 1 teaspoon of turmeric powder\n3. Add 2 cups of water and boil for 15 minutes\n4. Strain and let it cool to room temperature\n5. Drink twice daily — morning and evening before meals',
    lifestyle: '• Wake before 6 AM (Brahma Muhurta)\n• Drink 2 liters of water daily\n• Eat light meals after 6 PM\n• Practice 15 minutes of meditation daily\n• Apply coconut oil before bathing',
    diet: '✅ Eat: Gotukola leaves, cucumber, papaya, pumpkin, sweet potato, green gram\n❌ Avoid: Excess oily/fried food, fast food, excess sugar, alcohol, processed foods',
    warning: '⚕️ If symptoms persist for more than 7 days, please consult a qualified Ayurvedic physician (Vaidya). This is traditional knowledge for informational purposes only.',
  };
}

export function getFallbackSkinAnalysis() {
  return {
    conditions: 'Minor skin concerns detected including slight dryness and uneven tone. Overall skin health appears normal.',
    dosha: 'Pitta — Your skin shows signs of Pitta dominance with sensitivity and slight redness. Pitta skin needs cooling and soothing care.',
    severity: 'Mild',
    herbs: '1. Sandalwood (සඳුන්) — Mix with rose water for a cooling face pack\n2. Aloe Vera (කෝමාරිකා) — Apply fresh gel daily for hydration\n3. Turmeric (කහ) — Mix with honey for brightening mask 2x weekly',
    routine: '1. Morning: Wash with Neem water, apply Aloe Vera gel\n2. Day: Use coconut oil as natural moisturizer\n3. Night: Apply Sandalwood + rose water pack for 15 min',
  };
}
