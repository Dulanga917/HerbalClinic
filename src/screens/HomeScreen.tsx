// src/screens/HomeScreen.tsx  — updated with AI tiles
import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, Animated, TouchableOpacity,
} from 'react-native';
import C from '../styles/colors';
import { FadeIn, SlideInLeft, SlideInRight, AnimatedButton } from '../components/Animations';
import { Dosha } from '../data/appData';

// Extended screen type to include AI screens
type FullScreen = 'login'|'home'|'skinAnalysis'|'meditation'|'herbs'|'stress'|'aiChat'|'aiSkin'|'aiHerbs';

interface Props {
  username: string; dosha: Dosha;
  onNav: (s: FullScreen) => void; onLogout: () => void;
}

export default function HomeScreen({ username, dosha, onNav, onLogout }: Props) {
  const doshaColor = dosha==='Pitta'?C.pitta : dosha==='Vata'?C.vata : dosha==='Kapha'?C.kapha : C.accent;

  const headerY  = useRef(new Animated.Value(-60)).current;
  const headerOp = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerY,  { toValue:0, speed:14, bounciness:8, useNativeDriver:true }),
      Animated.timing(headerOp, { toValue:1, duration:400, useNativeDriver:true }),
    ]).start();
  }, []);

  const tiles = [
    { label:'Skin Analysis',  sub:'Find your dosha',     emoji:'🔬', screen:'skinAnalysis' as FullScreen, side:'left'  },
    { label:'Meditation',     sub:'Breathe & relax',     emoji:'🧘', screen:'meditation'   as FullScreen, side:'right' },
    { label:'Herb Library',   sub:'Natural remedies',    emoji:'🌿', screen:'herbs'        as FullScreen, side:'left'  },
    { label:'Stress Tracker', sub:'Track progress',      emoji:'📊', screen:'stress'       as FullScreen, side:'right' },
  ];

  const aiTiles = [
    { label:'AI Skin Scan',   sub:'Photo skin analysis', emoji:'📸', screen:'aiSkin'  as FullScreen, color:'#1a2a4a' },
    { label:'AI Herb Advisor',sub:'Personalised herbs',  emoji:'🤖', screen:'aiHerbs' as FullScreen, color:'#1a2a1a' },
    { label:'AI Chat',        sub:'Ask skin questions',  emoji:'💬', screen:'aiChat'  as FullScreen, color:'#2a1a3a' },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={{ paddingBottom:30 }}>

        {/* Header */}
        <Animated.View style={[styles.header, { opacity:headerOp, transform:[{ translateY:headerY }] }]}>
          <View>
            <Text style={styles.greet}>Welcome back 👋</Text>
            <Text style={styles.name}>{username}</Text>
          </View>
          <AnimatedButton onPress={onLogout} color={C.surface} style={styles.logoutBtn}>
            <Text style={styles.logoutTxt}>Logout</Text>
          </AnimatedButton>
        </Animated.View>

        {/* Dosha Banner */}
        <SlideInLeft delay={150}>
          <TouchableOpacity
            onPress={() => onNav('skinAnalysis')}
            activeOpacity={0.8}
            style={[styles.doshaBanner, { borderColor:doshaColor }]}>
            <Text style={styles.doshaEmoji}>{dosha ? '✨' : '🔍'}</Text>
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
          </TouchableOpacity>
        </SlideInLeft>

        {/* AI Features Section */}
        <FadeIn delay={200}>
          <View style={styles.aiBanner}>
            <Text style={styles.aiIcon}>🤖</Text>
            <Text style={styles.aiTitle}>AI-Powered Features</Text>
            <Text style={styles.aiSub}>Powered by Google Gemini</Text>
          </View>
        </FadeIn>

        <View style={styles.aiGrid}>
          {aiTiles.map((t, i) => (
            <SlideInLeft key={t.screen} delay={250 + i * 80}>
              <AnimatedButton onPress={() => onNav(t.screen)} color={t.color} style={styles.aiTile}>
                <Text style={styles.aiTileEmoji}>{t.emoji}</Text>
                <Text style={styles.aiTileLabel}>{t.label}</Text>
                <Text style={styles.aiTileSub}>{t.sub}</Text>
              </AnimatedButton>
            </SlideInLeft>
          ))}
        </View>

        {/* Regular tools */}
        <FadeIn delay={450}>
          <Text style={styles.sectionTitle}>Wellness Tools</Text>
        </FadeIn>
        <View style={styles.grid}>
          {tiles.map((t, i) => {
            const Wrapper = t.side === 'left' ? SlideInLeft : SlideInRight;
            return (
              <Wrapper key={t.screen} delay={500 + i * 80}>
                <AnimatedButton onPress={() => onNav(t.screen)} color={C.card} style={styles.tile}>
                  <Text style={styles.tileEmoji}>{t.emoji}</Text>
                  <Text style={styles.tileLabel}>{t.label}</Text>
                  <Text style={styles.tileSub}>{t.sub}</Text>
                </AnimatedButton>
              </Wrapper>
            );
          })}
        </View>

        {/* Tip card */}
        <SlideInLeft delay={700}>
          <View style={styles.tipCard}>
            <Text style={styles.tipHead}>🌟 Herb of the Day</Text>
            <Text style={styles.tipBody}>
              <Text style={{ color:C.text, fontWeight:'700' }}>Turmeric — </Text>
              Contains curcumin with potent anti-inflammatory effects. Mix with honey for a calming face pack.
            </Text>
          </View>
        </SlideInLeft>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:       { flex:1, backgroundColor:C.bg },
  header:       { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingTop:16, paddingBottom:12 },
  greet:        { fontSize:13, color:C.muted },
  name:         { fontSize:22, fontWeight:'800', color:C.text },
  logoutBtn:    { paddingHorizontal:14, paddingVertical:8, borderRadius:10 },
  logoutTxt:    { color:C.muted, fontSize:13, fontWeight:'600' },
  doshaBanner:  { marginHorizontal:20, marginBottom:16, borderRadius:18, padding:18, flexDirection:'row', alignItems:'center', gap:12, borderWidth:1.5, backgroundColor:C.surface },
  doshaEmoji:   { fontSize:32 },
  doshaTitle:   { fontSize:16, fontWeight:'700', marginBottom:3 },
  doshaSub:     { fontSize:12, color:C.muted, lineHeight:18 },
  aiBanner:     { marginHorizontal:20, marginBottom:12, backgroundColor:'#0f1e38', borderRadius:14, padding:14, flexDirection:'row', alignItems:'center', gap:10, borderWidth:1, borderColor:'#1e3a6e' },
  aiIcon:       { fontSize:24 },
  aiTitle:      { fontSize:15, fontWeight:'700', color:'#60a5fa', flex:1 },
  aiSub:        { fontSize:11, color:C.muted },
  aiGrid:       { paddingHorizontal:20, gap:10, marginBottom:20 },
  aiTile:       { borderRadius:16, padding:16, flexDirection:'row', alignItems:'center', gap:14, borderWidth:1, borderColor:'#1a3a5c' },
  aiTileEmoji:  { fontSize:28 },
  aiTileLabel:  { fontSize:15, fontWeight:'700', color:C.text, flex:1 },
  aiTileSub:    { fontSize:11, color:C.muted },
  sectionTitle: { fontSize:12, fontWeight:'700', color:C.muted, letterSpacing:1.2, textTransform:'uppercase', marginHorizontal:20, marginBottom:12 },
  grid:         { flexDirection:'row', flexWrap:'wrap', marginHorizontal:12, gap:10, marginBottom:20 },
  tile:         { width:160, borderRadius:18, padding:18, borderWidth:1, borderColor:'#1a3a5c' },
  tileEmoji:    { fontSize:30, marginBottom:8 },
  tileLabel:    { fontSize:15, fontWeight:'700', color:C.text, marginBottom:3 },
  tileSub:      { fontSize:11, color:C.muted },
  tipCard:      { backgroundColor:'#0c2a1a', marginHorizontal:20, borderRadius:18, padding:18, borderWidth:1, borderColor:'#1a4a2a' },
  tipHead:      { fontSize:14, fontWeight:'700', color:C.accent, marginBottom:6 },
  tipBody:      { fontSize:13, color:C.muted, lineHeight:20 },
});