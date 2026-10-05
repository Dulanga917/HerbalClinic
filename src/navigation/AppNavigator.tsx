import React, { useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from './types';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, loading } = useAuth();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (loading) {
      return;
    }

    const userId = user?.id ?? null;
    if (previousUserId.current === userId) {
      return;
    }

    // First restore with no session: stay on the Auth stack (Splash → Login).
    if (previousUserId.current === undefined && !user) {
      previousUserId.current = null;
      return;
    }

    previousUserId.current = userId;
    navigation.reset({
      index: 0,
      routes: user
        ? [{ name: 'Main' }]
        : [{ name: 'Auth', state: { routes: [{ name: 'Login' }], index: 0 } }],
    });
  }, [user, loading, navigation]);

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
