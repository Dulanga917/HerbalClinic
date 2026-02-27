// src/screens/AIHerbScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  StatusBar, TouchableOpacity,
} from 'react-native';
import { getHerbRecommendations } from '../services/geminiService';
import C from '../styles/colors';
import { Dosha } from '../data/appData';

interface Props { onBack: () => void; dosha: Dosha; stressLevel: number; }

const SKIN_CONCERNS = ['Acne', 'Dryness', 'Redness', 'Pigmentation', 'Oily skin', 'Sensitivity', 'Dark spots', 'Wrinkles'];

export default function AIHerbScreen({ onBack, dosha, stressLevel }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [result,   setResult]   = useState<string>('');
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  const toggle = (concern: string) => {
    setSelected(prev =>
      prev.includes(concern) ? prev.filter(c=>c!==concern) : [...prev, concern]
    );
  };

  const getRecommendations = async () => {
    if (selected.length === 0) { return; }
    setLoading(true);
    try {
      const res = await getHerbRecommendations({
        dosha:        dosha ?? 'Unknown',
        skinConcerns: selected,
        stressLevel,
      });
      setResult(res);
      setDone(true);
    } catch (e) {
      setResult('⚠️ Could not connect to AI. Please check your API key and internet.');
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🌿 AI Herb Advisor</Text>
        <View style={{ width:60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.pad}>

        {!done ? (
          <>
            {/* User context */}
            <View style={styles.contextCard}>
              <Text style={styles.contextTitle}>Your Profile</Text>
              <View style={styles.contextRow}>
                <Text style={styles.contextLabel}>Dosha:</Text>
                <Text style={[styles.contextVal, { color: dosha==='Pitta'?C.pitta:dosha==='Vata'?C.vata:C.kapha }]}>
                  {dosha ?? 'Not set — take skin quiz first'}
                </Text>
              </View>
              <View style={styles.contextRow}>
                <Text style={styles.contextLabel}>Stress Level:</Text>
                <Text style={[styles.contextVal, { color: stressLevel<=3?C.accent:stressLevel<=6?C.gold:C.danger }]}>
                  {stressLevel}/10
                </Text>
              </View>
            </View>

            {/* Concern selector */}
            <Text style={styles.sectionTitle}>Select Your Skin Concerns</Text>
            <Text style={styles.sectionSub}>Choose all that apply — AI will personalise herbs for you</Text>
            <View style={styles.chipGrid}>
              {SKIN_CONCERNS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, selected.includes(c) && styles.chipActive]}
                  onPress={() => toggle(c)}
                  activeOpacity={0.8}>
                  <Text style={[styles.chipTxt, selected.includes(c) && styles.chipActiveTxt]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, selected.length===0 && styles.primaryBtnDisabled]}
              onPress={getRecommendations}
              disabled={selected.length===0 || loading}
              activeOpacity={0.85}>
              {loading
                ? <Text style={styles.primaryBtnTxt}>🔄 Getting AI recommendations...</Text>
                : <Text style={styles.primaryBtnTxt}>🌿 Get AI Herb Recommendations</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Results */}
            <View style={styles.resultHeader}>
              <Text style={styles.resultEmoji}>🌿</Text>
              <Text style={styles.resultTitle}>Your Personalised Herbs</Text>
              <Text style={styles.resultSub}>Recommended by Gemini AI for {dosha ?? 'your'} dosha</Text>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultTxt}>{result}</Text>
            </View>

            {/* Selected concerns */}
            <Text style={styles.sectionTitle}>Based on your concerns</Text>
            <View style={styles.chipGrid}>
              {selected.map(c => (
                <View key={c} style={styles.chipActive}>
                  <Text style={styles.chipActiveTxt}>{c}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.resetBtn} onPress={() => { setDone(false); setResult(''); setSelected([]); }}>
              <Text style={styles.resetTxt}>🔄 Get New Recommendations</Text>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:            { flex:1, backgroundColor:C.bg },
  pad:               { paddingHorizontal:20, paddingBottom:40 },
  header:            { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingTop:16, paddingBottom:12 },
  backBtn:           { width:60 },
  backTxt:           { color:C.accent, fontSize:14, fontWeight:'600' },
  title:             { fontSize:17, fontWeight:'700', color:C.text },
  contextCard:       { backgroundColor:C.surface, borderRadius:16, padding:18, borderWidth:1, borderColor:'#1a3a5c', marginBottom:20 },
  contextTitle:      { fontSize:14, fontWeight:'700', color:C.accent, marginBottom:10 },
  contextRow:        { flexDirection:'row', justifyContent:'space-between', marginBottom:6 },
  contextLabel:      { fontSize:14, color:C.muted },
  contextVal:        { fontSize:14, fontWeight:'700' },
  sectionTitle:      { fontSize:12, fontWeight:'700', color:C.muted, letterSpacing:1.2, textTransform:'uppercase', marginBottom:6 },
  sectionSub:        { fontSize:12, color:C.muted, marginBottom:14 },
  chipGrid:          { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:20 },
  chip:              { paddingHorizontal:14, paddingVertical:8, borderRadius:20, backgroundColor:C.surface, borderWidth:1, borderColor:'#1a3a5c' },
  chipActive:        { paddingHorizontal:14, paddingVertical:8, borderRadius:20, backgroundColor:C.accentDim, borderWidth:1, borderColor:C.accent },
  chipTxt:           { fontSize:13, color:C.muted, fontWeight:'600' },
  chipActiveTxt:     { fontSize:13, color:C.accent, fontWeight:'700' },
  primaryBtn:        { backgroundColor:C.accent, borderRadius:14, paddingVertical:16, alignItems:'center' },
  primaryBtnDisabled:{ backgroundColor:C.accentDim, opacity:0.5 },
  primaryBtnTxt:     { color:'#0a1628', fontSize:15, fontWeight:'800' },
  resultHeader:      { alignItems:'center', marginBottom:20 },
  resultEmoji:       { fontSize:48, marginBottom:8 },
  resultTitle:       { fontSize:22, fontWeight:'800', color:C.accent, marginBottom:4 },
  resultSub:         { fontSize:13, color:C.muted },
  resultCard:        { backgroundColor:C.surface, borderRadius:16, padding:20, borderWidth:1, borderColor:'#1a3a5c', marginBottom:20 },
  resultTxt:         { fontSize:14, color:C.muted, lineHeight:22 },
  resetBtn:          { backgroundColor:C.surface, borderRadius:14, paddingVertical:15, alignItems:'center', marginTop:8, borderWidth:1, borderColor:C.accent },
  resetTxt:          { color:C.accent, fontSize:14, fontWeight:'700' },
});
