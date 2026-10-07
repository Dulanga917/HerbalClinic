import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { HomeTabParamList } from './types';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useLanguage } from '../i18n';

import HomeScreen from '../screens/home/HomeScreen';
import SkinStackNavigator from './SkinStackNavigator';
import HerbalTreatmentScreen from '../screens/herbal/HerbalTreatmentScreen';
import MeditationScreen from '../screens/meditation/MeditationScreen';
import ProfileScreen from '../screens/home/ProfileScreen';

const Tab = createBottomTabNavigator<HomeTabParamList>();

// Custom Tab Bar Icon
const TabIcon = ({
  emoji,
  label,
  focused,
}: {
  emoji: string;
  label: string;
  focused: boolean;
}) => (
  <View style={[styles.tabIconWrapper, focused && styles.tabIconActive]}>
    <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>{emoji}</Text>
    <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

export const tabScreenOptions = {
  headerShown: false,
  tabBarShowLabel: false,
  tabBarHideOnKeyboard: true,
};

const MainTabNavigator: React.FC = () => {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={{
        ...tabScreenOptions,
        tabBarStyle: styles.tabBar,
      }}>

      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarAccessibilityLabel: t('tabs.home'),
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏡" label={t('tabs.home')} focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="SkinAnalysis"
        component={SkinStackNavigator}
        options={{
          tabBarAccessibilityLabel: t('tabs.skinA11y'),
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🔬" label={t('tabs.skin')} focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="HerbalTreatment"
        component={HerbalTreatmentScreen}
        options={{
          tabBarAccessibilityLabel: t('feature.herbal.title'),
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🌿" label={t('tabs.herbal')} focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="Meditation"
        component={MeditationScreen}
        options={{
          tabBarAccessibilityLabel: t('feature.meditation.title'),
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🧘" label={t('tabs.meditate')} focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarAccessibilityLabel: t('tabs.profile'),
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label={t('tabs.profile')} focused={focused} />
          ),
        }}
      />

    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    height: Platform.OS === 'ios' ? 92 : 74,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  tabIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    minWidth: 66,
  },
  tabIconActive: {
    backgroundColor: Colors.primaryDark,
  },
  tabEmoji: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabEmojiActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: Colors.primaryLight,
    fontWeight: '700',
  },
});

export default MainTabNavigator;
