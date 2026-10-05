import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SkinStackParamList } from './types';

import SkinAnalysisScreen from '../screens/skin/SkinAnalysisScreen';
import SkinCameraScreen from '../screens/skin/SkinCameraScreen';
import SkinResultScreen from '../screens/skin/SkinResultScreen';

const Stack = createNativeStackNavigator<SkinStackParamList>();

const SkinStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="SkinHome"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: 'transparent' },
      }}>
      <Stack.Screen name="SkinHome" component={SkinAnalysisScreen} />
      <Stack.Screen name="SkinCamera" component={SkinCameraScreen} />
      <Stack.Screen name="SkinResult" component={SkinResultScreen} />
    </Stack.Navigator>
  );
};

export default SkinStackNavigator;
