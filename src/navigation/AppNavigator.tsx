import React, { useEffect } from 'react';
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

  useEffect(() => {
    if (loading) {
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: user ? 'Main' : 'Auth' }],
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
