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
import ScreenHeader from '../../components/ScreenHeader';
import { useLanguage } from '../../i18n';
import { localizeMeditation } from '../../i18n/content';

// Timer lengths come from the English source ("10 min"); localized text is display-only.
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
  const { language, t } = useLanguage();

  const session = useMemo(
    () => MEDITATION_SESSIONS.find(item => item.id === activeId) || null,
    [activeId],
  );
  const sessionText = session ? localizeMeditation(session, language) : null;

  // One interval per run: depending on `remaining` would tear down and recreate it every second.
  useEffect(() => {
    if (!running) {
      return undefined;
    }
    const timer = setInterval(() => {
      setRemaining(value => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (running && remaining === 0) {
      setRunning(false);
    }
  }, [running, remaining]);

  const fullDuration = session ? durationToSeconds(session.duration) : 0;
  const timerStatus = t(
    running
      ? 'meditation.statusRunning'
      : remaining === 0
        ? 'meditation.statusComplete'
        : remaining < fullDuration
          ? 'meditation.statusPaused'
          : 'meditation.statusReady',
  );
  const primaryLabel = t(
    running
      ? 'meditation.pause'
      : remaining === 0
        ? 'meditation.restart'
        : remaining < fullDuration
          ? 'meditation.resume'
          : 'meditation.start',
  );
  const resetDisabled = !running && remaining === fullDuration;

  const toggleTimer = () => {
    if (remaining === 0 && session) {
      setRemaining(durationToSeconds(session.duration));
      setRunning(true);
      return;
    }
    setRunning(value => !value);
  };

  const resetTimer = () => {
    if (session) {
      setRemaining(durationToSeconds(session.duration));
      setRunning(false);
    }
  };

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

      <ScreenHeader
        emoji="🧘"
        title={t('feature.meditation.title')}
        subtitle={t('meditation.subtitle')}
        colors={Colors.gradientVata}
      />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>{t('meditation.quote')}</Text>
          <Text style={styles.quoteAuthor}>{t('meditation.quoteAuthor')}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t('meditation.guided')}</Text>
        {MEDITATION_SESSIONS.map(raw => localizeMeditation(raw, language)).map(s => (
          <TouchableOpacity
            key={s.id}
            style={styles.sessionCard}
            activeOpacity={0.85}
            onPress={() => openSession(s.id)}
            accessibilityRole="button"
            accessibilityLabel={t('common.open', { title: s.title })}>
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
          <View style={styles.modalCard}>
            <View style={styles.modalTopBar}>
              <TouchableOpacity
                style={styles.modalCloseIcon}
                onPress={closeSession}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('meditation.closeSessionA11y')}>
                <Text style={styles.modalCloseIconText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScroll}>
              <Text style={styles.modalEmoji}>{sessionText?.emoji}</Text>
              <Text style={styles.modalTitle}>{sessionText?.title}</Text>
              <Text style={styles.modalSub}>{sessionText?.description}</Text>
              <View style={styles.clockCard}>
                <Text
                  style={styles.clock}
                  accessibilityRole="timer"
                  accessibilityLabel={t('meditation.timerA11y', {
                    minutes: Math.floor(remaining / 60),
                    seconds: remaining % 60,
                  })}>
                  {formatClock(remaining)}
                </Text>
                <Text style={[styles.timerStatus, running && styles.timerStatusActive]}>{timerStatus}</Text>
              </View>
              <View style={styles.timerRow}>
                <TouchableOpacity
                  style={[styles.timerBtn, styles.timerBtnPrimary]}
                  onPress={toggleTimer}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={t('meditation.primaryA11y', { label: primaryLabel })}>
                  <Text style={styles.timerBtnText}>{primaryLabel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timerBtn, resetDisabled && styles.timerBtnDisabled]}
                  onPress={resetTimer}
                  disabled={resetDisabled}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={t('meditation.resetA11y')}
                  accessibilityState={{ disabled: resetDisabled }}>
                  <Text style={styles.timerBtnText}>{t('meditation.reset')}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionTitle}>{t('meditation.steps')}</Text>
              {(sessionText?.steps || []).map(step => (
                <Text key={step} style={styles.step}>
                  • {step}
                </Text>
              ))}
              <Text style={styles.sectionTitle}>{t('meditation.benefits')}</Text>
              {(sessionText?.benefits || []).map(benefit => (
                <Text key={benefit} style={styles.step}>
                  • {benefit}
                </Text>
              ))}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={closeSession}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}>
                <Text style={styles.closeText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  sessionMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 4, gap: Spacing.xs },
  sessionType: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.85)' },
  sessionDot: { color: 'rgba(255,255,255,0.6)' },
  sessionDuration: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.85)' },
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    maxHeight: '90%',
  },
  modalTopBar: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalCloseIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseIconText: { color: Colors.textPrimary, fontSize: Typography.md, fontWeight: '700' },
  modalScrollView: { flexGrow: 0 },
  modalScroll: { paddingBottom: Spacing.xl },
  modalEmoji: { fontSize: 44, textAlign: 'center' },
  modalTitle: { fontSize: Typography.xl, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  modalSub: {
    fontSize: Typography.sm,
    lineHeight: 21,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  clockCard: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    marginBottom: Spacing.md,
  },
  clock: {
    fontSize: 44,
    fontWeight: '800',
    color: Colors.primaryLight,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  timerStatus: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: Spacing.xs, fontWeight: '600' },
  timerStatusActive: { color: Colors.primaryLight },
  timerRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  timerBtn: {
    flex: 1,
    minHeight: 50,
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  timerBtnPrimary: { backgroundColor: Colors.primary, borderColor: Colors.primaryLight },
  timerBtnDisabled: { opacity: 0.4 },
  timerBtnText: { color: Colors.textPrimary, fontWeight: '700', fontSize: Typography.md, textAlign: 'center' },
  step: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 22, marginBottom: 4 },
  closeBtn: {
    marginTop: Spacing.xl,
    minHeight: 48,
    justifyContent: 'center',
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
