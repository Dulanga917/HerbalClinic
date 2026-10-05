/**
 * @format
 */

import 'react-native';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { expect, it, jest } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import HomeScreen from '../src/screens/home/HomeScreen';

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      dosha: 'Pitta',
      doshaConfidence: 70,
      scanCount: 2,
    },
  }),
}));

jest.mock('../src/services/geminiService', () => ({
  __esModule: true,
  default: {
    getDailyTip: jest.fn(async () => ({
      tip: 'Offline daily tip for tests',
      offline: true,
    })),
  },
}));

it('shows the saved Dosha and thesis feature names', async () => {
  const navigation = { navigate: jest.fn() } as never;
  let root!: renderer.ReactTestRenderer;

  await act(async () => {
    root = renderer.create(<HomeScreen navigation={navigation} route={{} as never} />);
  });

  const labels = root.root.findAllByType(Text).map(node => node.props.children);
  const flat = labels.flat(Infinity);

  expect(flat).toContain('Welcome, Ada');
  expect(flat).toContain('PITTA');
  expect(flat).toContain('Skin Type Assessment');
  expect(flat).toContain('AI Skin Scan');
  expect(flat).toContain('Herb Library');
  expect(flat).toContain('Meditation');
  expect(flat).toContain('Ayurvedic Treatment');
  expect(flat).toContain('Ayurvedic Hospitals');
  expect(flat).toContain('Find Ayurvedic hospitals and treatment centres in Sri Lanka');
  expect(flat).not.toContain('AI Chat');
});

it('routes every Home feature card, including Ayurvedic Hospitals', async () => {
  const navigate = jest.fn();
  let root!: renderer.ReactTestRenderer;

  await act(async () => {
    root = renderer.create(<HomeScreen navigation={{ navigate } as never} route={{} as never} />);
  });

  const press = (label: string) => {
    const card = root.root
      .findAllByType(TouchableOpacity)
      .find(node => node.props.accessibilityLabel === label);
    expect(card).toBeTruthy();
    act(() => {
      card?.props.onPress();
    });
  };

  press('Open Skin Type Assessment');
  press('Open AI Skin Scan');
  press('Open Herb Library');
  press('Open Meditation');
  press('Open Ayurvedic Treatment');
  press('Open Ayurvedic Hospitals');

  expect(navigate.mock.calls).toEqual([
    ['SkinAnalysis', { screen: 'SkinCamera', params: { analysisType: 'type' } }],
    ['SkinAnalysis', { screen: 'SkinCamera', params: { analysisType: 'issue' } }],
    ['HerbalTreatment'],
    ['Meditation'],
    ['AyurvedicTreatment'],
    ['AyurvedicHospitals'],
  ]);

  act(() => root.unmount());
});
