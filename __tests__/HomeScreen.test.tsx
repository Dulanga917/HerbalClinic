/**
 * @format
 */

import 'react-native';
import React from 'react';
import { Text } from 'react-native';
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
  expect(flat).not.toContain('AI Chat');
});
