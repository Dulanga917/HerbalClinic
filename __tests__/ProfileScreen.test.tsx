/**
 * @format
 */

import 'react-native';
import React from 'react';
import { Text } from 'react-native';
import { it, expect, jest } from '@jest/globals';
import renderer from 'react-test-renderer';
import ProfileScreen from '../src/screens/home/ProfileScreen';

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
    logout: mockLogout,
  }),
}));

it('renders the authenticated user name and email', () => {
  const root = renderer.create(<ProfileScreen />);
  const labels = root.root.findAllByType(Text).map(node => node.props.children);
  expect(labels).toContain('Ada Lovelace');
  expect(labels).toContain('ada@example.com');
  expect(labels).not.toContain('Herbal User');
  expect(labels).not.toContain('user@herbalclinic.com');
});
