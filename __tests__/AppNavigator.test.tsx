/**
 * @format
 */

import 'react-native';
import React from 'react';
import { beforeEach, expect, it, jest } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from '../src/navigation/AppNavigator';

const mockReset = jest.fn();
let mockAuth: { user: { id: string } | null; loading: boolean };

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual<typeof import('@react-navigation/native')>('@react-navigation/native'),
  useNavigation: () => ({ reset: mockReset }),
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('../src/navigation/AuthNavigator', () => () => null);
jest.mock('../src/navigation/MainStackNavigator', () => () => null);

const render = () => (
  <NavigationContainer>
    <AppNavigator />
  </NavigationContainer>
);

beforeEach(() => {
  mockReset.mockClear();
});

it('returns to Login when the session is cleared while inside the app', async () => {
  mockAuth = { user: { id: '1' }, loading: false };
  let root!: renderer.ReactTestRenderer;
  await act(async () => {
    root = renderer.create(render());
  });
  expect(mockReset).toHaveBeenLastCalledWith({ index: 0, routes: [{ name: 'Main' }] });

  mockAuth = { user: null, loading: false };
  await act(async () => {
    root.update(render());
  });
  expect(mockReset).toHaveBeenLastCalledWith({
    index: 0,
    routes: [{ name: 'Auth', state: { routes: [{ name: 'Login' }], index: 0 } }],
  });
  root.unmount();
});

it('stays on the Auth stack without resetting when restore finds no verified session', async () => {
  mockAuth = { user: null, loading: true };
  let root!: renderer.ReactTestRenderer;
  await act(async () => {
    root = renderer.create(render());
  });
  mockAuth = { user: null, loading: false };
  await act(async () => {
    root.update(render());
  });
  expect(mockReset).not.toHaveBeenCalled();
  root.unmount();
});
