import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/theme';
import { Language, useLanguage } from '../i18n';

// Each option is always written in its own language so it can be found before switching.
const OPTIONS: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'si', label: 'සිංහල' },
];

type Props = {
  style?: ViewStyle;
  compact?: boolean;
};

const LanguageSelector: React.FC<Props> = ({ style, compact = false }) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <View
      style={[styles.group, style]}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('language.label')}>
      {OPTIONS.map((option, index) => {
        const selected = language === option.id;
        return (
          <React.Fragment key={option.id}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <TouchableOpacity
              testID={`language-option-${option.id}`}
              style={[styles.option, compact && styles.optionCompact, selected && styles.optionSelected]}
              onPress={() => setLanguage(option.id)}
              activeOpacity={0.75}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected, checked: selected }}>
              <Text style={[styles.text, selected && styles.textSelected]}>{option.label}</Text>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(240,244,241,0.35)',
    borderRadius: BorderRadius.full,
    padding: 3,
    backgroundColor: 'rgba(10,15,13,0.35)',
  },
  divider: { width: 1, height: 18, backgroundColor: 'rgba(240,244,241,0.2)', marginHorizontal: 2 },
  option: {
    minHeight: 40,
    minWidth: 76,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCompact: { minHeight: 34, minWidth: 64, paddingHorizontal: Spacing.md },
  optionSelected: { backgroundColor: Colors.primaryDark, borderWidth: 1, borderColor: Colors.primaryLight },
  text: { color: 'rgba(240,244,241,0.85)', fontWeight: '600', fontSize: Typography.base },
  textSelected: { color: Colors.textPrimary, fontWeight: '700' },
});

export default LanguageSelector;
