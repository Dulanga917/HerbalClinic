/**
 * @format
 */

import 'react-native';
import React from 'react';
import { Text, TextInput, TouchableOpacity } from 'react-native';
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

const field = (root: renderer.ReactTestRenderer, label: string) =>
  root.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === label)!;

const signIn = (root: renderer.ReactTestRenderer) =>
  root.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === 'Sign In')!;

it('shows validation next to the fields instead of submitting an empty form', async () => {
  const login = jest.fn(async () => undefined);
  mockAuth = { ...baseAuth(), login };
  const root = renderLogin();
  await act(async () => {
    await signIn(root).props.onPress();
  });
  expect(texts(root)).toContain('Please enter your email address.');
  expect(texts(root)).toContain('Please enter your password.');
  expect(login).not.toHaveBeenCalled();

  act(() => field(root, 'Email Address').props.onChangeText('ada@example.com'));
  expect(texts(root)).not.toContain('Please enter your email address.');
  act(() => root.unmount());
});

it('submits once even when Sign In is tapped repeatedly', async () => {
  let finish!: () => void;
  const login = jest.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  mockAuth = { ...baseAuth(), login };
  const root = renderLogin();
  act(() => field(root, 'Email Address').props.onChangeText('ada@example.com'));
  act(() => field(root, 'Password').props.onChangeText('password1'));

  let first!: Promise<void>;
  act(() => {
    first = signIn(root).props.onPress();
    signIn(root).props.onPress();
  });
  expect(login).toHaveBeenCalledTimes(1);
  expect(login).toHaveBeenCalledWith('ada@example.com', 'password1');
  expect(signIn(root).props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  expect(texts(root).flat(Infinity)).toContain('Signing in…');

  await act(async () => {
    finish();
    await first;
  });
  expect(texts(root).flat(Infinity)).toContain('Sign In');
  act(() => root.unmount());
});

it('masks the password until the user chooses to show it', () => {
  mockAuth = baseAuth();
  const root = renderLogin();
  expect(field(root, 'Password').props.secureTextEntry).toBe(true);
  const toggle = root.root
    .findAllByType(TouchableOpacity)
    .find(node => node.props.accessibilityLabel === 'Show password')!;
  act(() => toggle.props.onPress());
  expect(field(root, 'Password').props.secureTextEntry).toBe(false);
  expect(
    root.root.findAllByType(TouchableOpacity).some(node => node.props.accessibilityLabel === 'Hide password'),
  ).toBe(true);
  act(() => root.unmount());
});

it('explains that the session expired after a confirmed rejection', () => {
  mockAuth = { ...baseAuth(), error: 'Your session has expired. Please sign in again.' };
  const root = renderLogin();
  expect(texts(root)).toContain('Your session has expired. Please sign in again.');
  expect(texts(root)).not.toContain('Could not reach HerbalClinic');
  expect(mockAuth.clearError).not.toHaveBeenCalled();
  act(() => root.unmount());
});

it('clears a stale sign-in error before opening Sign Up', () => {
  const clearError = jest.fn();
  const login = jest.fn(async () => undefined);
  mockAuth = { ...baseAuth(), login, clearError, error: 'Incorrect email or password.' };
  const navigate = jest.fn();
  const root = renderer.create(<LoginScreen navigation={{ navigate } as never} />);
  const signUp = root.root
    .findAllByType(TouchableOpacity)
    .find(node => node.props.accessibilityLabel === 'Sign Up')!;
  act(() => signUp.props.onPress());
  expect(clearError).toHaveBeenCalledTimes(1);
  expect(navigate).toHaveBeenCalledWith('Register');
  expect(login).not.toHaveBeenCalled();
  expect(mockRetrySession).not.toHaveBeenCalled();
  act(() => root.unmount());
});
