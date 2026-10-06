import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { HomeTabParamList } from './types';
import { Colors, Spacing, BorderRadius } from '../constants/theme';

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

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}>

      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarAccessibilityLabel: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏡" label="Home" focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="SkinAnalysis"
        component={SkinStackNavigator}
        options={{
          tabBarAccessibilityLabel: 'Skin analysis',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🔬" label="Skin" focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="HerbalTreatment"
        component={HerbalTreatmentScreen}
        options={{
          tabBarAccessibilityLabel: 'Herb Library',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🌿" label="Herbal" focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="Meditation"
        component={MeditationScreen}
        options={{
          tabBarAccessibilityLabel: 'Meditation',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🧘" label="Meditate" focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarAccessibilityLabel: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label="Profile" focused={focused} />
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
    height: Platform.OS === 'ios' ? 90 : 70,
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
    minWidth: 68,
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
    fontSize: 11,
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
