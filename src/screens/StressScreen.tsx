// src/screens/StressScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import C from '../styles/colors';
import { FadeIn, SlideInLeft, ScaleIn, AnimatedButton } from '../components/Animations';
import { ProgressEntry } from '../data/appData';

interface Props { onBack:()=>void; }

export default function StressScreen({ onBack }: Props) {
  const [entries, setEntries] = useState<ProgressEntry[]>([
    { id:'1', date:'Feb 12', stressLevel:7, note:'Busy day, acne flared up' },
    { id:'2', date:'Feb 13', stressLevel:5, note:'Morning meditation helped' },
    { id:'3', date:'Feb 14', stressLevel:3, note:'Skin feels calmer today 🌿' },
  ]);
  const [level, setLevel] = useState(5);
  const [note,  setNote]  = useState('');

  // Stat counter animations
  const countAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(countAnim, { toValue:1, duration:800, useNativeDriver:true }).start();
  }, []);

  const addEntry = () => {
    const today = new Date().toLocaleDateString('en-US',{ month:'short', day:'numeric' });
    setEntries(prev => [{
      id: Date.now().toString(), date:today,
      stressLevel:level, note:note.trim()||'No notes added',
    }, ...prev]);
    setNote('');
  };

  const avg = entries.length
    ? (entries.reduce((a,e)=>a+e.stressLevel,0)/entries.length).toFixed(1) : '—';
  const lvlColor = (n:number) => n<=3?C.accent : n<=6?C.gold : C.danger;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.header}>
        <AnimatedButton onPress={onBack} color="transparent" style={styles.backBtn}>
          <Text style={styles.backTxt}>← Back</Text>
        </AnimatedButton>
        <Text style={styles.title}>📊 Stress Tracker</Text>
        <View style={{ width:60 }} />
      </View>

      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">

          {/* Stats */}
          <ScaleIn>
            <View style={styles.statsRow}>
              {[
                { num:String(entries.length), label:'Check-ins', color:C.accent },
                { num:String(avg),            label:'Avg Stress', color:lvlColor(Number(avg)) },
                { num:String(entries.filter(e=>e.stressLevel<=4).length), label:'Low Days', color:C.accent },
              ].map((s,i) => (
                <FadeIn key={i} delay={i*100}>
                  <View style={styles.statCard}>
                    <Text style={[styles.statNum, { color:s.color }]}>{s.num}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                </FadeIn>
              ))}
            </View>
          </ScaleIn>

          {/* Info */}
          <SlideInLeft delay={200}>
            <View style={styles.infoCard}>
              <Text style={styles.infoHead}>🧠 Stress → Skin Link</Text>
              <Text style={styles.infoTxt}>
                {'• High cortisol → more acne & redness (Pitta)\n'}
                {'• Chronic stress → dry, flaky skin (Vata)\n'}
                {'• Low energy & stress → congested pores (Kapha)'}
              </Text>
            </View>
          </SlideInLeft>

          {/* Log form */}
          <FadeIn delay={300}>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Log Today's Stress</Text>
              <Text style={styles.levelLabel}>
                Stress Level: <Text style={{ color:lvlColor(level), fontWeight:'700' }}>{level}/10</Text>
              </Text>
              {/* Dot selector with bounce animation per dot */}
              <View style={styles.dotRow}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <AnimatedButton
                    key={n}
                    onPress={() => setLevel(n)}
                    color={n<=level ? lvlColor(n) : C.surface}
                    style={styles.dot}>
                    <Text style={styles.dotTxt}>{n}</Text>
                  </AnimatedButton>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder="How's your skin today? (optional)"
                placeholderTextColor={C.muted}
                value={note} onChangeText={setNote} />
              <AnimatedButton onPress={addEntry} style={{ marginTop:4 }}>
                <Text style={styles.btnTxt}>+ Log Entry</Text>
              </AnimatedButton>
            </View>
          </FadeIn>

          {/* History */}
          <FadeIn delay={400}>
            <Text style={styles.sectionTitle}>History</Text>
          </FadeIn>
          {entries.map((e,i) => (
            <SlideInLeft key={e.id} delay={i*70}>
              <View style={styles.entryCard}>
                <View style={[styles.badge, {
                  backgroundColor: e.stressLevel<=4?C.accentDim : e.stressLevel<=6?'#78350f':'#7f1d1d'
                }]}>
                  <Text style={styles.badgeTxt}>{e.stressLevel}</Text>
                </View>
                <View style={{ flex:1 }}>
                  <Text style={styles.entryDate}>{e.date}</Text>
                  <Text style={styles.entryNote}>{e.note}</Text>
                </View>
              </View>
            </SlideInLeft>
          ))}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:      { flex:1, backgroundColor:C.bg },
  pad:         { paddingHorizontal:20, paddingBottom:40 },
  header:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingTop:16, paddingBottom:12 },
  backBtn:     { width:60 },
  backTxt:     { color:C.accent, fontSize:14, fontWeight:'600' },
  title:       { fontSize:17, fontWeight:'700', color:C.text },
  statsRow:    { flexDirection:'row', gap:10, marginBottom:16 },
  statCard:    { flex:1, backgroundColor:C.card, borderRadius:14, padding:16, alignItems:'center', borderWidth:1, borderColor:'#1a3a5c' },
  statNum:     { fontSize:28, fontWeight:'800', marginBottom:4 },
  statLabel:   { fontSize:12, color:C.muted },
  infoCard:    { backgroundColor:'#1a1528', borderRadius:14, padding:16, borderWidth:1, borderColor:'#2d2050', marginBottom:16 },
  infoHead:    { fontSize:14, fontWeight:'700', color:'#c084fc', marginBottom:8 },
  infoTxt:     { fontSize:13, color:C.muted, lineHeight:22 },
  formCard:    { backgroundColor:C.card, borderRadius:18, padding:20, marginBottom:16, borderWidth:1, borderColor:'#1a3a5c' },
  formTitle:   { fontSize:15, fontWeight:'700', color:C.accent, marginBottom:14 },
  levelLabel:  { fontSize:14, color:C.muted, marginBottom:10 },
  dotRow:      { flexDirection:'row', gap:5, flexWrap:'wrap', marginBottom:4 },
  dot:         { width:28, height:28, borderRadius:8, paddingVertical:0 },
  dotTxt:      { fontSize:11, color:'#fff', fontWeight:'700' },
  input:       { backgroundColor:C.bg, borderRadius:12, paddingHorizontal:16, paddingVertical:13, color:C.text, fontSize:14, borderWidth:1, borderColor:'#1a3a5c', marginTop:12, marginBottom:8 },
  btnTxt:      { color:'#0a1628', fontSize:16, fontWeight:'800' },
  sectionTitle:{ fontSize:12, fontWeight:'700', color:C.muted, letterSpacing:1.2, textTransform:'uppercase', marginBottom:12 },
  entryCard:   { flexDirection:'row', backgroundColor:C.card, borderRadius:14, padding:16, marginBottom:8, borderWidth:1, borderColor:'#1a3a5c', gap:12 },
  badge:       { width:40, height:40, borderRadius:12, alignItems:'center', justifyContent:'center' },
  badgeTxt:    { fontSize:16, fontWeight:'800', color:'#fff' },
  entryDate:   { fontSize:13, fontWeight:'700', color:C.text, marginBottom:3 },
  entryNote:   { fontSize:13, color:C.muted },
});
