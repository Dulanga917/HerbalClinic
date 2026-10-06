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
