
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  StatusBar, TouchableOpacity, TextInput, Animated,
} from 'react-native';
import { CATEGORIES, CategoryInfo, Language } from '../data/ayurvedicData';
import { getSriLankanAyurvedicTreatment } from '../services/geminiService';

interface Props { onBack: () => void; }

type Step = 'category' | 'language' | 'questions' | 'symptoms' | 'result';

export default function AyurvedicTreatmentScreen({ onBack }: Props) {
  const [step,        setStep]       = useState<Step>('category');
  const [language,    setLanguage]   = useState<Language>('en');
  const [category,    setCategory]   = useState<CategoryInfo | null>(null);
  const [answers,     setAnswers]    = useState<Record<string, string>>({});
  const [qIndex,      setQIndex]     = useState(0);
  const [symptoms,    setSymptoms]   = useState('');
  const [loading,     setLoading]    = useState(false);
  const [result,      setResult]     = useState<any>(null);

  // Animations
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const animateIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue:1, duration:350, useNativeDriver:true }),
      Animated.spring(slideAnim, { toValue:0, speed:14, bounciness:6, useNativeDriver:true }),
    ]).start();
  };

  useEffect(() => { animateIn(); }, [step, qIndex]);

  const L = (en: string, si: string) => language === 'si' ? si : en;

  // Handlers
  const selectCategory = (cat: CategoryInfo) => {
    setCategory(cat);
    setStep('language');
    setAnswers({});
    setQIndex(0);
  };

  const selectLanguage = (lang: Language) => {
    setLanguage(lang);
    setStep('questions');
  };

  const answerQuestion = (value: string) => {
    if (!category) return;
    const q = category.questions[qIndex];
    setAnswers(prev => ({ ...prev, [q.id]: value }));

    if (qIndex < category.questions.length - 1) {
      setQIndex(i => i + 1);
    } else {
      setStep('symptoms');
    }
  };

  const getAnswerLabel = (qId: string, value: string) => {
    const q = category?.questions.find(q => q.id === qId);
    const opt = q?.options.find(o => o.value === value);
    return opt ? (language === 'si' ? opt.si : opt.en) : value;
  };

  const getTreatment = async () => {
    if (!category) return;
    setLoading(true);
    setStep('result');

    const formattedAnswers = Object.entries(answers).map(([qId, val]) => {
      const q = category.questions.find(q => q.id === qId);
      return {
        question: language === 'si' ? (q?.si ?? qId) : (q?.en ?? qId),
        answer:   getAnswerLabel(qId, val),
      };
    });

    try {
      const res = await getSriLankanAyurvedicTreatment({
        category: language === 'si' ? category.si : category.en,
        answers:  formattedAnswers,
        symptoms,
        language,
      });
      setResult(res);
    } catch (e) {
      setResult({ diagnosis:'⚠️ Could not connect to AI. Please check your internet and API key.' });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('category');
    setCategory(null);
    setAnswers({});
    setQIndex(0);
    setSymptoms('');
    setResult(null);
  };

  // Progress bar for questions
  const progress = category
    ? ((qIndex) / category.questions.length) * 100
    : 0;

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={step === 'category' ? onBack : reset} style={styles.backBtn}>
          <Text style={styles.backTxt}>← {L('Back','ආපසු')}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>🌿</Text>
          <Text style={styles.headerTitle}>{L('Sri Lankan Ayurveda','ශ්‍රී ලංකා ආයුර්වේද')}</Text>
        </View>
        {/* Language toggle */}
        <TouchableOpacity
          style={styles.langBtn}
          onPress={() => setLanguage(l => l === 'en' ? 'si' : 'en')}>
          <Text style={styles.langTxt}>{language === 'en' ? 'සිං' : 'EN'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity:fadeAnim, transform:[{ translateY:slideAnim }] }}>

          {/* ── STEP 1: Category selection ─────────────────────── */}
          {step === 'category' && (
            <View>
              <Text style={styles.stepTitle}>
                {L('Choose your health concern','ඔබේ සෞඛ්‍ය ගැටලුව තෝරන්න')}
              </Text>
              <Text style={styles.stepSub}>
                {L('Select the area you need treatment for','ප්‍රතිකාර අවශ්‍ය ප්‍රදේශය තෝරන්න')}
              </Text>

              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catCard, { borderColor: cat.color + '60' }]}
                  onPress={() => selectCategory(cat)}
                  activeOpacity={0.85}>
                  <View style={[styles.catIcon, { backgroundColor: cat.color + '22' }]}>
                    <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={[styles.catTitle, { color: cat.color }]}>
                      {language === 'si' ? cat.si : cat.en}
                    </Text>
                    <Text style={styles.catSub}>
                      {L('Traditional Sri Lankan treatment','සාම්ප්‍රදායික ශ්‍රී ලංකා ප්‍රතිකාරය')}
                    </Text>
                  </View>
                  <Text style={styles.catArrow}>›</Text>
                </TouchableOpacity>
              ))}

              {/* Info banner */}
              <View style={styles.infoBanner}>
                <Text style={styles.infoEmoji}>🏥</Text>
                <Text style={styles.infoTxt}>
                  {L(
                    'All treatments are based on traditional Sri Lankan Ayurvedic medicine (Deshiya Chikitsa) passed down through generations.',
                    'සියලු ප්‍රතිකාර සාම්ප්‍රදායික ශ්‍රී ලාංකේය ආයුර්වේද වෛද්‍ය විද්‍යාව (දේශීය චිකිත්සා) ඇසුරෙන් සකස් කර ඇත.'
                  )}
                </Text>
              </View>
            </View>
          )}

          {/* ── STEP 2: Language selection ─────────────────────── */}
          {step === 'language' && (
            <View style={styles.centerContent}>
              <Text style={styles.langSelectEmoji}>{category?.emoji}</Text>
              <Text style={styles.stepTitle}>
                {category ? (language === 'si' ? category.si : category.en) : ''}
              </Text>
              <Text style={styles.stepSub}>Choose your preferred language</Text>
              <Text style={styles.stepSub}>භාෂාව තෝරන්න</Text>

              <TouchableOpacity
                style={[styles.langOptionBtn, { borderColor:'#2ecc71' }]}
                onPress={() => selectLanguage('en')}
                activeOpacity={0.85}>
                <Text style={styles.langOptionFlag}>🇬🇧</Text>
                <View>
                  <Text style={styles.langOptionTitle}>English</Text>
                  <Text style={styles.langOptionSub}>Treatment in English</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.langOptionBtn, { borderColor:'#f59e0b' }]}
                onPress={() => selectLanguage('si')}
                activeOpacity={0.85}>
                <Text style={styles.langOptionFlag}>🇱🇰</Text>
                <View>
                  <Text style={styles.langOptionTitle}>සිංහල</Text>
                  <Text style={styles.langOptionSub}>ප්‍රතිකාරය සිංහලෙන්</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 3: Questions ──────────────────────────────── */}
          {step === 'questions' && category && (
            <View>
              {/* Progress bar */}
              <View style={styles.progressWrap}>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width:`${progress}%` as any, backgroundColor: category.color }]} />
                </View>
                <Text style={styles.progressTxt}>
                  {L(`Question ${qIndex + 1} of ${category.questions.length}`,
                     `ප්‍රශ්නය ${qIndex + 1} / ${category.questions.length}`)}
                </Text>
              </View>

              <Text style={styles.qTitle}>
                {language === 'si'
                  ? category.questions[qIndex].si
                  : category.questions[qIndex].en}
              </Text>

              <View style={styles.optionsWrap}>
                {category.questions[qIndex].options.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.optionBtn, { borderColor: category.color + '50' }]}
                    onPress={() => answerQuestion(opt.value)}
                    activeOpacity={0.85}>
                    <View style={[styles.optionDot, { backgroundColor: category.color }]} />
                    <Text style={styles.optionTxt}>
                      {language === 'si' ? opt.si : opt.en}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Previous answers */}
              {Object.keys(answers).length > 0 && (
                <View style={styles.prevAnswers}>
                  <Text style={styles.prevTitle}>{L('Your answers so far:','ඔබේ පිළිතුරු:')}</Text>
                  {Object.entries(answers).map(([qId, val]) => (
                    <Text key={qId} style={styles.prevItem}>
                      ✓ {getAnswerLabel(qId, val)}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── STEP 4: Symptoms ───────────────────────────────── */}
          {step === 'symptoms' && (
            <View>
              <Text style={styles.stepTitle}>
                {L('Describe your symptoms','ඔබේ රෝග ලක්ෂණ විස්තර කරන්න')}
              </Text>
              <Text style={styles.stepSub}>
                {L(
                  'Add any additional symptoms or details to get a more accurate treatment',
                  'වඩා නිවැරදි ප්‍රතිකාරයක් සඳහා අමතර රෝග ලක්ෂණ හෝ විස්තර එකතු කරන්න'
                )}
              </Text>

              {/* Summary of answers */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>
                  {L('Your answers:','ඔබේ පිළිතුරු:')}
                </Text>
                {Object.entries(answers).map(([qId, val]) => (
                  <View key={qId} style={styles.summaryRow}>
                    <Text style={styles.summaryDot}>🌿</Text>
                    <Text style={styles.summaryTxt}>{getAnswerLabel(qId, val)}</Text>
                  </View>
                ))}
              </View>

              <TextInput
                style={styles.symptomsInput}
                placeholder={L(
                  'E.g. I have itching for 2 weeks, worse at night, tried coconut oil...',
                  'උදා: සති 2ක් තිස්සේ කැසිල්ල, රාත්‍රියේ දරුණු, පොල් තෙල් ගැල්වූ...'
                )}
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={symptoms}
                onChangeText={setSymptoms}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={styles.getBtn}
                onPress={getTreatment}
                activeOpacity={0.85}>
                <Text style={styles.getBtnTxt}>
                  {L('🌿  Get Ayurvedic Treatment','🌿  ආයුර්වේද ප්‍රතිකාරය ලබාගන්න')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 5: Result ─────────────────────────────────── */}
          {step === 'result' && (
            <View>
              {loading ? (
                <View style={styles.loadingWrap}>
                  <Text style={styles.loadingEmoji}>🌿</Text>
                  <Text style={styles.loadingTitle}>
                    {L('Preparing your Ayurvedic treatment...','ආයුර්වේද ප්‍රතිකාරය සකස් කරමින්...')}
                  </Text>
                  <Text style={styles.loadingSub}>
                    {L(
                      'Our AI is consulting traditional Sri Lankan Ayurvedic texts...',
                      'ශ්‍රී ලාංකේය ආයුර්වේද ග්‍රන්ථ විශ්ලේෂණය කරමින්...'
                    )}
                  </Text>
                  <View style={styles.loadingDots}>
                    {[0,1,2,3,4].map(i => (
                      <View key={i} style={[styles.loadDot, { opacity: 0.2 + i * 0.2 }]} />
                    ))}
                  </View>
                </View>
              ) : result && (
                <View>
                  {/* Result header */}
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultHeaderEmoji}>🌿</Text>
                    <Text style={styles.resultHeaderTitle}>
                      {L('Your Sri Lankan Ayurvedic Treatment','ඔබේ ශ්‍රී ලාංකේය ආයුර්වේද ප්‍රතිකාරය')}
                    </Text>
                    <Text style={styles.resultHeaderSub}>
                      {category ? (language === 'si' ? category.si : category.en) : ''}
                    </Text>
                  </View>

                  {/* Result sections */}
                  {[
                    { key:'diagnosis',   emoji:'🔍', en:'Diagnosis',         si:'රෝග විනිශ්චය'      },
                    { key:'herbs',       emoji:'🌿', en:'Recommended Herbs', si:'නිර්දේශිත ඖෂධ පැළෑටි' },
                    { key:'preparation', emoji:'🫙', en:'Preparation Method', si:'සකස් කිරීමේ ක්‍රමය' },
                    { key:'lifestyle',   emoji:'☀️', en:'Daily Lifestyle',   si:'දෛනික ජීවන රටාව'  },
                    { key:'diet',        emoji:'🍃', en:'Diet Advice',       si:'ආහාර උපදෙස්'       },
                    { key:'warning',     emoji:'⚠️', en:'Important Note',    si:'වැදගත් සටහන'       },
                  ].map(section => result[section.key] ? (
                    <View key={section.key} style={[
                      styles.resultSection,
                      section.key === 'warning' && styles.warningSection,
                    ]}>
                      <View style={styles.resultSectionHeader}>
                        <Text style={styles.resultSectionEmoji}>{section.emoji}</Text>
                        <Text style={[
                          styles.resultSectionTitle,
                          section.key === 'warning' && { color:'#fbbf24' },
                        ]}>
                          {L(section.en, section.si)}
                        </Text>
                      </View>
                      <Text style={styles.resultSectionTxt}>{result[section.key]}</Text>
                    </View>
                  ) : null)}

                  {/* Disclaimer */}
                  <View style={styles.disclaimer}>
                    <Text style={styles.disclaimerTxt}>
                      {L(
                        '⚕️ This is traditional knowledge for informational purposes. Always consult a qualified Ayurvedic physician (Vaidya) for serious conditions.',
                        '⚕️ මෙය තොරතුරු සපයීමේ අරමුණින් සාම්ප්‍රදායික දැනුමයි. බරපතළ රෝග සඳහා සෑම විටම සුදුසුකම් ලත් ආයුර්වේද වෛද්‍යවරයෙකු (වෛද්‍ය) හමුවන්න.'
                      )}
                    </Text>
                  </View>

                  {/* Try again */}
                  <TouchableOpacity style={styles.resetBtn} onPress={reset} activeOpacity={0.85}>
                    <Text style={styles.resetBtnTxt}>
                      {L('🔄  Try Another Treatment','🔄  වෙනත් ප්‍රතිකාරයක් ලබාගන්න')}
                    </Text>
                  </TouchableOpacity>

                </View>
              )}
            </View>
          )}

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:              { flex:1, backgroundColor:'#080814' },
  pad:                 { paddingHorizontal:20, paddingBottom:40 },

  // Header
  header:              { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingTop:16, paddingBottom:12, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.06)' },
  backBtn:             { width:70 },
  backTxt:             { color:'#4ade80', fontSize:14, fontWeight:'600' },
  headerCenter:        { flexDirection:'row', alignItems:'center', gap:6 },
  headerEmoji:         { fontSize:18 },
  headerTitle:         { fontSize:15, fontWeight:'700', color:'#ffffff' },
  langBtn:             { width:70, alignItems:'flex-end' },
  langTxt:             { color:'#f59e0b', fontSize:13, fontWeight:'700', backgroundColor:'rgba(245,158,11,0.15)', paddingHorizontal:10, paddingVertical:4, borderRadius:10 },

  // Category step
  stepTitle:           { fontSize:20, fontWeight:'800', color:'#ffffff', marginTop:20, marginBottom:8 },
  stepSub:             { fontSize:13, color:'rgba(255,255,255,0.45)', marginBottom:20, lineHeight:20 },
  catCard:             { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(255,255,255,0.04)', borderRadius:18, padding:16, marginBottom:12, borderWidth:1, gap:14 },
  catIcon:             { width:52, height:52, borderRadius:16, alignItems:'center', justifyContent:'center' },
  catEmoji:            { fontSize:26 },
  catTitle:            { fontSize:16, fontWeight:'700', marginBottom:2 },
  catSub:              { fontSize:12, color:'rgba(255,255,255,0.35)' },
  catArrow:            { fontSize:22, color:'rgba(255,255,255,0.2)' },
  infoBanner:          { backgroundColor:'rgba(22,163,74,0.1)', borderRadius:14, padding:14, flexDirection:'row', gap:10, marginTop:8, borderWidth:1, borderColor:'rgba(22,163,74,0.2)' },
  infoEmoji:           { fontSize:20 },
  infoTxt:             { fontSize:12, color:'rgba(255,255,255,0.45)', lineHeight:18, flex:1 },

  // Language step
  centerContent:       { alignItems:'center', paddingTop:20 },
  langSelectEmoji:     { fontSize:60, marginBottom:12 },
  langOptionBtn:       { width:'100%', flexDirection:'row', alignItems:'center', gap:16, backgroundColor:'rgba(255,255,255,0.05)', borderRadius:18, padding:18, marginBottom:12, borderWidth:1.5 },
  langOptionFlag:      { fontSize:32 },
  langOptionTitle:     { fontSize:18, fontWeight:'700', color:'#ffffff', marginBottom:2 },
  langOptionSub:       { fontSize:12, color:'rgba(255,255,255,0.4)' },

  // Questions
  progressWrap:        { marginTop:20, marginBottom:16 },
  progressBg:          { height:6, backgroundColor:'rgba(255,255,255,0.1)', borderRadius:3, marginBottom:8, overflow:'hidden' },
  progressFill:        { height:6, borderRadius:3 },
  progressTxt:         { fontSize:12, color:'rgba(255,255,255,0.4)', textAlign:'right' },
  qTitle:              { fontSize:18, fontWeight:'700', color:'#ffffff', marginBottom:20, lineHeight:26 },
  optionsWrap:         { gap:10, marginBottom:20 },
  optionBtn:           { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(255,255,255,0.05)', borderRadius:16, padding:16, gap:12, borderWidth:1 },
  optionDot:           { width:10, height:10, borderRadius:5 },
  optionTxt:           { fontSize:15, color:'#ffffff', fontWeight:'500', flex:1 },
  prevAnswers:         { backgroundColor:'rgba(74,222,128,0.08)', borderRadius:14, padding:14, borderWidth:1, borderColor:'rgba(74,222,128,0.15)' },
  prevTitle:           { fontSize:12, color:'#4ade80', fontWeight:'700', marginBottom:6 },
  prevItem:            { fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:3 },

  // Symptoms
  summaryCard:         { backgroundColor:'rgba(255,255,255,0.04)', borderRadius:16, padding:16, marginBottom:16, borderWidth:1, borderColor:'rgba(255,255,255,0.08)' },
  summaryTitle:        { fontSize:13, color:'#4ade80', fontWeight:'700', marginBottom:10 },
  summaryRow:          { flexDirection:'row', gap:8, marginBottom:6 },
  summaryDot:          { fontSize:12 },
  summaryTxt:          { fontSize:13, color:'rgba(255,255,255,0.55)', flex:1 },
  symptomsInput:       { backgroundColor:'rgba(255,255,255,0.06)', borderRadius:16, padding:16, color:'#ffffff', fontSize:14, borderWidth:1, borderColor:'rgba(255,255,255,0.12)', minHeight:120, marginBottom:20, lineHeight:22 },
  getBtn:              { backgroundColor:'#16a34a', borderRadius:16, paddingVertical:16, alignItems:'center' },
  getBtnTxt:           { color:'#ffffff', fontSize:16, fontWeight:'800' },

  // Loading
  loadingWrap:         { alignItems:'center', paddingVertical:60 },
  loadingEmoji:        { fontSize:56, marginBottom:16 },
  loadingTitle:        { fontSize:18, fontWeight:'700', color:'#4ade80', textAlign:'center', marginBottom:8 },
  loadingSub:          { fontSize:13, color:'rgba(255,255,255,0.4)', textAlign:'center', lineHeight:20, marginBottom:24 },
  loadingDots:         { flexDirection:'row', gap:8 },
  loadDot:             { width:10, height:10, borderRadius:5, backgroundColor:'#4ade80' },

  // Results
  resultHeader:        { alignItems:'center', backgroundColor:'rgba(22,163,74,0.12)', borderRadius:20, padding:20, marginBottom:16, borderWidth:1, borderColor:'rgba(22,163,74,0.25)' },
  resultHeaderEmoji:   { fontSize:44, marginBottom:8 },
  resultHeaderTitle:   { fontSize:18, fontWeight:'800', color:'#4ade80', textAlign:'center', marginBottom:4 },
  resultHeaderSub:     { fontSize:13, color:'rgba(255,255,255,0.5)' },
  resultSection:       { backgroundColor:'rgba(255,255,255,0.04)', borderRadius:16, padding:16, marginBottom:12, borderWidth:1, borderColor:'rgba(255,255,255,0.08)' },
  warningSection:      { backgroundColor:'rgba(251,191,36,0.08)', borderColor:'rgba(251,191,36,0.2)' },
  resultSectionHeader: { flexDirection:'row', alignItems:'center', gap:8, marginBottom:10 },
  resultSectionEmoji:  { fontSize:18 },
  resultSectionTitle:  { fontSize:14, fontWeight:'700', color:'#4ade80' },
  resultSectionTxt:    { fontSize:14, color:'rgba(255,255,255,0.65)', lineHeight:22 },
  disclaimer:          { backgroundColor:'rgba(255,255,255,0.03)', borderRadius:14, padding:14, marginBottom:16, borderWidth:1, borderColor:'rgba(255,255,255,0.06)' },
  disclaimerTxt:       { fontSize:12, color:'rgba(255,255,255,0.35)', lineHeight:18, textAlign:'center' },
  resetBtn:            { backgroundColor:'rgba(255,255,255,0.06)', borderRadius:16, paddingVertical:15, alignItems:'center', borderWidth:1, borderColor:'rgba(74,222,128,0.3)' },
  resetBtnTxt:         { color:'#4ade80', fontSize:14, fontWeight:'700' },
});
