// src/screens/HerbsScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, StatusBar } from 'react-native';
import C from '../styles/colors';
import { FadeIn, SlideInRight, AnimatedButton } from '../components/Animations';
import { Dosha, HERBS } from '../data/appData';

interface Props { onBack:()=>void; dosha:Dosha; }

export default function HerbsScreen({ onBack, dosha }: Props) {
  const [filter, setFilter] = useState('All');
  const filters = ['All','Vata','Pitta','Kapha'];
  const filtered = filter==='All' ? HERBS : HERBS.filter(h=>h.dosha===filter||h.dosha==='All');
  const tagColor = (d:string) => d==='Pitta'?C.pitta : d==='Vata'?C.vata : d==='Kapha'?C.kapha : C.accent;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.header}>
        <AnimatedButton onPress={onBack} color="transparent" style={styles.backBtn}>
          <Text style={styles.backTxt}>← Back</Text>
        </AnimatedButton>
        <Text style={styles.title}>🌿 Herb Library</Text>
        <View style={{ width:60 }} />
      </View>
      <ScrollView contentContainerStyle={styles.pad}>
        {dosha && (
          <FadeIn>
            <View style={styles.tipCard}>
              <Text style={styles.tipHead}>💡 Your {dosha} Dosha Herbs</Text>
              <Text style={styles.tipBody}>Highlighted herbs are specially suited for your skin type.</Text>
            </View>
          </FadeIn>
        )}
        {/* Filter tabs */}
        <FadeIn delay={100}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:16 }}>
            <View style={{ flexDirection:'row', gap:8, paddingRight:16 }}>
              {filters.map(f => (
                <AnimatedButton key={f} onPress={() => setFilter(f)}
                  color={filter===f ? C.accentDim : C.surface}
                  style={{...styles.tab, ...(filter===f && styles.tabActive)}}>
                  <Text style={[styles.tabTxt, filter===f && styles.tabActiveTxt]}>{f}</Text>
                </AnimatedButton>
              ))}
            </View>
          </ScrollView>
        </FadeIn>
        {filtered.map((h, i) => (
          <SlideInRight key={h.id} delay={i * 70}>
            <View style={[styles.herbCard, (h.dosha===dosha||h.dosha==='All') && styles.herbHL]}>
              <Text style={styles.herbEmoji}>{h.emoji}</Text>
              <View style={{ flex:1 }}>
                <Text style={styles.herbName}>{h.name}</Text>
                <Text style={styles.herbUse}>{h.use}</Text>
                <Text style={[styles.herbDosha, { color:tagColor(h.dosha) }]}>✦ {h.dosha} type</Text>
              </View>
            </View>
          </SlideInRight>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:    { flex:1, backgroundColor:C.bg },
  pad:       { paddingHorizontal:20, paddingBottom:40 },
  header:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingTop:16, paddingBottom:12 },
  backBtn:   { width:60 },
  backTxt:   { color:C.accent, fontSize:14, fontWeight:'600' },
  title:     { fontSize:17, fontWeight:'700', color:C.text },
  tipCard:   { backgroundColor:'#0c2a1a', borderRadius:14, padding:16, borderWidth:1, borderColor:'#1a4a2a', marginBottom:16 },
  tipHead:   { fontSize:14, fontWeight:'700', color:C.accent, marginBottom:6 },
  tipBody:   { fontSize:13, color:C.muted, lineHeight:20 },
  tab:       { paddingHorizontal:16, paddingVertical:8, borderRadius:20, borderWidth:1, borderColor:'#1a3a5c' },
  tabActive: { borderColor:C.accent },
  tabTxt:    { fontSize:13, color:C.muted, fontWeight:'600' },
  tabActiveTxt:{ color:C.accent },
  herbCard:  { flexDirection:'row', backgroundColor:C.card, borderRadius:14, padding:16, marginBottom:10, borderWidth:1, borderColor:'#1a3a5c', gap:12 },
  herbHL:    { borderColor:C.accent, backgroundColor:'#0c2a1a' },
  herbEmoji: { fontSize:30 },
  herbName:  { fontSize:15, fontWeight:'700', color:C.text, marginBottom:3 },
  herbUse:   { fontSize:13, color:C.muted, marginBottom:4, lineHeight:18 },
  herbDosha: { fontSize:12, fontWeight:'600' },
});