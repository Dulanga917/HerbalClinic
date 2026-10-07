/**
 * @format
 */

import 'react-native';
import React from 'react';
import { expect, it, jest } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';
import MainTabNavigator from '../src/navigation/MainTabNavigator';
import { LanguageProvider, createMemoryLanguageStorage, setCurrentLanguage } from '../src/i18n';

jest.mock('../src/screens/home/HomeScreen', () => () => null);
jest.mock('../src/navigation/SkinStackNavigator', () => () => null);
jest.mock('../src/screens/herbal/HerbalTreatmentScreen', () => () => null);
jest.mock('../src/screens/meditation/MeditationScreen', () => () => null);
jest.mock('../src/screens/home/ProfileScreen', () => () => null);

it('hides the bottom tab bar while the keyboard is open on every tab', async () => {
  let root!: renderer.ReactTestRenderer;
  await act(async () => {
    root = renderer.create(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 24, left: 0, right: 0, bottom: 0 },
        }}>
        <NavigationContainer>
          <MainTabNavigator />
        </NavigationContainer>
      </SafeAreaProvider>,
    );
  });

  const navigators = root.root.findAll(
    node => typeof node.type !== 'string' && Boolean(node.props.screenOptions),
  );
  expect(navigators.length).toBeGreaterThan(0);
  expect(navigators[0].props.screenOptions).toMatchObject({
    headerShown: false,
    tabBarShowLabel: false,
    tabBarHideOnKeyboard: true,
  });
  act(() => root.unmount());
});

const tabLabels = async (storage: ReturnType<typeof createMemoryLanguageStorage>) => {
  let root!: renderer.ReactTestRenderer;
  await act(async () => {
    root = renderer.create(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 360, height: 780 },
          insets: { top: 24, left: 0, right: 0, bottom: 0 },
        }}>
        <LanguageProvider storage={storage}>
          <NavigationContainer>
            <MainTabNavigator />
          </NavigationContainer>
        </LanguageProvider>
      </SafeAreaProvider>,
    );
  });
  const labels = root.root.findAllByType(Text).map(node => node.props.children).flat(Infinity);
  act(() => root.unmount());
  return labels;
};

it('labels the bottom tabs in the selected language', async () => {
  expect(await tabLabels(createMemoryLanguageStorage())).toEqual(
    expect.arrayContaining(['Home', 'Skin', 'Herbal', 'Meditate', 'Profile']),
  );
  const sinhala = await tabLabels(createMemoryLanguageStorage('si'));
  expect(sinhala).toEqual(expect.arrayContaining(['මුල් පිටුව', 'සම', 'ඔසු', 'භාවනා', 'පැතිකඩ']));
  expect(sinhala).not.toContain('Home');
  setCurrentLanguage('en');
});
