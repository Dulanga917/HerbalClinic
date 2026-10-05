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
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const HerbalButton = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  fullWidth = true,
}: Props) => {
  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[styles.wrapper, fullWidth && styles.fullWidth, style]}>
        <LinearGradient
          colors={isDisabled ? ['#2A3F2F', '#2A3F2F'] : Colors.gradientGreen as string[]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}>
          {loading ? (
            <ActivityIndicator color={Colors.textPrimary} size="small" />
          ) : (
            <View style={styles.content}>
              {icon && <View style={styles.iconWrap}>{icon}</View>}
              <Text style={[styles.text, styles.textPrimary, textStyle]}>{title}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[
          styles.wrapper,
          styles.outline,
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabledOutline,
          style,
        ]}>
        {loading ? (
          <ActivityIndicator color={Colors.primaryLight} size="small" />
        ) : (
          <View style={styles.content}>
            {icon && <View style={styles.iconWrap}>{icon}</View>}
            <Text style={[styles.text, styles.textOutline, textStyle]}>{title}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'ghost') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}
        style={[styles.ghost, fullWidth && styles.fullWidth, style]}>
        <View style={styles.content}>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={[styles.text, styles.textGhost, textStyle]}>{title}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // secondary
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.wrapper,
        styles.secondary,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabledSecondary,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={Colors.primary} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={[styles.text, styles.textSecondary, textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: BorderRadius.xl,
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
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  ghost: {
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
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  textPrimary: {
    color: Colors.textPrimary,
  },
  textOutline: {
    color: Colors.primaryLight,
  },
  textSecondary: {
    color: Colors.textPrimary,
  },
  textGhost: {
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
