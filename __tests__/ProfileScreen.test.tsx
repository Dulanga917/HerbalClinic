/**
 * @format
 */

import 'react-native';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { it, expect, jest } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import ProfileScreen from '../src/screens/home/ProfileScreen';
import { fetchScanHistory } from '../src/services/apiClient';

const mockLogout = jest.fn(async () => undefined);

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      dosha: 'Vata',
      doshaConfidence: 82,
      scanCount: 3,
    },
    sessionToken: 'test-session',
    logout: mockLogout,
  }),
}));

jest.mock('../src/services/apiClient', () => ({
  fetchScanHistory: jest.fn(async () => ({ scans: [] })),
}));

it('renders the authenticated user name and email', () => {
  const navigation = { navigate: jest.fn() } as never;
  const root = renderer.create(<ProfileScreen navigation={navigation} route={{} as never} />);
  const labels = root.root.findAllByType(Text).map(node => node.props.children);
  expect(labels).toContain('Ada Lovelace');
  expect(labels).toContain('ada@example.com');
  expect(labels).not.toContain('Herbal User');
  expect(labels).not.toContain('user@herbalclinic.com');
  expect(labels).not.toContain('Sessions');
  expect(labels).not.toContain('Plans');
  expect(labels).toContain('Meditation Sessions');
  expect(labels).not.toContain('Meditation History');
});

it('shows model confidence only for Dosha scans in Scan History', async () => {
  (fetchScanHistory as jest.Mock<typeof fetchScanHistory>).mockResolvedValueOnce({
    scans: [
      { id: 3, dosha: null, confidence: 0, imageReference: 'a.jpg', createdAt: '2026-10-01T10:00:00Z' },
      { id: 2, dosha: null, confidence: 88, imageReference: 'b.jpg', createdAt: '2026-09-30T10:00:00Z' },
      { id: 1, dosha: 'Vata', confidence: 82, imageReference: 'c.jpg', createdAt: '2026-09-29T10:00:00Z' },
    ],
  });
  const navigation = { navigate: jest.fn() } as never;
  let root!: renderer.ReactTestRenderer;
  await act(async () => {
    root = renderer.create(<ProfileScreen navigation={navigation} route={{} as never} />);
  });
  const historyButton = root.root
    .findAllByType(TouchableOpacity)
    .find(node => node.props.accessibilityLabel === 'Scan History');
  await act(async () => {
    historyButton!.props.onPress();
  });

  const flatten = (children: unknown): string =>
    Array.isArray(children) ? children.map(flatten).join('') : children == null ? '' : String(children);
  const text = root.root.findAllByType(Text).map(node => flatten(node.props.children)).join('\n');

  expect(text).toContain('82% model confidence');
  expect(text).not.toContain('0% model confidence');
  expect(text).not.toContain('88% model confidence');
  expect(text).not.toMatch(/\b88\b|Skin-issue scan|Detected|Severity/);
  expect(text.match(/AI skin guidance/g)).toHaveLength(2);
  expect(text.match(/General guidance, no confidence score/g)).toHaveLength(2);
});
