import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/theme';

type Props = TextInputProps & {
  label: string;
  error?: string | null;
  /** Renders a Show/Hide control and keeps the value masked by default. */
  passwordToggle?: boolean;
};

const FormField = forwardRef<TextInput, Props>(
  ({ label, error, passwordToggle = false, style, onFocus, onBlur, secureTextEntry, ...inputProps }, ref) => {
    const [focused, setFocused] = useState(false);
    const [hidden, setHidden] = useState(true);

    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.inputRow, focused && styles.inputFocused, error ? styles.inputError : null]}>
          <TextInput
            ref={ref}
            placeholderTextColor={Colors.textMuted}
            accessibilityLabel={label}
            {...inputProps}
            secureTextEntry={passwordToggle ? hidden : secureTextEntry}
            style={[styles.input, style]}
            onFocus={event => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={event => {
              setFocused(false);
              onBlur?.(event);
            }}
          />
          {passwordToggle ? (
            <TouchableOpacity
              style={styles.toggle}
              onPress={() => setHidden(value => !value)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
              <Text style={styles.toggleText}>{hidden ? 'Show' : 'Hide'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  field: { marginTop: Spacing.md },
  label: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  inputFocused: { borderColor: Colors.primaryLight },
  inputError: { borderColor: Colors.error },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography.base,
  },
  toggle: {
    minHeight: 44,
    paddingHorizontal: Spacing.base,
    justifyContent: 'center',
  },
  toggleText: { color: Colors.primaryLight, fontWeight: '700', fontSize: Typography.sm },
  error: { color: '#ff9a9a', fontSize: Typography.sm, marginTop: Spacing.xs },
});

export default FormField;
