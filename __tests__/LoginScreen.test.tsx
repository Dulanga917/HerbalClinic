/**
 * @format
 */

import 'react-native';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { beforeEach, expect, it, jest } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import LoginScreen from '../src/screens/auth/LoginScreen';

const mockRetrySession = jest.fn(async () => undefined);
let mockAuth: Record<string, unknown>;

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

const baseAuth = () => ({
  login: jest.fn(async () => undefined),
  clearError: jest.fn(),
  loading: false,
  error: null,
  sessionUnverified: false,
  retrySession: mockRetrySession,
});

const texts = (root: renderer.ReactTestRenderer) =>
  root.root.findAllByType(Text).map(node => node.props.children);

const renderLogin = () =>
  renderer.create(<LoginScreen navigation={{ navigate: jest.fn() } as never} />);

beforeEach(() => {
  mockRetrySession.mockClear();
});

it('offers a retry that keeps the saved session when the API was unreachable at launch', async () => {
  mockAuth = { ...baseAuth(), sessionUnverified: true };
  const root = renderLogin();
  expect(texts(root)).toContain('Could not reach HerbalClinic');
  const retry = root.root
    .findAllByType(TouchableOpacity)
    .find(node => node.props.accessibilityLabel === 'Retry saved session');
  await act(async () => {
    await retry!.props.onPress();
  });
  expect(mockRetrySession).toHaveBeenCalledTimes(1);
  act(() => root.unmount());
});

it('shows no retry card when there is no unverified saved session', () => {
  mockAuth = baseAuth();
  const root = renderLogin();
  expect(texts(root)).not.toContain('Could not reach HerbalClinic');
  act(() => root.unmount());
});

it('explains that the session expired after a confirmed rejection', () => {
  mockAuth = { ...baseAuth(), error: 'Your session has expired. Please sign in again.' };
  const root = renderLogin();
  expect(texts(root)).toContain('Your session has expired. Please sign in again.');
  expect(texts(root)).not.toContain('Could not reach HerbalClinic');
  act(() => root.unmount());
});
