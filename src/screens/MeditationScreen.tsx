// src/screens/MeditationScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, Animated,
} from 'react-native';
import C from '../styles/colors';
import { FadeIn, SlideInLeft, AnimatedButton, PulseView } from '../components/Animations';
import { Dosha, MEDITATIONS, MeditationSession } from '../data/appData';

interface Props { onBack:()=>void; dosha:Dosha; }

export default function MeditationScreen({ onBack, dosha }: Props) {
  const [active,  setActive]  = useState<MeditationSession|null>(null);
  const [timer,   setTimer]   = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<any>(null);

  // Ring for active session
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOp    = useRef(new Animated.Value(0.5)).current;
  const ringAnim  = useRef<any>(null);

  const startRing = () => {
    ringAnim.current = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ringScale, { toValue:1.4, duration:1500, useNativeDriver:true }),
          Animated.timing(ringScale, { toValue:1,   duration:1500, useNativeDriver:true }),
        ]),
        Animated.sequence([
          Animated.timing(ringOp, { toValue:0,   duration:1500, useNativeDriver:true }),
          Animated.timing(ringOp, { toValue:0.5, duration:1500, useNativeDriver:true }),
        ]),
      ])
    );
    ringAnim.current.start();
  };

  const stopRing = () => ringAnim.current?.stop();

  const toggleTimer = () => {
    if (running) {
      clearInterval(timerRef.current); setRunning(false); stopRing();
    } else {
      timerRef.current = setInterval(() => setTimer(t => t+1), 1000);
      setRunning(true); startRing();
    }
  };

  const endSession = () => {
    clearInterval(timerRef.current); stopRing();
    setActive(null); setTimer(0); setRunning(false);
  };

  useEffect(() => () => { clearInterval(timerRef.current); stopRing(); }, []);

  const fmt = (s:number) =>
    `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const tagColor = (d:string) =>
    d==='Pitta'?C.pitta : d==='Vata'?C.vata : d==='Kapha'?C.kapha : C.accent;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.header}>
        <AnimatedButton onPress={onBack} color="transparent" style={styles.backBtn}>
          <Text style={styles.backTxt}>← Back</Text>
        </AnimatedButton>
        <Text style={styles.title}>🧘 Meditation</Text>
        <View style={{ width:60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.pad}>

        {/* Active session */}
        {active && (
          <FadeIn>
            <View style={styles.activeCard}>
              {/* Pulsing ring around emoji */}
              <View style={styles.emojiWrap}>
                <Animated.View style={[styles.ring, { transform:[{ scale:ringScale }], opacity:ringOp }]}/>
                <Text style={styles.activeEmoji}>{active.emoji}</Text>
              </View>
              <Text style={styles.activeTitle}>{active.title}</Text>
              <Text style={styles.activeDesc}>{active.description}</Text>
              {/* Timer */}
              <Text style={styles.timerDisplay}>{fmt(timer)}</Text>
              <View style={styles.timerRow}>
                <AnimatedButton onPress={toggleTimer} style={styles.timerBtn}>
                  <Text style={styles.timerBtnTxt}>{running?'⏸ Pause':'▶ Start'}</Text>
                </AnimatedButton>
                <AnimatedButton onPress={endSession} color={C.surface} style={styles.endBtn}>
                  <Text style={styles.endTxt}>✕ End</Text>
                </AnimatedButton>
              </View>
            </View>
          </FadeIn>
        )}

        {/* Session list */}
        {!active && (
          <>
            {dosha && (
              <SlideInLeft>
                <View style={styles.tipCard}>
                  <Text style={styles.tipHead}>✨ Recommended for {dosha}</Text>
                  <Text style={styles.tipBody}>
                    {dosha==='Vata'  ? 'Try Grounding Earth Meditation to ease anxiety and dry skin.' :
                     dosha==='Pitta' ? 'Cooling Moon Breath reduces skin inflammation and cortisol.'  :
                     'Energising Sun Breath stimulates circulation for oily skin.'}
                  </Text>
                </View>
              </SlideInLeft>
            )}
            <FadeIn delay={100}>
              <Text style={styles.sectionTitle}>All Sessions</Text>
            </FadeIn>
            {MEDITATIONS.map((m, i) => (
              <SlideInLeft key={m.id} delay={150 + i*80}>
                <AnimatedButton onPress={() => { setActive(m); setTimer(0); setRunning(false); }} color={C.card} style={styles.card}>
                  <Text style={styles.cardEmoji}>{m.emoji}</Text>
                  <View style={{ flex:1 }}>
                    <Text style={styles.cardTitle}>{m.title}</Text>
                    <Text style={styles.cardDesc}>{m.description}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaTag}>⏱ {m.duration}</Text>
                      <Text style={[styles.metaTag, { color:tagColor(m.dosha) }]}>🌿 {m.dosha}</Text>
                    </View>
                  </View>
                </AnimatedButton>
              </SlideInLeft>
            ))}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:       { flex:1, backgroundColor:C.bg },
  pad:          { paddingHorizontal:20, paddingBottom:40 },
  header:       { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingTop:16, paddingBottom:12 },
  backBtn:      { width:60 },
  backTxt:      { color:C.accent, fontSize:14, fontWeight:'600' },
  title:        { fontSize:17, fontWeight:'700', color:C.text },
  activeCard:   { backgroundColor:C.surface, borderRadius:22, padding:26, alignItems:'center', borderWidth:1, borderColor:C.accent, marginBottom:20 },
  emojiWrap:    { width:100, height:100, alignItems:'center', justifyContent:'center', marginBottom:16 },
  ring:         { position:'absolute', width:100, height:100, borderRadius:50, borderWidth:2, borderColor:C.accent },
  activeEmoji:  { fontSize:52 },
  activeTitle:  { fontSize:20, fontWeight:'700', color:C.text, marginBottom:8, textAlign:'center' },
  activeDesc:   { fontSize:14, color:C.muted, textAlign:'center', lineHeight:20, marginBottom:20 },
  timerDisplay: { fontSize:56, fontWeight:'800', color:C.accent, letterSpacing:4, marginBottom:24 },
  timerRow:     { flexDirection:'row', gap:12 },
  timerBtn:     { paddingHorizontal:28, paddingVertical:13, borderRadius:14 },
  timerBtnTxt:  { color:'#0a1628', fontSize:16, fontWeight:'700' },
  endBtn:       { paddingHorizontal:20, paddingVertical:13, borderRadius:14 },
  endTxt:       { color:C.muted, fontSize:16, fontWeight:'600' },
  tipCard:      { backgroundColor:'#0c2a1a', borderRadius:14, padding:16, borderWidth:1, borderColor:'#1a4a2a', marginBottom:16 },
  tipHead:      { fontSize:14, fontWeight:'700', color:C.accent, marginBottom:6 },
  tipBody:      { fontSize:13, color:C.muted, lineHeight:20 },
  sectionTitle: { fontSize:12, fontWeight:'700', color:C.muted, letterSpacing:1.2, textTransform:'uppercase', marginBottom:12 },
  card:         { flexDirection:'row', borderRadius:16, padding:16, marginBottom:10, borderWidth:1, borderColor:'#1a3a5c', gap:12, alignItems:'flex-start' },
  cardEmoji:    { fontSize:32, marginTop:2 },
  cardTitle:    { fontSize:15, fontWeight:'700', color:C.text, marginBottom:4 },
  cardDesc:     { fontSize:13, color:C.muted, lineHeight:18, marginBottom:8 },
  metaRow:      { flexDirection:'row', gap:8 },
  metaTag:      { fontSize:12, color:C.muted, backgroundColor:C.surface, paddingHorizontal:8, paddingVertical:3, borderRadius:8 },
});