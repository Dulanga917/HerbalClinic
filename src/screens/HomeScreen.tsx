
import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, Animated,
  TouchableOpacity, ImageBackground, Dimensions,
} from 'react-native';
import C from '../styles/colors';
import { FadeIn, SlideInLeft, SlideInRight, AnimatedButton } from '../components/Animations';
import FloatingLeaves from '../components/FloatingLeaves';
import { Dosha } from '../data/appData';

const BG_IMAGE = require('../assets/home_bg.jpg');
const { width } = Dimensions.get('window');

type FullScreen = 'login' | 'home' | 'skinAnalysis' | 'meditation' | 'herbs' | 'stress' | 'aiChat' | 'aiSkin' | 'aiHerbs' | 'ayurvedic';

interface Props {
  username: string;
  dosha: Dosha;
  onNav: (s: FullScreen) => void;
  onLogout: () => void;
}

const NAV_TABS_EN = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'herbs', label: 'Herbs', icon: '🌿' },
  { key: 'aiChat', label: 'AI Chat', icon: '🤖' },
  { key: 'meditation', label: 'Calm', icon: '🧘' },
  { key: 'stress', label: 'Stress', icon: '📊' },
];
const NAV_TABS_SI = [
  { key: 'home', label: 'මුල් පිටුව', icon: '🏠' },
  { key: 'herbs', label: 'ඖෂධ', icon: '🌿' },
  { key: 'aiChat', label: 'AI චැට්', icon: '🤖' },
  { key: 'meditation', label: 'සමාධි', icon: '🧘' },
  { key: 'stress', label: 'ආතතිය', icon: '📊' },
];

export default function HomeScreen({ username, dosha, onNav, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const L = (en: string, si: string) => lang === 'si' ? si : en;
  const NAV_TABS = lang === 'si' ? NAV_TABS_SI : NAV_TABS_EN;

  const doshaColor =
    dosha === 'Pitta' ? C.pitta :
      dosha === 'Vata' ? C.vata :
        dosha === 'Kapha' ? C.kapha : C.accent;

  const headerY = useRef(new Animated.Value(-80)).current;
  const headerOp = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerY, { toValue: 0, speed: 12, bounciness: 8, useNativeDriver: true }),
      Animated.timing(headerOp, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, speed: 10, bounciness: 6, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleNav = (screen: FullScreen) => {
    setActiveTab(screen);
    if (screen !== 'home') onNav(screen);
  };

  const quickActions = [
    { label: L('Skin\nAnalysis', 'සම\nවිශ්ලේෂණය'), emoji: '🔬', screen: 'skinAnalysis' as FullScreen, color: '#1e3a5f' },
    { label: L('AI\nSkin Scan', 'AI\nසම ස්කෑන්'), emoji: '📸', screen: 'aiSkin' as FullScreen, color: '#1a1035' },
    { label: L('SL\nAyurveda', 'ශ්‍රී ලං\nආයුර්වේද'), emoji: '🇱🇰', screen: 'ayurvedic' as FullScreen, color: '#0d1f12' },
    { label: L('AI\nHerbs', 'AI\nඖෂධ'), emoji: '🌱', screen: 'aiHerbs' as FullScreen, color: '#0d2a1a' },
  ];

  const featureCards = [
    {
      label: L('AI Herb Advisor', 'AI ඖෂධ උපදේශක'),
      sub: L('Personalised herbal remedies for your dosha', 'ඔබේ දෝෂයට අනුව පුද්ගලික ඖෂධ පැළෑටි'),
      emoji: '🤖',
      screen: 'aiHerbs' as FullScreen,
      gradient: ['#0d2a1a', '#1a3a28'],
      accent: '#4ade80',
    },
    {
      label: L('AI Skin Scan', 'AI සම ස්කෑන්'),
      sub: L('Photo-based skin condition analysis', 'ඡායාරූප පදනම් සම තත්ත්ව විශ්ලේෂණය'),
      emoji: '📸',
      screen: 'aiSkin' as FullScreen,
      gradient: ['#1a1035', '#2a1a55'],
      accent: '#a78bfa',
    },
    {
      label: L('AI Chat', 'AI චැට්'),
      sub: L('Ask anything about Ayurvedic skin care', 'ආයුර්වේද සම ආරක්ෂණය ගැන ඕනෑම දෙයක් අසන්න'),
      emoji: '💬',
      screen: 'aiChat' as FullScreen,
      gradient: ['#1e1035', '#2d1560'],
      accent: '#60a5fa',
    },
  ];

  const wellnessItems = [
    { label: L('Meditation', 'භාවනාව'), sub: L('Breathe & relax', 'හුස්ම ගන්න සහ විවේක ගන්න'), emoji: '🧘', screen: 'meditation' as FullScreen, color: '#a78bfa' },
    { label: L('Stress Tracker', 'ආතතිය පාලනය'), sub: L('Track your mood', 'ඔබේ මනෝභාවය නිරීක්ෂණය'), emoji: '📊', screen: 'stress' as FullScreen, color: '#fb923c' },
    { label: L('Herb Library', 'ඖෂධ පුස්තකාලය'), sub: L('Natural remedies', 'ස්වාභාවික ප්‍රතිකාර'), emoji: '🌿', screen: 'herbs' as FullScreen, color: '#4ade80' },
    { label: L('Ayurveda', 'ශ්‍රී ලං ආයුර්වේද'), sub: L('Traditional healing', 'සාම්ප්‍රදායික චිකිත්සාව'), emoji: '🏥', screen: 'ayurvedic' as FullScreen, color: '#f59e0b' },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ImageBackground source={BG_IMAGE} style={styles.bgImage} resizeMode="cover">
        {/* Gradient overlay — deeper at bottom for nav bar */}
        <View style={styles.overlayTop} />
        <View style={styles.overlayBottom} />

        <FloatingLeaves />

        <SafeAreaView style={styles.safe}>
          {/* ── Header ── */}
          <Animated.View style={[styles.header, { opacity: headerOp, transform: [{ translateY: headerY }] }]}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>{username?.charAt(0)?.toUpperCase() || 'U'}</Text>
              </View>
              <View>
                <Text style={styles.greetText}>{L('Good day 👋', 'සුභ දිනයක් 👋')}</Text>
                <Text style={styles.nameText}>{username}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.langToggle}
                onPress={() => setLang(l => l === 'en' ? 'si' : 'en')}
                activeOpacity={0.75}
              >
                <Text style={styles.langFlag}>{lang === 'en' ? '🇱🇰' : '🇬🇧'}</Text>
                <Text style={styles.langToggleTxt}>{lang === 'en' ? 'සිං' : 'EN'}</Text>
              </TouchableOpacity>
              <AnimatedButton onPress={onLogout} color="rgba(255,255,255,0.07)" style={styles.logoutBtn}>
                <Text style={styles.logoutTxt}>⎋ {L('Logout', 'පිටවීම')}</Text>
              </AnimatedButton>
            </View>
          </Animated.View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Dosha Banner ── */}
            <SlideInLeft delay={150}>
              <TouchableOpacity
                onPress={() => onNav('skinAnalysis')}
                activeOpacity={0.85}
                style={[styles.doshaBanner, { borderColor: doshaColor + '55' }]}
              >
                <View style={[styles.doshaGlow, { backgroundColor: doshaColor + '22' }]} />
                <View style={[styles.doshaIconWrap, { backgroundColor: doshaColor + '30' }]}>
                  <Text style={styles.doshaEmoji}>{dosha ? '✨' : '🔍'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.doshaTitle, { color: doshaColor }]}>
                    {dosha ? L(`Your Dosha: ${dosha}`, `ඔබේ දෝෂය: ${dosha}`) : L('Discover Your Dosha', 'ඔබේ දෝෂය සොයන්න')}
                  </Text>
                  <Text style={styles.doshaSub}>
                    {dosha === 'Vata' ? L('Dry & sensitive — focus on hydration & grounding', 'වියළි සහ සංවේදී — ජලාපවහනය සහ පාදක කිරීම') :
                      dosha === 'Pitta' ? L('Sensitive & reactive — focus on cooling & calm', 'සංවේදී සහ ප්‍රතික්‍රියාශීලී — සිසිල් කිරීම සහ සන්සුන්') :
                        dosha === 'Kapha' ? L('Oily & congested — focus on cleansing & energy', 'තෙල් සහිත — පිරිසිදු කිරීම සහ ශක්තිය') :
                          L('Tap to take the skin analysis quiz', 'සම විශ්ලේෂණ ප්‍රශ්නාවලිය සඳහා තට්ටු කරන්න')}
                  </Text>
                </View>
                <Text style={[styles.chevron, { color: doshaColor }]}>›</Text>
              </TouchableOpacity>
            </SlideInLeft>

            {/* ── Quick Action Row ── */}
            <FadeIn delay={200}>
              <Text style={styles.sectionLabel}>⚡ {L('Quick Actions', 'ඉක්මන් ක්‍රියා')}</Text>
            </FadeIn>
            <Animated.View style={[styles.quickRow, { transform: [{ scale: cardScale }] }]}>
              {quickActions.map((q, i) => (
                <SlideInLeft key={q.screen} delay={220 + i * 60}>
                  <TouchableOpacity
                    onPress={() => onNav(q.screen)}
                    activeOpacity={0.8}
                    style={[styles.quickCard, { backgroundColor: q.color }]}
                  >
                    <Text style={styles.quickEmoji}>{q.emoji}</Text>
                    <Text style={styles.quickLabel}>{q.label}</Text>
                  </TouchableOpacity>
                </SlideInLeft>
              ))}
            </Animated.View>

            {/* ── AI Features ── */}
            <FadeIn delay={320}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>🤖 {L('AI-Powered Features', 'AI බලයෙන් ක්‍රියා කරන විශේෂාංග')}</Text>
                <View style={styles.geminiBadge}>
                  <Text style={styles.geminiBadgeTxt}>Gemini</Text>
                </View>
              </View>
            </FadeIn>

            <View style={styles.featureList}>
              {featureCards.map((f, i) => (
                <SlideInLeft key={f.screen} delay={360 + i * 80}>
                  <TouchableOpacity
                    onPress={() => onNav(f.screen)}
                    activeOpacity={0.85}
                    style={[styles.featureCard, { backgroundColor: f.gradient[0], borderColor: f.accent + '40' }]}
                  >
                    {/* Accent glow blob */}
                    <View style={[styles.featureGlow, { backgroundColor: f.accent + '18' }]} />
                    <View style={[styles.featureIconWrap, { backgroundColor: f.accent + '25' }]}>
                      <Text style={styles.featureEmoji}>{f.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.featureLabel, { color: f.accent }]}>{f.label}</Text>
                      <Text style={styles.featureSub}>{f.sub}</Text>
                    </View>
                    <View style={[styles.featureArrow, { backgroundColor: f.accent + '20', borderColor: f.accent + '40' }]}>
                      <Text style={[styles.featureArrowTxt, { color: f.accent }]}>›</Text>
                    </View>
                  </TouchableOpacity>
                </SlideInLeft>
              ))}
            </View>

            {/* ── Wellness Tools ── */}
            <FadeIn delay={560}>
              <Text style={styles.sectionLabel}>🌿 {L('Wellness Tools', 'සුවතා මෙවලම්')}</Text>
            </FadeIn>

            <View style={styles.wellnessGrid}>
              {wellnessItems.map((w, i) => {
                const Wrap = i % 2 === 0 ? SlideInLeft : SlideInRight;
                return (
                  <Wrap key={w.screen} delay={580 + i * 70}>
                    <TouchableOpacity
                      onPress={() => onNav(w.screen)}
                      activeOpacity={0.85}
                      style={[styles.wellnessCard, { borderColor: w.color + '40' }]}
                    >
                      <View style={[styles.wellnessIconBg, { backgroundColor: w.color + '22' }]}>
                        <Text style={styles.wellnessEmoji}>{w.emoji}</Text>
                      </View>
                      <Text style={[styles.wellnessLabel, { color: w.color }]}>{w.label}</Text>
                      <Text style={styles.wellnessSub}>{w.sub}</Text>
                    </TouchableOpacity>
                  </Wrap>
                );
              })}
            </View>

            {/* ── Herb of Day Card ── */}
            <SlideInLeft delay={760}>
              <View style={styles.tipCard}>
                <View style={styles.tipTopRow}>
                  <Text style={styles.tipEmoji}>🌟</Text>
                  <Text style={styles.tipHead}>{L('Herb of the Day', 'අද දවසේ ඖෂධ පැළෑටිය')}</Text>
                </View>
                <Text style={styles.tipBody}>
                  <Text style={{ color: '#4ade80', fontWeight: '700' }}>{L('Turmeric — ', 'කහ — ')}</Text>
                  {L('Curcumin fights inflammation & brightens skin. Mix with raw honey for a calming Ayurvedic face pack. Apply 2× weekly.', 'කර්කුමින් දැවිල්ල සමඟ සටන් කරයි සහ සම දීප්තිමත් කරයි. සන්සුන් ආයුර්වේද මුහුණු ආලේපනයක් සඳහා අමු මී පැණි සමඟ මිශ්‍ර කරන්න. සතියට 2 වතාවක් යොදන්න.')}
                </Text>
              </View>
            </SlideInLeft>

            {/* ── Stress → Skin Card ── */}
            <SlideInRight delay={840}>
              <View style={styles.stressCard}>
                <Text style={styles.stressHead}>{L(' Stress → Skin Connection', ' ආතතිය → සම සම්බන්ධය')}</Text>
                <Text style={styles.stressTxt}>
                  {L('High cortisol worsens acne & dryness. Daily meditation lowers it by 23%.', 'අධික කෝටිසෝල් කුරුලෑ සහ වියළීම නරක අතට හැරේ. දිනපතා භාවනාව එය 23% කින් අඩු කරයි.')}
                </Text>
                <TouchableOpacity style={styles.meditateBtn} onPress={() => onNav('meditation')} activeOpacity={0.85}>
                  <Text style={styles.meditateBtnTxt}>{L('Start Meditating →', 'භාවනාව ආරම්භ කරන්න →')}</Text>
                </TouchableOpacity>
              </View>
            </SlideInRight>

            {/* Bottom padding for nav bar */}
            <View style={{ height: 90 }} />
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>

      {/* ── Bottom Navigation Bar (New Layer) ── */}
      <View style={styles.navBar}>
        <View style={styles.navBarInner}>
          {NAV_TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.navTab}
                onPress={() => handleNav(tab.key as FullScreen)}
                activeOpacity={0.75}
              >
                {isActive && <View style={styles.navActiveBlob} />}
                <Text style={[styles.navIcon, isActive && styles.navIconActive]}>{tab.icon}</Text>
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0414' },
  bgImage: { flex: 1, width: '100%', height: '100%' },
  overlayTop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,4,20,0.55)' },
  overlayBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 220, backgroundColor: 'rgba(5,2,14,0.75)' },
  safe: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // ── Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(74,222,128,0.25)', borderWidth: 1.5, borderColor: 'rgba(74,222,128,0.5)', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 18, fontWeight: '800', color: '#4ade80' },
  greetText: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 1 },
  nameText: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(245,158,11,0.12)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  langFlag: { fontSize: 14 },
  langToggleTxt: { fontSize: 12, color: '#f59e0b', fontWeight: '700' },
  logoutBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  logoutTxt: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '600' },

  // ── Dosha Banner
  doshaBanner: { marginHorizontal: 20, marginBottom: 22, borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, backgroundColor: 'rgba(10,5,30,0.82)', overflow: 'hidden' },
  doshaGlow: { position: 'absolute', width: 120, height: 120, borderRadius: 60, top: -30, right: -20 },
  doshaIconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  doshaEmoji: { fontSize: 26 },
  doshaTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  doshaSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 17 },
  chevron: { fontSize: 26, fontWeight: '300' },

  // ── Section headers
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginBottom: 12 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#ffffff', marginHorizontal: 20, marginBottom: 12 },
  geminiBadge: { backgroundColor: 'rgba(96,165,250,0.15)', borderWidth: 1, borderColor: 'rgba(96,165,250,0.3)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  geminiBadgeTxt: { fontSize: 11, color: '#60a5fa', fontWeight: '700' },

  // ── Quick Actions
  quickRow: { flexDirection: 'row', marginHorizontal: 20, gap: 10, marginBottom: 22 },
  quickCard: { flex: 1, aspectRatio: 0.85, borderRadius: 18, alignItems: 'center', justifyContent: 'center', padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  quickEmoji: { fontSize: 26, marginBottom: 6 },
  quickLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontWeight: '600', lineHeight: 14 },

  // ── AI Feature Cards
  featureList: { paddingHorizontal: 20, gap: 10, marginBottom: 22 },
  featureCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 16, gap: 14, borderWidth: 1, overflow: 'hidden' },
  featureGlow: { position: 'absolute', width: 100, height: 100, borderRadius: 50, right: -20, top: -20 },
  featureIconWrap: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  featureEmoji: { fontSize: 26 },
  featureLabel: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  featureSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 17 },
  featureArrow: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  featureArrowTxt: { fontSize: 20, fontWeight: '300', marginTop: -2 },

  // ── Wellness Grid
  wellnessGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 14, gap: 10, marginBottom: 20 },
  wellnessCard: { width: (width - 38) / 2, backgroundColor: 'rgba(10,5,30,0.80)', borderRadius: 20, padding: 18, borderWidth: 1, alignItems: 'flex-start' },
  wellnessIconBg: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  wellnessEmoji: { fontSize: 24 },
  wellnessLabel: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  wellnessSub: { fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 16 },

  // ── Tip & Stress Cards
  tipCard: { backgroundColor: 'rgba(10,30,12,0.88)', marginHorizontal: 20, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(74,222,128,0.22)', marginBottom: 12 },
  tipTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tipEmoji: { fontSize: 22 },
  tipHead: { fontSize: 14, fontWeight: '700', color: C.accent },
  tipBody: { fontSize: 13, color: 'rgba(255,255,255,0.48)', lineHeight: 20 },
  stressCard: { backgroundColor: 'rgba(20,8,40,0.88)', marginHorizontal: 20, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(167,139,250,0.22)', marginBottom: 12 },
  stressHead: { fontSize: 14, fontWeight: '700', color: '#c084fc', marginBottom: 6 },
  stressTxt: { fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 20, marginBottom: 14 },
  meditateBtn: { borderRadius: 12, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: C.accent },
  meditateBtnTxt: { color: C.accent, fontSize: 14, fontWeight: '800' },

  // ── Bottom Navigation Bar
  navBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 18, paddingHorizontal: 16, backgroundColor: 'transparent' },
  navBarInner: { flexDirection: 'row', backgroundColor: 'rgba(12,6,28,0.92)', borderRadius: 28, paddingVertical: 10, paddingHorizontal: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 4 },
  navTab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 20, position: 'relative' },
  navActiveBlob: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(74,222,128,0.12)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)' },
  navIcon: { fontSize: 20, marginBottom: 3, opacity: 0.5 },
  navIconActive: { opacity: 1 },
  navLabel: { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: '600' },
  navLabelActive: { color: '#4ade80', fontWeight: '700' },
});
