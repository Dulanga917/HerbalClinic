import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainStackParamList } from './types';
import MainTabNavigator from './MainTabNavigator';
import AyurvedicTreatmentScreen from '../screens/treatment/AyurvedicTreatmentScreen';
import AyurvedicHospitalsScreen from '../screens/hospitals/AyurvedicHospitalsScreen';

const Stack = createNativeStackNavigator<MainStackParamList>();

const MainStackNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    <Stack.Screen name="Tabs" component={MainTabNavigator} />
    <Stack.Screen name="AyurvedicTreatment" component={AyurvedicTreatmentScreen} />
    <Stack.Screen name="AyurvedicHospitals" component={AyurvedicHospitalsScreen} />
  </Stack.Navigator>
);

export default MainStackNavigator;
