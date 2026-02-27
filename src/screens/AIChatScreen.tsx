// src/screens/AIChatScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, KeyboardAvoidingView,
  Platform, TouchableOpacity, Animated,
} from 'react-native';
import { chatWithHerbalAI } from '../services/geminiService';
import C from '../styles/colors';
import { Dosha } from '../data/appData';

interface Message { id: string; role: 'user' | 'ai'; text: string; }

interface Props { onBack: () => void; dosha: Dosha; }

export default function AIChatScreen({ onBack, dosha }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0', role: 'ai',
      text: `Namaste! 🌿 I'm your HerbalClinic AI assistant. I can help you with:\n\n• Skin concerns & remedies\n• Ayurvedic herb advice\n• Dosha-based skincare tips\n• Stress & skin connection\n\nWhat would you like to know today?`,
    },
  ]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Typing indicator dots
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  const typingAnim = useRef<any>(null);

  const startTyping = () => {
    const bounce = (dot: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, { toValue:-6, duration:300, useNativeDriver:true }),
        Animated.timing(dot, { toValue:0,  duration:300, useNativeDriver:true }),
        Animated.delay(600),
      ]));
    typingAnim.current = Animated.parallel([
      bounce(dot1, 0), bounce(dot2, 150), bounce(dot3, 300),
    ]);
    typingAnim.current.start();
  };

  const stopTyping = () => { typingAnim.current?.stop(); [dot1,dot2,dot3].forEach(d=>d.setValue(0)); };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role:'user', text:input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    startTyping();

    try {
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const reply   = await chatWithHerbalAI(userMsg.text, history, dosha ?? undefined);
      setMessages(prev => [...prev, { id: Date.now().toString(), role:'ai', text:reply }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role:'ai',
        text: '⚠️ Sorry, I could not connect to the AI. Please check your internet connection and API key.',
      }]);
    } finally {
      setLoading(false);
      stopTyping();
    }
  };

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 100);
  }, [messages, loading]);

  const quickQuestions = [
    'Best herb for acne?',
    'How to reduce redness?',
    'Herbs for dry skin?',
    'Meditation for skin?',
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backTxt}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🤖 HerbalClinic AI</Text>
          <View style={styles.onlineDot} />
        </View>
        <View style={{ width:60 }} />
      </View>

      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.chatPad}
          keyboardShouldPersistTaps="handled">

          {messages.map(m => (
            <View key={m.id} style={[styles.bubble, m.role==='user' ? styles.userBubble : styles.aiBubble]}>
              {m.role === 'ai' && <Text style={styles.aiLabel}>🌿 HerbalClinic AI</Text>}
              <Text style={[styles.bubbleTxt, m.role==='user' && styles.userTxt]}>{m.text}</Text>
            </View>
          ))}

          {/* Typing indicator */}
          {loading && (
            <View style={[styles.bubble, styles.aiBubble]}>
              <Text style={styles.aiLabel}>🌿 HerbalClinic AI</Text>
              <View style={styles.typingRow}>
                {[dot1,dot2,dot3].map((d,i)=>(
                  <Animated.View key={i} style={[styles.typingDot, { transform:[{translateY:d}] }]}/>
                ))}
              </View>
            </View>
          )}

        </ScrollView>

        {/* Quick questions */}
        {messages.length <= 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRow}>
            {quickQuestions.map(q => (
              <TouchableOpacity key={q} style={styles.quickChip} onPress={() => { setInput(q); }}>
                <Text style={styles.quickTxt}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask about herbs, skin, Ayurveda..."
            placeholderTextColor={C.muted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={300}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim()||loading) && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!input.trim() || loading}>
            <Text style={styles.sendTxt}>➤</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:       { flex:1, backgroundColor:C.bg },
  header:       { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingTop:16, paddingBottom:12, borderBottomWidth:1, borderBottomColor:C.surface },
  backBtn:      { width:60 },
  backTxt:      { color:C.accent, fontSize:14, fontWeight:'600' },
  headerCenter: { alignItems:'center', flexDirection:'row', gap:8 },
  headerTitle:  { fontSize:16, fontWeight:'700', color:C.text },
  onlineDot:    { width:8, height:8, borderRadius:4, backgroundColor:C.accent },
  chatPad:      { padding:16, paddingBottom:8, gap:12 },
  bubble:       { maxWidth:'85%', borderRadius:18, padding:14 },
  aiBubble:     { backgroundColor:C.surface, alignSelf:'flex-start', borderWidth:1, borderColor:'#1a3a5c' },
  userBubble:   { backgroundColor:C.accentDim, alignSelf:'flex-end' },
  aiLabel:      { fontSize:11, color:C.accent, fontWeight:'700', marginBottom:6 },
  bubbleTxt:    { fontSize:14, color:C.muted, lineHeight:21 },
  userTxt:      { color:C.text },
  typingRow:    { flexDirection:'row', gap:5, paddingVertical:4 },
  typingDot:    { width:8, height:8, borderRadius:4, backgroundColor:C.accent },
  quickRow:     { paddingHorizontal:16, paddingVertical:8 },
  quickChip:    { backgroundColor:C.surface, borderRadius:20, paddingHorizontal:14, paddingVertical:8, marginRight:8, borderWidth:1, borderColor:'#1a3a5c' },
  quickTxt:     { color:C.accent, fontSize:12, fontWeight:'600' },
  inputBar:     { flexDirection:'row', alignItems:'flex-end', paddingHorizontal:16, paddingVertical:12, borderTopWidth:1, borderTopColor:C.surface, gap:10 },
  textInput:    { flex:1, backgroundColor:C.surface, borderRadius:20, paddingHorizontal:16, paddingVertical:10, color:C.text, fontSize:14, maxHeight:100, borderWidth:1, borderColor:'#1a3a5c' },
  sendBtn:      { backgroundColor:C.accent, width:44, height:44, borderRadius:22, alignItems:'center', justifyContent:'center' },
  sendBtnDisabled:{ backgroundColor:C.accentDim, opacity:0.5 },
  sendTxt:      { color:'#0a1628', fontSize:18, fontWeight:'800' },
});
