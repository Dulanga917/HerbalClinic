import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { MEDITATION_SESSIONS } from '../../constants/ayurveda';

const durationToSeconds = (duration: string): number => {
  const minutes = Number.parseInt(duration, 10);
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : 10 * 60;
};

const formatClock = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const MeditationScreen: React.FC = () => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);

  const session = useMemo(
    () => MEDITATION_SESSIONS.find(item => item.id === activeId) || null,
    [activeId],
  );

  useEffect(() => {
    if (!running || remaining <= 0) {
      return undefined;
    }
    const timer = setInterval(() => {
      setRemaining(value => {
        if (value <= 1) {
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running, remaining]);

  const openSession = (id: string) => {
    const next = MEDITATION_SESSIONS.find(item => item.id === id);
    if (!next) {
      return;
    }
    setActiveId(id);
    setRemaining(durationToSeconds(next.duration));
    setRunning(false);
  };

  const closeSession = () => {
    setRunning(false);
    setActiveId(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <LinearGradient colors={Colors.gradientVata} style={styles.header}>
        <Text style={styles.headerEmoji}>🧘</Text>
        <Text style={styles.headerTitle}>Meditation</Text>
        <Text style={styles.headerSubtitle}>Mind-body balance through Ayurvedic practice</Text>
      </LinearGradient>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>
            "The secret of health for both mind and body is not to mourn for the past, worry about the
            future, or anticipate troubles, but to live in the present moment wisely."
          </Text>
          <Text style={styles.quoteAuthor}>— Buddha</Text>
        </View>

        <Text style={styles.sectionTitle}>Guided Sessions</Text>
        {MEDITATION_SESSIONS.map(s => (
          <TouchableOpacity
            key={s.id}
            style={styles.sessionCard}
            activeOpacity={0.85}
            onPress={() => openSession(s.id)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${s.title}`}>
            <LinearGradient
              colors={[s.color, Colors.surface]}
              style={styles.sessionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}>
              <Text style={styles.sessionEmoji}>{s.emoji}</Text>
              <View style={styles.sessionText}>
                <Text style={styles.sessionTitle}>{s.title}</Text>
                <View style={styles.sessionMeta}>
                  <Text style={styles.sessionType}>{s.level}</Text>
                  <Text style={styles.sessionDot}>•</Text>
                  <Text style={styles.sessionDuration}>{s.duration}</Text>
                </View>
              </View>
              <View style={styles.playBtn}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}

        <View style={styles.bottomPad} />
      </ScrollView>

      <Modal visible={!!session} transparent animationType="slide" onRequestClose={closeSession}>
        <View style={styles.modalBackdrop}>
          <ScrollView style={styles.modalCard} contentContainerStyle={styles.modalScroll}>
            <Text style={styles.modalEmoji}>{session?.emoji}</Text>
            <Text style={styles.modalTitle}>{session?.title}</Text>
            <Text style={styles.modalSub}>{session?.description}</Text>
            <Text style={styles.clock}>{formatClock(remaining)}</Text>
            <View style={styles.timerRow}>
              <TouchableOpacity
                style={styles.timerBtn}
                onPress={() => {
                  if (remaining === 0 && session) {
                    setRemaining(durationToSeconds(session.duration));
                    setRunning(true);
                    return;
                  }
                  setRunning(value => !value);
                }}
                accessibilityRole="button">
                <Text style={styles.closeText}>{running ? 'Pause' : remaining === 0 ? 'Restart' : 'Start'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.timerBtn}
                onPress={() => {
                  if (session) {
                    setRemaining(durationToSeconds(session.duration));
                    setRunning(false);
                  }
                }}>
                <Text style={styles.closeText}>Reset</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionTitle}>Steps</Text>
            {(session?.steps || []).map(step => (
              <Text key={step} style={styles.step}>
                • {step}
              </Text>
            ))}
            <Text style={styles.sectionTitle}>Benefits</Text>
            {(session?.benefits || []).map(benefit => (
              <Text key={benefit} style={styles.step}>
                • {benefit}
              </Text>
            ))}
            <TouchableOpacity style={styles.closeBtn} onPress={closeSession}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    maxHeight: '90%',
  },
  modalScroll: { paddingBottom: Spacing.xl },
  modalEmoji: { fontSize: 44, textAlign: 'center' },
  modalTitle: { fontSize: Typography.xl, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  modalSub: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.md },
  clock: {
    fontSize: Typography['4xl'],
    fontWeight: '800',
    color: Colors.primaryLight,
    textAlign: 'center',
    marginVertical: Spacing.md,
  },
  timerRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  timerBtn: {
    flex: 1,
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  step: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 22, marginBottom: 4 },
  closeBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  closeText: { color: Colors.textPrimary, fontWeight: '700' },
});

export default MeditationScreen;
