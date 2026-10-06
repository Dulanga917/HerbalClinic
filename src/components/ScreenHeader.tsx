import React, { useContext } from 'react';
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/theme';

const FALLBACK_TOP_INSET = Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;

/** Top safe-area inset; falls back to the status bar height when no SafeAreaProvider is mounted (e.g. tests). */
export const useTopInset = (): number => {
  const insets = useContext(SafeAreaInsetsContext);
  return insets?.top ?? FALLBACK_TOP_INSET;
};

type BackButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
};

export const BackButton: React.FC<BackButtonProps> = ({ onPress, accessibilityLabel = 'Back' }) => (
  <TouchableOpacity
    style={styles.backBtn}
    onPress={onPress}
    activeOpacity={0.6}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}>
    <Text style={styles.backIcon}>‹</Text>
  </TouchableOpacity>
);

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  emoji?: string;
  onBack?: () => void;
  backLabel?: string;
  right?: React.ReactNode;
  colors?: string[];
  /** `hero` centres a large emoji + title; `compact` puts the title beside the Back button. */
  variant?: 'hero' | 'compact';
  style?: ViewStyle;
};

const ScreenHeader: React.FC<Props> = ({
  title,
  subtitle,
  eyebrow,
  emoji,
  onBack,
  backLabel,
  right,
  colors = Colors.gradientGreen,
  variant = 'hero',
  style,
}) => {
  const topInset = useTopInset();

  if (variant === 'compact') {
    return (
      <LinearGradient
        colors={colors}
        style={[styles.compact, { paddingTop: topInset + Spacing.md }, style]}>
        <View style={styles.compactRow}>
          {onBack ? <BackButton onPress={onBack} accessibilityLabel={backLabel} /> : null}
          <View style={styles.compactCopy}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text style={styles.compactTitle} accessibilityRole="header">
              {title}
            </Text>
          </View>
          {right ?? (emoji ? <Text style={styles.compactEmoji}>{emoji}</Text> : null)}
        </View>
        {subtitle ? <Text style={styles.compactSubtitle}>{subtitle}</Text> : null}
      </LinearGradient>
    );
  }

  const hasTopBar = Boolean(onBack || right);
  return (
    <LinearGradient
      colors={colors}
      style={[
        styles.hero,
        { paddingTop: topInset + (hasTopBar ? Spacing.md + 44 : Spacing.xl) },
        style,
      ]}>
      {hasTopBar ? (
        <View style={[styles.heroTopBar, { top: topInset + Spacing.sm }]}>
          {onBack ? <BackButton onPress={onBack} accessibilityLabel={backLabel} /> : <View />}
          {right ?? null}
        </View>
      ) : null}
      {emoji ? <Text style={styles.heroEmoji}>{emoji}</Text> : null}
      <Text style={styles.heroTitle} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 32,
    lineHeight: 34,
    color: Colors.textPrimary,
    marginTop: -3,
    marginLeft: -2,
    includeFontPadding: false,
  },
  compact: {
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  compactCopy: { flex: 1 },
  eyebrow: { color: 'rgba(240,244,241,0.78)', fontSize: Typography.sm, fontWeight: '600' },
  compactTitle: { color: Colors.textPrimary, fontSize: Typography.xl, fontWeight: '800' },
  compactEmoji: { fontSize: 32 },
  compactSubtitle: {
    color: 'rgba(240,244,241,0.85)',
    marginTop: Spacing.md,
    lineHeight: 20,
    fontSize: Typography.base,
  },
  hero: {
    paddingBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  heroTopBar: {
    position: 'absolute',
    left: Spacing.base,
    right: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroEmoji: { fontSize: 44, marginBottom: Spacing.sm },
  heroTitle: {
    fontSize: Typography['2xl'],
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: Typography.sm,
    color: 'rgba(240,244,241,0.85)',
    marginTop: Spacing.xs,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ScreenHeader;
