import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  loading?: boolean;
  /** Short text shown next to the spinner, e.g. "Signing in…". */
  loadingLabel?: string;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  colors?: string[];
}

const HerbalButton = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  loadingLabel,
  disabled = false,
  style,
  textStyle,
  icon,
  fullWidth = true,
  accessibilityLabel,
  accessibilityHint,
  colors,
}: Props) => {
  const isDisabled = disabled || loading;
  const a11y = {
    accessibilityRole: 'button' as const,
    accessibilityLabel: accessibilityLabel ?? title,
    accessibilityHint,
    accessibilityState: { disabled: isDisabled, busy: loading },
  };

  const renderContent = (textColorStyle: TextStyle, spinnerColor: string) =>
    loading ? (
      <View style={styles.content}>
        <ActivityIndicator color={spinnerColor} size="small" />
        {loadingLabel ? (
          <Text style={[styles.text, textColorStyle, textStyle]}>{loadingLabel}</Text>
        ) : null}
      </View>
    ) : (
      <View style={styles.content}>
        {icon && <View style={styles.iconWrap}>{icon}</View>}
        <Text style={[styles.text, textColorStyle, isDisabled && styles.textDisabled, textStyle]}>
          {title}
        </Text>
      </View>
    );

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[styles.wrapper, fullWidth && styles.fullWidth, style]}
        {...a11y}>
        <LinearGradient
          colors={
            isDisabled && !loading
              ? [Colors.cardBorder, Colors.cardBorder]
              : colors ?? Colors.gradientGreen
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}>
          {renderContent(styles.textPrimary, Colors.textPrimary)}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}
        style={[
          styles.wrapper,
          styles.outline,
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabledOutline,
          style,
        ]}
        {...a11y}>
        {renderContent(styles.textOutline, Colors.primaryLight)}
      </TouchableOpacity>
    );
  }

  if (variant === 'ghost') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.6}
        style={[styles.ghost, fullWidth && styles.fullWidth, style]}
        {...a11y}>
        {renderContent(styles.textGhost, Colors.textSecondary)}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.wrapper,
        styles.secondary,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabledSecondary,
        style,
      ]}
      {...a11y}>
      {renderContent(styles.textSecondary, Colors.primaryLight)}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.md,
  },
  fullWidth: {
    width: '100%',
  },
  gradient: {
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    backgroundColor: 'transparent',
  },
  secondary: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  ghost: {
    minHeight: 44,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  iconWrap: {
    marginRight: 4,
  },
  text: {
    fontSize: Typography.md,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  textPrimary: {
    color: Colors.textPrimary,
  },
  textOutline: {
    color: Colors.primaryLight,
  },
  textSecondary: {
    color: Colors.primaryLight,
  },
  textGhost: {
    color: Colors.textSecondary,
  },
  textDisabled: {
    color: Colors.textSecondary,
  },
  disabledOutline: {
    borderColor: Colors.textDisabled,
    opacity: 0.5,
  },
  disabledSecondary: {
    opacity: 0.5,
  },
});

export default HerbalButton;
