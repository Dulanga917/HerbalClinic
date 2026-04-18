
import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, Animated,
  TouchableOpacity, ImageBackground,
} from 'react-native';
import C from '../styles/colors';
import { FadeIn, SlideInLeft, SlideInRight, AnimatedButton } from '../components/Animations';
import FloatingLeaves from '../components/FloatingLeaves';
import { Dosha } from '../data/appData';


const BG_IMAGE = require('../assets/home_bg.jpg');

type FullScreen = 'login'|'home'|'skinAnalysis'|'meditation'|'herbs'|'stress'|'aiChat'|'aiSkin'|'aiHerbs';

interface Props {
  username: string;
  dosha:    Dosha;
  onNav:    (s: FullScreen) => void;
  onLogout: () => void;
}

export default function HomeScreen({ username, dosha, onNav, onLogout }: Props) {
  const doshaColor =
    dosha === 'Pitta' ? C.pitta :
    dosha === 'Vata'  ? C.vata  :
    dosha === 'Kapha' ? C.kapha : C.accent;

  const headerY  = useRef(new Animated.Value(-60)).current;
  const headerOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerY,  { toValue:0, speed:14, bounciness:8, useNativeDriver:true }),
      Animated.timing(headerOp, { toValue:1, duration:400, useNativeDriver:true }),
    ]).start();
  }, []);

  const tiles = [
    { label:'Skin Analysis',  sub:'Find your dosha',      emoji:'🔬', screen:'skinAnalysis' as FullScreen, side:'left', special: true  },
    { label:'Meditation',     sub:'Breathe & relax',      emoji:'🧘', screen:'meditation'   as FullScreen, side:'right', special: true },
    { label:'Herb Library',   sub:'Natural remedies',     emoji:'🌿', screen:'herbs'        as FullScreen, side:'left', special: true  },
    { label:'Stress Tracker', sub:'Track progress',       emoji:'📊', screen:'stress'       as FullScreen, side:'right', special: true },
    { label:'🇱🇰 SL Ayurveda', sub:'Traditional remedies', emoji:'🏥', screen:'ayurvedic'    as FullScreen, side:'right', special: true },
  ];

  const aiTiles = [
    { label:'AI Skin Scan',    sub:'Photo skin analysis', emoji:'📸', screen:'aiSkin'  as FullScreen, bg:'rgba(26,16,53,0.85)'  },
    { label:'AI Herb Advisor', sub:'Personalised herbs',  emoji:'🤖', screen:'aiHerbs' as FullScreen, bg:'rgba(13,31,18,0.85)'  },
    { label:'AI Chat',         sub:'Ask skin questions',  emoji:'💬', screen:'aiChat'  as FullScreen, bg:'rgba(30,13,53,0.85)'  },
  ];

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />


      <ImageBackground source={BG_IMAGE} style={styles.bgImage} resizeMode="cover">


        <View style={styles.overlay} />


        <FloatingLeaves />

        <SafeAreaView style={styles.safe}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

            {/* Header */}
            <Animated.View style={[styles.header, { opacity:headerOp, transform:[{ translateY:headerY }] }]}>
              <View>
                <Text style={[styles.greet, { color:'rgba(233, 229, 9, 0.87)' }]}>Welcome back {username}</Text>
                <Text style={styles.name}>{username}</Text>
              </View>
              <AnimatedButton onPress={onLogout} color="rgba(11, 11, 11, 0.77)" style={styles.logoutBtn}>
                <Text style={styles.logoutTxt}>Logout</Text>
              </AnimatedButton>
            </Animated.View>

            {/* Dosha Banner */}
            <SlideInLeft delay={150}>
              <TouchableOpacity
                onPress={() => onNav('skinAnalysis')}
                activeOpacity={0.85}
                style={[styles.doshaBanner, { borderColor:doshaColor }]}>
                <View style={[styles.doshaIconWrap, { backgroundColor:doshaColor + '33' }]}>
                  <Text style={styles.doshaEmoji}>{dosha ? '✨' : '🔍'}</Text>
                </View>
                <View style={{ flex:1 }}>
                  <Text style={[styles.doshaTitle, { color:doshaColor }]}>
                    {dosha ? `Your Dosha: ${dosha}` : 'Discover Your Dosha'}
                  </Text>
                  <Text style={styles.doshaSub}>
                    {dosha==='Vata'  ? 'Dry & sensitive — focus on hydration & grounding' :
                     dosha==='Pitta' ? 'Sensitive & reactive — focus on cooling & calm'   :
                     dosha==='Kapha' ? 'Oily & congested — focus on cleansing & energy'   :
                     'Tap to take the skin analysis quiz'}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </SlideInLeft>

            {/* AI Features */}
            <FadeIn delay={200}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🤖 AI-Powered Features</Text>
                <Text style={styles.sectionBadge}>Gemini</Text>
              </View>
            </FadeIn>

            <View style={styles.aiGrid}>
              {aiTiles.map((t, i) => (
                <SlideInLeft key={t.screen} delay={260 + i * 80}>
                  <TouchableOpacity
                    onPress={() => onNav(t.screen)}
                    activeOpacity={0.85}
                    style={[styles.aiTile, { backgroundColor:t.bg }]}>
                    <View style={styles.aiTileIconWrap}>
                      <Text style={styles.aiTileEmoji}>{t.emoji}</Text>
                    </View>
                    <View style={{ flex:1 }}>
                      <Text style={styles.aiTileLabel}>{t.label}</Text>
                      <Text style={styles.aiTileSub}>{t.sub}</Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                </SlideInLeft>
              ))}
            </View>

            {/* Wellness Tools */}
            <FadeIn delay={450}>
              <Text style={styles.wellnessTitle}>🌿 Wellness Tools</Text>
            </FadeIn>

            <View style={styles.grid}>
              {tiles.map((t, i) => {
                const Wrapper = t.side === 'left' ? SlideInLeft : SlideInRight;
                const isSpecial = (t as any).special;
                return (
                  <Wrapper key={t.screen} delay={500 + i * 80}>
                    <TouchableOpacity
                      onPress={() => onNav(t.screen)}
                      activeOpacity={0.85}
                      style={[styles.tile, isSpecial && styles.tileSpecial]}>
                      <Text style={styles.tileEmoji}>{t.emoji}</Text>
                      <Text style={[styles.tileLabel, isSpecial && styles.tileLabelSpecial]}>{t.label}</Text>
                      <Text style={styles.tileSub}>{t.sub}</Text>
                      {isSpecial && <Text style={styles.newBadge}>NEW</Text>}
                    </TouchableOpacity>
                  </Wrapper>
                );
              })}
            </View>

            {/* Herb of day */}
            <SlideInLeft delay={700}>
              <View style={styles.tipCard}>
                <View style={styles.tipRow}>
                  <Text style={styles.tipEmoji}>🌟</Text>
                  <View style={{ flex:1 }}>
                    <Text style={styles.tipHead}>Herb of the Day</Text>
                    <Text style={styles.tipBody}>
                      <Text style={{ color:C.text, fontWeight:'700' }}>Turmeric — </Text>
                      Curcumin fights inflammation. Mix with honey for a calming face pack.
                    </Text>
                  </View>
                </View>
              </View>
            </SlideInLeft>

            {/* Stress card */}
            <SlideInRight delay={780}>
              <View style={styles.stressCard}>
                <Text style={styles.stressHead}>🧠 Stress → Skin Connection</Text>
                <Text style={styles.stressTxt}>
                  High cortisol worsens acne & dryness. Daily meditation lowers it by 23%.
                </Text>
                <TouchableOpacity style={styles.meditateBtn} onPress={() => onNav('meditation')} activeOpacity={0.85}>
                  <Text style={styles.meditateBtnTxt}>Start Meditating →</Text>
                </TouchableOpacity>
              </View>
            </SlideInRight>

          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:         { flex:1 },
  bgImage:        { flex:1, width:'100%', height:'100%' },
  overlay:        { ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(8,4,20,0.60)' },
  safe:           { flex:1 },
  scrollContent:  { paddingBottom:40 },
  header:         { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingTop:16, paddingBottom:12 },
  greet:          { fontSize:13, color:'rgba(255,255,255,0.5)' },
  name:           { fontSize:24, fontWeight:'800', color:'#ffffff' },
  logoutBtn:      { paddingHorizontal:14, paddingVertical:8, borderRadius:12, borderWidth:1, borderColor:'rgba(255,255,255,0.12)' },
  logoutTxt:      { color:'rgba(255,255,255,0.5)', fontSize:13, fontWeight:'600' },
  doshaBanner:    { marginHorizontal:20, marginBottom:20, borderRadius:20, padding:16, flexDirection:'row', alignItems:'center', gap:14, borderWidth:1.5, backgroundColor:'rgba(10,5,30,0.82)' },
  doshaIconWrap:  { width:52, height:52, borderRadius:26, alignItems:'center', justifyContent:'center' },
  doshaEmoji:     { fontSize:26 },
  doshaTitle:     { fontSize:16, fontWeight:'700', marginBottom:3 },
  doshaSub:       { fontSize:12, color:'rgba(255,255,255,0.45)', lineHeight:18 },
  chevron:        { fontSize:22, color:'rgba(255,255,255,0.3)', fontWeight:'300' },
  sectionHeader:  { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginHorizontal:20, marginBottom:12 },
  sectionTitle:   { fontSize:15, fontWeight:'700', color:'#ffffff' },
  sectionBadge:   { fontSize:11, color:'#60a5fa', backgroundColor:'rgba(96,165,250,0.15)', paddingHorizontal:10, paddingVertical:4, borderRadius:10, fontWeight:'700', borderWidth:1, borderColor:'rgba(96,165,250,0.3)' },
  aiGrid:         { paddingHorizontal:20, gap:10, marginBottom:22 },
  aiTile:         { flexDirection:'row', alignItems:'center', borderRadius:18, padding:16, gap:14, borderWidth:1, borderColor:'rgba(255,255,255,0.08)' },
  aiTileIconWrap: { width:46, height:46, borderRadius:14, backgroundColor:'rgba(255,255,255,0.08)', alignItems:'center', justifyContent:'center' },
  aiTileEmoji:    { fontSize:24 },
  aiTileLabel:    { fontSize:15, fontWeight:'700', color:'#ffffff', marginBottom:2 },
  aiTileSub:      { fontSize:12, color:'rgba(255,255,255,0.4)' },
  wellnessTitle:  { fontSize:15, fontWeight:'700', color:'#ffffff', marginHorizontal:20, marginBottom:12 },
  grid:           { flexDirection:'row', flexWrap:'wrap', marginHorizontal:14, gap:10, marginBottom:20 },
  tile:           { width:'47%', aspectRatio:1, backgroundColor:'rgba(10,5,30,0.78)', borderRadius:20, padding:18, borderWidth:1, borderColor:'rgba(255,255,255,0.08)', justifyContent:'center' },
  tileSpecial:    { width:'98%', aspectRatio:2.5, backgroundColor:'rgba(22,101,52,0.25)', borderWidth:2, borderColor:'rgba(74,222,128,0.4)' },
  tileEmoji:      { fontSize:30, marginBottom:10 },
  tileLabel:      { fontSize:15, fontWeight:'700', color:'#ffffff', marginBottom:3 },
  tileLabelSpecial:{ color:'#4ade80' },
  tileSub:        { fontSize:11, color:'rgba(255,255,255,0.4)' },
  newBadge:       { position:'absolute', top:8, right:8, backgroundColor:'#4ade80', paddingHorizontal:8, paddingVertical:2, borderRadius:8, fontSize:9, fontWeight:'800', color:'#000' },
  tipCard:        { backgroundColor:'rgba(10,30,12,0.85)', marginHorizontal:20, borderRadius:20, padding:18, borderWidth:1, borderColor:'rgba(74,222,128,0.2)', marginBottom:12 },
  tipRow:         { flexDirection:'row', gap:14, alignItems:'flex-start' },
  tipEmoji:       { fontSize:28, marginTop:2 },
  tipHead:        { fontSize:14, fontWeight:'700', color:C.accent, marginBottom:5 },
  tipBody:        { fontSize:13, color:'rgba(255,255,255,0.5)', lineHeight:20 },
  stressCard:     { backgroundColor:'rgba(20,8,40,0.85)', marginHorizontal:20, borderRadius:20, padding:18, borderWidth:1, borderColor:'rgba(167,139,250,0.2)', marginBottom:12 },
  stressHead:     { fontSize:14, fontWeight:'700', color:'#c084fc', marginBottom:6 },
  stressTxt:      { fontSize:13, color:'rgba(255,255,255,0.45)', lineHeight:20, marginBottom:14 },
  meditateBtn:    { borderRadius:12, paddingVertical:11, alignItems:'center', borderWidth:1, borderColor:C.accent },
  meditateBtnTxt: { color:C.accent, fontSize:14, fontWeight:'800' },
});
