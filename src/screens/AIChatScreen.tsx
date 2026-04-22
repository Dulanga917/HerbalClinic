// src/screens/AIChatScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, KeyboardAvoidingView,
  Platform, TouchableOpacity, Animated, Dimensions,
} from 'react-native';
import { chatWithHerbalAI } from '../services/geminiService';
import { Dosha } from '../data/appData';

const { width } = Dimensions.get('window');

interface Message { id: string; role: 'user' | 'ai'; text: string; time: string; }
interface Props { onBack: () => void; dosha: Dosha; }

const getTime = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const QUICK_QUESTIONS = [
  ' Best herb for acne?',
  ' How to reduce redness?',
  ' Herbs for dry skin?',
  ' Meditation for skin?',
  ' Turmeric benefits?',
  ' Glow naturally?',
];

export default function AIChatScreen({ onBack, dosha }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0', role: 'ai', time: getTime(),
      text: `  I'm your HerbalClinic AI assistant.\n\nI can help you with:\n• Skin concerns & herbal remedies\n• Ayurvedic herb advice\n• Dosha-based skincare tips\n• Stress & skin connection\n\nWhat would you like to know today?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Typing dots
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  const typingAnim = useRef<any>(null);

  // Send button pulse
  const sendScale = useRef(new Animated.Value(1)).current;

  const startTyping = () => {
    const bounce = (dot: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, { toValue: -7, duration: 280, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.delay(500),
      ]));
    typingAnim.current = Animated.parallel([
      bounce(dot1, 0), bounce(dot2, 140), bounce(dot3, 280),
    ]);
    typingAnim.current.start();
  };

  const stopTyping = () => {
    typingAnim.current?.stop();
    [dot1, dot2, dot3].forEach(d => d.setValue(0));
  };

  const pulseSend = () => {
    Animated.sequence([
      Animated.spring(sendScale, { toValue: 0.88, useNativeDriver: true, speed: 30 }),
      Animated.spring(sendScale, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
  };

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    pulseSend();
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: msg, time: getTime() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    startTyping();

    try {
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const reply = await chatWithHerbalAI(msg, history, dosha ?? undefined);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: reply, time: getTime() }]);
    } catch (e: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'ai', time: getTime(),
        text: `⚠️ Connection issue: ${e?.message ?? 'Could not reach the AI. Check internet & API key.'}`,
      }]);
    } finally {
      setLoading(false);
      stopTyping();
    }
  };

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  }, [messages, loading]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Gradient Header ── */}
      <View style={styles.header}>
        <SafeAreaView style={styles.headerSafe}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.75}>
              <Text style={styles.backIcon}>‹</Text>
              <Text style={styles.backTxt}>Back</Text>
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <View style={styles.aiAvatar}>
                <Text style={styles.aiAvatarEmoji}>🤖</Text>
              </View>
              <View>
                <Text style={styles.headerTitle}>HerbalClinic AI</Text>
                <View style={styles.onlineRow}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineTxt}>Online • Gemini 2.0</Text>
                </View>
              </View>
            </View>

            <View style={{ width: 70 }} />
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Messages ── */}
        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m, idx) => (
            <View
              key={m.id}
              style={[
                styles.msgRow,
                m.role === 'user' ? styles.msgRowUser : styles.msgRowAi,
              ]}
            >
              {m.role === 'ai' && (
                <View style={styles.bubbleAvatar}>
                  <Text style={{ fontSize: 14 }}>🌿</Text>
                </View>
              )}

              <View style={m.role === 'user' ? styles.userBubble : styles.aiBubble}>
                {m.role === 'ai' && (
                  <Text style={styles.aiName}>HerbalClinic AI</Text>
                )}
                <Text style={m.role === 'user' ? styles.userTxt : styles.aiTxt}>
                  {m.text}
                </Text>
                <Text style={m.role === 'user' ? styles.timeUser : styles.timeAi}>
                  {m.time}
                </Text>
              </View>

              {m.role === 'user' && (
                <View style={styles.bubbleAvatarUser}>
                  <Text style={{ fontSize: 14 }}>👤</Text>
                </View>
              )}
            </View>
          ))}

          {/* Typing indicator */}
          {loading && (
            <View style={[styles.msgRow, styles.msgRowAi]}>
              <View style={styles.bubbleAvatar}>
                <Text style={{ fontSize: 14 }}>🌿</Text>
              </View>
              <View style={[styles.aiBubble, styles.typingBubble]}>
                <Text style={styles.aiName}>HerbalClinic AI</Text>
                <View style={styles.dotsRow}>
                  {[dot1, dot2, dot3].map((d, i) => (
                    <Animated.View key={i} style={[styles.dot, { transform: [{ translateY: d }] }]} />
                  ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── Quick Question Chips ── */}
        {messages.length <= 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickScroll}
            contentContainerStyle={styles.quickContent}
          >
            {QUICK_QUESTIONS.map(q => (
              <TouchableOpacity
                key={q}
                style={styles.chip}
                onPress={() => send(q.replace(/^[\p{Emoji}]\s*/u, ''))}
                activeOpacity={0.75}
              >
                <Text style={styles.chipTxt}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── Input Bar ── */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask about herbs, skin, Ayurveda..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={400}
            onSubmitEditing={() => send()}
          />
          <Animated.View style={{ transform: [{ scale: sendScale }] }}>
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnOff]}
              onPress={() => send()}
              disabled={!input.trim() || loading}
              activeOpacity={0.85}
            >
              <Text style={styles.sendIcon}>➤</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0414' },

  // Header
  header: { backgroundColor: '#0f0820', borderBottomWidth: 1, borderBottomColor: 'rgba(74,222,128,0.15)' },
  headerSafe: { paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 70 },
  backIcon: { fontSize: 28, color: '#4ade80', lineHeight: 30, fontWeight: '300' },
  backTxt: { fontSize: 14, color: '#4ade80', fontWeight: '600' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(74,222,128,0.2)', borderWidth: 1.5, borderColor: 'rgba(74,222,128,0.4)', alignItems: 'center', justifyContent: 'center' },
  aiAvatarEmoji: { fontSize: 20 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  onlineTxt: { fontSize: 11, color: 'rgba(74,222,128,0.8)', fontWeight: '500' },

  // Chat
  chatArea: { flex: 1 },
  chatContent: { padding: 16, gap: 12, paddingBottom: 8 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  msgRowAi: { justifyContent: 'flex-start' },
  msgRowUser: { justifyContent: 'flex-end' },

  bubbleAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(74,222,128,0.15)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  bubbleAvatarUser: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(96,165,250,0.15)', borderWidth: 1, borderColor: 'rgba(96,165,250,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },

  aiBubble: { maxWidth: width * 0.72, backgroundColor: 'rgba(15,20,45,0.95)', borderRadius: 20, borderBottomLeftRadius: 6, padding: 14, borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)' },
  userBubble: { maxWidth: width * 0.72, backgroundColor: 'rgba(22,101,52,0.85)', borderRadius: 20, borderBottomRightRadius: 6, padding: 14, borderWidth: 1, borderColor: 'rgba(74,222,128,0.35)' },
  typingBubble: { paddingVertical: 16 },

  aiName: { fontSize: 11, color: '#4ade80', fontWeight: '700', marginBottom: 6, letterSpacing: 0.3 },
  aiTxt: { fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 22 },
  userTxt: { fontSize: 14, color: '#ffffff', lineHeight: 22 },
  timeAi: { fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 6, textAlign: 'right' },
  timeUser: { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 6, textAlign: 'right' },

  dotsRow: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80', opacity: 0.8 },

  // Quick chips
  quickScroll: { maxHeight: 50 },
  quickContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: { backgroundColor: 'rgba(74,222,128,0.1)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)' },
  chipTxt: { color: '#4ade80', fontSize: 12, fontWeight: '600' },

  // Input bar
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 14, paddingVertical: 10, paddingBottom: 20, backgroundColor: 'rgba(10,4,20,0.98)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', gap: 10 },
  textInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 22, paddingHorizontal: 18, paddingVertical: 11, color: '#ffffff', fontSize: 14, maxHeight: 110, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sendBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#4ade80', alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: 'rgba(74,222,128,0.2)' },
  sendIcon: { color: '#0a1a0a', fontSize: 18, fontWeight: '800' },
});
