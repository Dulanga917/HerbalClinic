/**
 * @format
 */

import 'react-native';
import React from 'react';
import { Text } from 'react-native';
import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import SplashScreen from '../src/screens/auth/SplashScreen';

let mockAuth: { loading: boolean; user: unknown };

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const texts = (root: renderer.ReactTestRenderer) =>
  root.root.findAllByType(Text).map(node => node.props.children).flat(Infinity);

it('waits for session restore before sending a signed-out user to Login', () => {
  mockAuth = { loading: true, user: null };
  const navigation = { replace: jest.fn() };
  let root!: renderer.ReactTestRenderer;
  act(() => {
    root = renderer.create(<SplashScreen navigation={navigation as never} />);
  });

  act(() => {
    jest.advanceTimersByTime(5000);
  });
  expect(navigation.replace).not.toHaveBeenCalled();
  expect(texts(root)).toContain('Checking your sign-in…');

  mockAuth = { loading: false, user: null };
  act(() => root.update(<SplashScreen navigation={navigation as never} />));
  expect(navigation.replace).toHaveBeenCalledWith('Login');
  act(() => root.unmount());
});

it('leaves a restored session to AppNavigator instead of flashing Login', () => {
  mockAuth = { loading: false, user: { id: '1' } };
  const navigation = { replace: jest.fn() };
  let root!: renderer.ReactTestRenderer;
  act(() => {
    root = renderer.create(<SplashScreen navigation={navigation as never} />);
  });
  act(() => {
    jest.advanceTimersByTime(5000);
  });
  expect(navigation.replace).not.toHaveBeenCalled();
  act(() => root.unmount());
});

it('shows the splash briefly before Login when no session is saved', () => {
  mockAuth = { loading: false, user: null };
  const navigation = { replace: jest.fn() };
  let root!: renderer.ReactTestRenderer;
  act(() => {
    root = renderer.create(<SplashScreen navigation={navigation as never} />);
  });
  expect(navigation.replace).not.toHaveBeenCalled();
  act(() => {
    jest.advanceTimersByTime(1200);
  });
  expect(navigation.replace).toHaveBeenCalledWith('Login');
  act(() => root.unmount());
});
