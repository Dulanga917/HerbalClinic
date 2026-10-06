/**
 * @format
 */

import 'react-native';
import React from 'react';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { expect, it, jest } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import RegisterScreen from '../src/screens/auth/RegisterScreen';

let mockAuth: Record<string, unknown>;

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

const texts = (root: renderer.ReactTestRenderer) =>
  root.root.findAllByType(Text).map(node => node.props.children).flat(Infinity);

const field = (root: renderer.ReactTestRenderer, label: string) =>
  root.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === label)!;

const createAccount = (root: renderer.ReactTestRenderer) =>
  root.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === 'Create Account')!;

const mockNavigation = () => {
  const listeners: Record<string, () => void> = {};
  return {
    navigate: jest.fn(),
    addListener: jest.fn((event: string, callback: () => void) => {
      listeners[event] = callback;
      return jest.fn();
    }),
    listeners,
  };
};

const renderRegister = (navigation = mockNavigation()) => {
  let root!: renderer.ReactTestRenderer;
  act(() => {
    root = renderer.create(<RegisterScreen navigation={navigation as never} />);
  });
  return root;
};

it('keeps the password policy and reports problems beside each field', async () => {
  const register = jest.fn(async () => undefined);
  mockAuth = { register, clearError: jest.fn(), loading: false, error: null };
  const root = renderRegister();

  act(() => field(root, 'Full Name').props.onChangeText('A'));
  act(() => field(root, 'Email Address').props.onChangeText('not-an-email'));
  act(() => field(root, 'Password').props.onChangeText('short'));
  act(() => field(root, 'Confirm Password').props.onChangeText('different'));
  await act(async () => {
    await createAccount(root).props.onPress();
  });

  const labels = texts(root);
  expect(labels).toContain('Please enter your full name (at least 2 characters).');
  expect(labels).toContain('Please enter a valid email address.');
  expect(labels).toContain('Password must be at least 8 characters.');
  expect(labels).toContain('The passwords do not match.');
  expect(register).not.toHaveBeenCalled();
  act(() => root.unmount());
});

it('registers with normalised values when the form is valid', async () => {
  const register = jest.fn(async () => undefined);
  mockAuth = { register, clearError: jest.fn(), loading: false, error: null };
  const root = renderRegister();

  act(() => field(root, 'Full Name').props.onChangeText('  Ada Lovelace '));
  act(() => field(root, 'Email Address').props.onChangeText('Ada@Example.com'));
  act(() => field(root, 'Password').props.onChangeText('password1'));
  act(() => field(root, 'Confirm Password').props.onChangeText('password1'));
  await act(async () => {
    await createAccount(root).props.onPress();
  });

  expect(register).toHaveBeenCalledTimes(1);
  expect(register).toHaveBeenCalledWith('Ada Lovelace', 'ada@example.com', 'password1');
  expect(field(root, 'Password').props.secureTextEntry).toBe(true);
  expect(field(root, 'Confirm Password').props.secureTextEntry).toBe(true);
  act(() => root.unmount());
});

it('shows the server error from AuthContext without technical details', () => {
  mockAuth = {
    register: jest.fn(async () => undefined),
    clearError: jest.fn(),
    loading: false,
    error: 'An account with that email already exists.',
  };
  const root = renderRegister();
  expect(texts(root)).toContain('An account with that email already exists.');
  act(() => root.unmount());
});

it('clears the shared auth error when returning to Sign In', () => {
  const clearError = jest.fn();
  mockAuth = {
    register: jest.fn(async () => undefined),
    clearError,
    loading: false,
    error: 'An account with that email already exists.',
  };
  const navigation = mockNavigation();
  const root = renderRegister(navigation);
  expect(clearError).not.toHaveBeenCalled();

  const signInLink = root.root
    .findAllByType(TouchableOpacity)
    .find(node => node.props.accessibilityLabel === 'Sign In')!;
  act(() => signInLink.props.onPress());
  expect(clearError).toHaveBeenCalledTimes(1);
  expect(navigation.navigate).toHaveBeenCalledWith('Login');

  act(() => navigation.listeners.beforeRemove());
  expect(clearError).toHaveBeenCalledTimes(2);
  act(() => root.unmount());
});
