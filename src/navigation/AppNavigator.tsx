import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * AppNavigator — Root navigator that controls Auth vs Main app flow.
 *
 * Flow:
 *   Auth (Splash → Login → Register)
 *     └─▶ Main (Bottom Tabs: Home | Skin | Herbal | Meditation | Profile)
 *
 * TODO: Replace `initialRouteName="Auth"` with dynamic check from
 *       AuthContext once Firebase auth state persistence is implemented.
 */
const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Auth"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}>
      <Stack.Screen name="Auth" component={AuthNavigator} />
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ animation: 'fade' }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
