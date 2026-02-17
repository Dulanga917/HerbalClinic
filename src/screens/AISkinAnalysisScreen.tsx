// src/screens/AISkinAnalysisScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  StatusBar, TouchableOpacity, Alert, Image,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { analyzeSkinFromPhoto } from '../services/geminiService';
import C from '../styles/colors';

interface Props { onBack: () => void; onDoshaDetected: (d: string) => void; }

export default function AISkinAnalysisScreen({ onBack, onDoshaDetected }: Props) {
  const [photo,    setPhoto]    = useState<string | null>(null);
  const [result,   setResult]   = useState<any>(null);
  const [loading,  setLoading]  = useState(false);
  const [step,     setStep]     = useState<'pick'|'analysing'|'result'>('pick');

  const pickFromCamera = () => {
    launchCamera({ mediaType:'photo', includeBase64:true, quality:0.6, cameraType:'front' }, res => {
      if (res.assets?.[0]) {
        setPhoto(res.assets[0].uri ?? null);
        analysePhoto(res.assets[0].base64 ?? '');
      }
    });
  };

  const pickFromGallery = () => {
    launchImageLibrary({ mediaType:'photo', includeBase64:true, quality:0.6 }, res => {
      if (res.assets?.[0]) {
        setPhoto(res.assets[0].uri ?? null);
        analysePhoto(res.assets[0].base64 ?? '');
      }
    });
  };

  const analysePhoto = async (base64: string) => {
    setStep('analysing'); setLoading(true);
    try {
      const analysis = await analyzeSkinFromPhoto(base64);
      setResult(analysis);
      setStep('result');
      // Extract dosha and pass up
      const doshaMatch = analysis.dosha.match(/Vata|Pitta|Kapha/i);
      if (doshaMatch) onDoshaDetected(doshaMatch[0]);
    } catch (e) {
      Alert.alert('Error', 'Could not analyse photo. Check your API key and internet connection.');
      setStep('pick');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setPhoto(null); setResult(null); setStep('pick'); };

  const severityColor = (s: string) =>
    s?.toLowerCase().includes('mild')     ? C.accent :
    s?.toLowerCase().includes('moderate') ? C.gold   : C.danger;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🔬 AI Skin Analysis</Text>
        <View style={{ width:60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.pad}>

        {/* STEP 1 — Pick photo */}
        {step === 'pick' && (
          <View>
            <View style={styles.infoCard}>
              <Text style={styles.infoEmoji}>🤖</Text>
              <Text style={styles.infoTitle}>AI-Powered Skin Analysis</Text>
              <Text style={styles.infoDesc}>
                Our Gemini AI analyses your skin photo to detect:{'\n\n'}
                ✦ Skin conditions (acne, dryness, redness){'\n'}
                ✦ Your Ayurvedic dosha type{'\n'}
                ✦ Personalised herbal remedies{'\n'}
                ✦ A daily skincare routine
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Choose Photo Source</Text>

            <TouchableOpacity style={styles.photoBtn} onPress={pickFromCamera} activeOpacity={0.85}>
              <Text style={styles.photoBtnEmoji}>📸</Text>
              <View>
                <Text style={styles.photoBtnTitle}>Take Selfie</Text>
                <Text style={styles.photoBtnSub}>Use front camera for best results</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.photoBtn} onPress={pickFromGallery} activeOpacity={0.85}>
              <Text style={styles.photoBtnEmoji}>🖼️</Text>
              <View>
                <Text style={styles.photoBtnTitle}>Choose from Gallery</Text>
                <Text style={styles.photoBtnSub}>Select an existing photo</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>📋 Tips for best results:</Text>
              <Text style={styles.tipsTxt}>• Use natural lighting{'\n'}• Face the camera directly{'\n'}• Remove glasses & makeup{'\n'}• Clean, bare skin works best</Text>
            </View>
          </View>
        )}

        {/* STEP 2 — Analysing */}
        {step === 'analysing' && (
          <View style={styles.analysingWrap}>
            {photo && <Image source={{ uri:photo }} style={styles.previewImg} />}
            <View style={styles.spinnerWrap}>
              <Text style={styles.analysingEmoji}>🔍</Text>
            </View>
            <Text style={styles.analysingTitle}>Analysing your skin...</Text>
            <Text style={styles.analysingDesc}>
              Gemini AI is examining your photo for skin conditions, dosha type and herbal recommendations.
            </Text>
            <View style={styles.dotsRow}>
              {[0,1,2,3,4].map(i => (
                <View key={i} style={[styles.dot, { opacity: 0.3 + i * 0.15 }]} />
              ))}
            </View>
          </View>
        )}

        {/* STEP 3 — Results */}
        {step === 'result' && result && (
          <View>
            {photo && <Image source={{ uri:photo }} style={styles.resultImg} />}

            <View style={[styles.resultBadge, { backgroundColor: severityColor(result.severity) + '22', borderColor: severityColor(result.severity) }]}>
              <Text style={[styles.resultBadgeTxt, { color: severityColor(result.severity) }]}>
                {result.severity} concern detected
              </Text>
            </View>

            {[
              { label:'🔎 Skin Conditions',   value: result.conditions, color:'#60a5fa' },
              { label:'🌿 Your Dosha',         value: result.dosha,       color: C.accent  },
              { label:'🌼 Herbal Remedies',    value: result.herbs,       color: C.gold    },
              { label:'📋 Daily Routine',      value: result.routine,     color:'#c084fc'  },
            ].map(row => (
              <View key={row.label} style={styles.resultRow}>
                <Text style={[styles.resultLabel, { color: row.color }]}>{row.label}</Text>
                <Text style={styles.resultVal}>{row.value}</Text>
              </View>
            ))}

            <TouchableOpacity style={styles.retakeBtn} onPress={reset}>
              <Text style={styles.retakeTxt}>📸 Analyse Another Photo</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:          { flex:1, backgroundColor:C.bg },
  pad:             { paddingHorizontal:20, paddingBottom:40 },
  header:          { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingTop:16, paddingBottom:12 },
  backBtn:         { width:60 },
  backTxt:         { color:C.accent, fontSize:14, fontWeight:'600' },
  title:           { fontSize:17, fontWeight:'700', color:C.text },
  infoCard:        { backgroundColor:C.surface, borderRadius:20, padding:24, alignItems:'center', borderWidth:1, borderColor:'#1a3a5c', marginBottom:24 },
  infoEmoji:       { fontSize:48, marginBottom:12 },
  infoTitle:       { fontSize:20, fontWeight:'800', color:C.accent, marginBottom:10 },
  infoDesc:        { fontSize:14, color:C.muted, lineHeight:22 },
  sectionTitle:    { fontSize:12, fontWeight:'700', color:C.muted, letterSpacing:1.2, textTransform:'uppercase', marginBottom:12 },
  photoBtn:        { flexDirection:'row', alignItems:'center', gap:16, backgroundColor:C.card, borderRadius:16, padding:18, marginBottom:12, borderWidth:1, borderColor:'#1a3a5c' },
  photoBtnEmoji:   { fontSize:32 },
  photoBtnTitle:   { fontSize:16, fontWeight:'700', color:C.text, marginBottom:2 },
  photoBtnSub:     { fontSize:12, color:C.muted },
  tipsCard:        { backgroundColor:'#0c2a1a', borderRadius:14, padding:16, borderWidth:1, borderColor:'#1a4a2a', marginTop:8 },
  tipsTitle:       { fontSize:14, fontWeight:'700', color:C.accent, marginBottom:8 },
  tipsTxt:         { fontSize:13, color:C.muted, lineHeight:22 },
  analysingWrap:   { alignItems:'center', paddingVertical:40 },
  previewImg:      { width:160, height:160, borderRadius:80, borderWidth:3, borderColor:C.accent, marginBottom:30, alignSelf:'center' },
  spinnerWrap:     { width:80, height:80, borderRadius:40, backgroundColor:C.surface, alignItems:'center', justifyContent:'center', marginBottom:20, borderWidth:2, borderColor:C.accent },
  analysingEmoji:  { fontSize:36 },
  analysingTitle:  { fontSize:20, fontWeight:'700', color:C.accent, marginBottom:8 },
  analysingDesc:   { fontSize:14, color:C.muted, textAlign:'center', lineHeight:20, marginBottom:20, paddingHorizontal:20 },
  dotsRow:         { flexDirection:'row', gap:8 },
  dot:             { width:10, height:10, borderRadius:5, backgroundColor:C.accent },
  resultImg:       { width:120, height:120, borderRadius:60, borderWidth:3, borderColor:C.accent, alignSelf:'center', marginBottom:16 },
  resultBadge:     { borderRadius:20, paddingHorizontal:16, paddingVertical:8, alignSelf:'center', borderWidth:1, marginBottom:20 },
  resultBadgeTxt:  { fontSize:14, fontWeight:'700' },
  resultRow:       { backgroundColor:C.card, borderRadius:14, padding:16, marginBottom:10, borderWidth:1, borderColor:'#1a3a5c' },
  resultLabel:     { fontSize:13, fontWeight:'700', marginBottom:6 },
  resultVal:       { fontSize:14, color:C.muted, lineHeight:21 },
  retakeBtn:       { backgroundColor:C.surface, borderRadius:14, paddingVertical:15, alignItems:'center', marginTop:8, borderWidth:1, borderColor:C.accent },
  retakeTxt:       { color:C.accent, fontSize:15, fontWeight:'700' },
});
