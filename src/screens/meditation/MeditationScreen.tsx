import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

const sessions = [
  { id: '1', emoji: '🌅', title: 'Morning Pranayama', duration: 10, type: 'Breathing', gradient: Colors.gradientGreen },
  { id: '2', emoji: '🧘', title: 'Dosha Balancing', duration: 20, type: 'Meditation', gradient: Colors.gradientVata },
  { id: '3', emoji: '🌙', title: 'Evening Relaxation', duration: 15, type: 'Sleep', gradient: Colors.gradientKapha },
  { id: '4', emoji: '❤️', title: 'Heart Chakra Healing', duration: 25, type: 'Chakra', gradient: Colors.gradientPitta },
  { id: '5', emoji: '🌿', title: 'Nature Soundscape', duration: 30, type: 'Ambient', gradient: Colors.gradientAccent },
];

const MeditationScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={Colors.gradientVata} style={styles.header}>
        <Text style={styles.headerEmoji}>🧘</Text>
        <Text style={styles.headerTitle}>Meditation</Text>
        <Text style={styles.headerSubtitle}>Mind-body balance through Ayurvedic practice</Text>
      </LinearGradient>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Daily Quote */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>
            "The secret of health for both mind and body is not to mourn for the past, worry about the
            future, or anticipate troubles, but to live in the present moment wisely."
          </Text>
          <Text style={styles.quoteAuthor}>— Buddha</Text>
        </View>

        {/* Sessions */}
        <Text style={styles.sectionTitle}>Guided Sessions</Text>
        {sessions.map(s => (
          <TouchableOpacity key={s.id} style={styles.sessionCard} activeOpacity={0.85}>
            <LinearGradient
              colors={s.gradient}
              style={styles.sessionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}>
              <Text style={styles.sessionEmoji}>{s.emoji}</Text>
              <View style={styles.sessionText}>
                <Text style={styles.sessionTitle}>{s.title}</Text>
                <View style={styles.sessionMeta}>
                  <Text style={styles.sessionType}>{s.type}</Text>
                  <Text style={styles.sessionDot}>•</Text>
                  <Text style={styles.sessionDuration}>{s.duration} min</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.playBtn}>
                <Text style={styles.playIcon}>▶</Text>
              </TouchableOpacity>
            </LinearGradient>
          </TouchableOpacity>
        ))}

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 60,
    paddingBottom: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  headerEmoji: { fontSize: 52, marginBottom: Spacing.sm },
  headerTitle: { fontSize: Typography['3xl'], fontWeight: '800', color: Colors.textPrimary },
  headerSubtitle: { fontSize: Typography.base, color: Colors.textSecondary, marginTop: Spacing.xs, textAlign: 'center' },
  body: { flex: 1, padding: Spacing.xl },
  quoteCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: Colors.vata,
  },
  quoteText: { fontSize: Typography.base, color: Colors.textSecondary, lineHeight: 24, fontStyle: 'italic' },
  quoteAuthor: { fontSize: Typography.sm, color: Colors.vataLight, marginTop: Spacing.sm, fontWeight: '600' },
  sectionTitle: { fontSize: Typography.xl, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.base },
  sessionCard: { borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: Spacing.md },
  sessionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  sessionEmoji: { fontSize: 36 },
  sessionText: { flex: 1 },
  sessionTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary },
  sessionMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: Spacing.xs },
  sessionType: { fontSize: Typography.sm, color: Colors.textSecondary },
  sessionDot: { color: Colors.textMuted },
  sessionDuration: { fontSize: Typography.sm, color: Colors.textSecondary },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: { fontSize: 16, color: Colors.textPrimary, marginLeft: 3 },
  bottomPad: { height: Spacing['3xl'] },
});

export default MeditationScreen;
