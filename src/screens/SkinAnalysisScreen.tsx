// src/screens/SkinAnalysisScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, Animated,
} from 'react-native';
import C from '../styles/colors';
import { FadeIn, ScaleIn, AnimatedButton, Spinner } from '../components/Animations';
import { Dosha, DOSHA_QUIZ, DOSHA_DETAILS } from '../data/appData';

interface Props { onBack:()=>void; onDoshaResult:(d:Dosha)=>void; }

export default function SkinAnalysisScreen({ onBack, onDoshaResult }: Props) {
  const [step,     setStep]     = useState(0);
  const [answers,  setAnswers]  = useState<number[]>([]);
  const [result,   setResult]   = useState<Dosha>(null);
  const [loading,  setLoading]  = useState(false);

  // Progress bar animated width
  const barW = useRef(new Animated.Value(0)).current;

  const animateBar = (s: number) => {
    Animated.spring(barW, {
      toValue: (s / DOSHA_QUIZ.length) * 200,
      speed: 20, bounciness: 8, useNativeDriver: false,
    }).start();
  };

  const choose = (idx: number) => {
    const newAnswers = [...answers, idx];
    setAnswers(newAnswers);
    animateBar(newAnswers.length);

    if (newAnswers.length === DOSHA_QUIZ.length) {
      setLoading(true);
      setTimeout(() => {
        const counts = [0,0,0];
        newAnswers.forEach(a => counts[a]++);
        const maxIdx = counts.indexOf(Math.max(...counts));
        const dosha  = (['Vata','Pitta','Kapha'] as Dosha[])[maxIdx];
        setResult(dosha); setLoading(false);
        setStep(DOSHA_QUIZ.length + 1);
        onDoshaResult(dosha);
      }, 1500);
    } else {
      setStep(step + 1);
    }
  };

  const restart = () => { setStep(0); setAnswers([]); setResult(null); barW.setValue(0); };
  const doshaColor = result==='Pitta'?C.pitta : result==='Vata'?C.vata : C.kapha;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.header}>
        <AnimatedButton onPress={onBack} color="transparent" style={styles.backBtn}>
          <Text style={styles.backTxt}>← Back</Text>
        </AnimatedButton>
        <Text style={styles.title}>🔬 Skin Analysis</Text>
        <View style={{ width:60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.pad}>

        {/* Intro */}
        {step === 0 && (
          <ScaleIn>
            <View style={styles.introCard}>
              <Text style={styles.introEmoji}>🌿</Text>
              <Text style={styles.introTitle}>Ayurvedic Dosha Quiz</Text>
              <Text style={styles.introDesc}>
                Answer 3 questions to identify your Ayurvedic skin type and receive personalised herbal and meditation recommendations.
              </Text>
              <AnimatedButton onPress={() => setStep(1)} style={{ width:'500%', height:50, borderRadius:25 }} color={C.accent}>
                <Text style={styles.btnTxt}>Start Quiz →</Text>
              </AnimatedButton>
            </View>
          </ScaleIn>
        )}

        {/* Question */}
        {step >= 1 && step <= DOSHA_QUIZ.length && (
          <FadeIn key={step}>
            <Text style={styles.progress}>Question {step} of {DOSHA_QUIZ.length}</Text>
            <View style={styles.barBg}>
              <Animated.View style={[styles.barFill, {
                width: barW.interpolate({ inputRange:[0,100], outputRange:['0%','100%'] }),
              }]} />
            </View>
            <Text style={styles.question}>{DOSHA_QUIZ[step-1].q}</Text>
            {DOSHA_QUIZ[step-1].options.map((opt,i) => (
              <FadeIn key={i} delay={i * 80}>
                <AnimatedButton onPress={() => choose(i)} color={C.card} style={styles.option}>
                  <Text style={styles.optionTxt}>{opt}</Text>
                </AnimatedButton>
              </FadeIn>
            ))}
          </FadeIn>
        )}

        {/* Analysing spinner */}
        {loading && (
          <FadeIn>
            <View style={styles.loadingWrap}>
              <Spinner size={50} color={C.accent} />
              <Text style={styles.loadingTxt}>Analysing your dosha...</Text>
            </View>
          </FadeIn>
        )}

        {/* Result */}
        {step === DOSHA_QUIZ.length + 1 && result && !loading && (
          <ScaleIn>
            <View style={[styles.resultCard, { borderColor:doshaColor }]}>
              <Text style={styles.resultEmoji}>✨</Text>
              <Text style={[styles.resultDosha, { color:doshaColor }]}>You are {result}</Text>
              <Text style={styles.resultSub}>Your Ayurvedic Skin Profile</Text>
              {(['skin','herb','meditation'] as const).map((k,i) => (
                <FadeIn key={k} delay={i*120}>
                  <View style={styles.resultRow}>
                    <Text style={styles.rowLabel}>
                      {k==='skin'?'🌸 Skin Type':k==='herb'?'🌿 Recommended Herbs':'🧘 Meditation'}
                    </Text>
                    <Text style={styles.rowVal}>{DOSHA_DETAILS[result][k]}</Text>
                  </View>
                </FadeIn>
              ))}
              <AnimatedButton onPress={restart} color="transparent" style={styles.outlineBtn}>
                <Text style={styles.outlineTxt}>Retake Quiz</Text>
              </AnimatedButton>
            </View>
          </ScaleIn>
        )}

      </ScrollView>
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
  introCard:   { backgroundColor:C.surface, borderRadius:22, padding:28, alignItems:'center', borderWidth:1, borderColor:'#1a3a5c' },
  introEmoji:  { fontSize:52, marginBottom:12 },
  introTitle:  { fontSize:22, fontWeight:'800', color:C.accent, marginBottom:10 },
  introDesc:   { fontSize:14, color:C.muted, textAlign:'center', lineHeight:22, marginBottom:20 },
  btnTxt:      { color:'#0a1628', fontSize:16, fontWeight:'800' },
  progress:    { fontSize:13, color:C.muted, marginBottom:8 },
  barBg:       { height:6, backgroundColor:C.surface, borderRadius:3, marginBottom:24, overflow:'hidden' },
  barFill:     { height:6, backgroundColor:C.accent, borderRadius:3 },
  question:    { fontSize:18, fontWeight:'700', color:C.text, marginBottom:20, lineHeight:26 },
  option:      { borderRadius:14, padding:16, marginBottom:10, borderWidth:1, borderColor:'#1a3a5c' },
  optionTxt:   { fontSize:15, color:C.text, fontWeight:'500' },
  loadingWrap: { alignItems:'center', paddingVertical:60, gap:16 },
  loadingTxt:  { fontSize:15, color:C.muted, fontWeight:'600' },
  resultCard:  { backgroundColor:C.surface, borderRadius:22, padding:24, borderWidth:1.5 },
  resultEmoji: { fontSize:44, textAlign:'center', marginBottom:8 },
  resultDosha: { fontSize:26, fontWeight:'800', textAlign:'center', marginBottom:4 },
  resultSub:   { fontSize:13, color:C.muted, textAlign:'center', marginBottom:20 },
  resultRow:   { backgroundColor:C.bg, borderRadius:12, padding:14, marginBottom:8 },
  rowLabel:    { fontSize:12, color:C.muted, fontWeight:'600', marginBottom:4 },
  rowVal:      { fontSize:14, color:C.text, lineHeight:20 },
  outlineBtn:  { borderRadius:12, paddingVertical:11, borderWidth:1, borderColor:C.accent, marginTop:8 },
  outlineTxt:  { color:C.accent, fontSize:14, fontWeight:'700' },
});
