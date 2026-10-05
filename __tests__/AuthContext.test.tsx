/**
 * @format
 */

import 'react-native';
import React from 'react';
import { Text } from 'react-native';
import { beforeEach, it, expect, jest } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import * as apiClient from '../src/services/apiClient';
import * as sessionStorage from '../src/services/sessionStorage';

jest.mock('../src/services/apiClient', () => ({
  registerAccount: jest.fn(),
  loginAccount: jest.fn(),
  logoutAccount: jest.fn(),
  fetchCurrentUser: jest.fn(),
}));

jest.mock('../src/services/sessionStorage', () => ({
  saveSessionToken: jest.fn(async () => undefined),
  getSessionToken: jest.fn(async () => null),
  clearSessionToken: jest.fn(async () => undefined),
}));

const mockedApi = apiClient as unknown as {
  registerAccount: { mockResolvedValue: (value: unknown) => void };
  loginAccount: { mockResolvedValue: (value: unknown) => void };
  logoutAccount: { mockResolvedValue: (value: unknown) => void };
  fetchCurrentUser: { mockResolvedValue: (value: unknown) => void };
};

const mockedSession = sessionStorage as unknown as {
  saveSessionToken: { mockResolvedValue: (value: unknown) => void };
  getSessionToken: { mockResolvedValue: (value: unknown) => void };
  clearSessionToken: { mockResolvedValue: (value: unknown) => void };
};

const mockUser = {
  id: '1',
  name: 'Ada',
  email: 'ada@example.com',
  dosha: null,
  doshaConfidence: null,
  scanCount: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedSession.getSessionToken.mockResolvedValue(null);
});

it('registers a user without keeping a demo password in the client', async () => {
  mockedApi.registerAccount.mockResolvedValue({
    token: 'session-token',
    user: mockUser,
  });

  const TestComponent = () => {
    const { user, register, error } = useAuth();

    React.useEffect(() => {
      register('Ada', 'ada@example.com', 'password1').catch(() => {});
    }, []);

    return <Text>{user ? user.email : error ?? 'none'}</Text>;
  };

  let root: renderer.ReactTestRenderer;

  await act(async () => {
    root = renderer.create(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  expect(apiClient.registerAccount).toHaveBeenCalledWith(
    'Ada',
    'ada@example.com',
    'password1',
  );
  expect(sessionStorage.saveSessionToken).toHaveBeenCalledWith('session-token');
  expect(root!.root.findByType(Text).props.children).toBe('ada@example.com');
});

it('logs in through the API and stores only a session token', async () => {
  mockedApi.loginAccount.mockResolvedValue({
    token: 'session-token',
    user: mockUser,
  });

  const TestComponent = () => {
    const { user, login } = useAuth();

    React.useEffect(() => {
      login('ada@example.com', 'password1').catch(() => {});
    }, []);

    return <Text>{user ? user.email : 'none'}</Text>;
  };

  let root: renderer.ReactTestRenderer;

  await act(async () => {
    root = renderer.create(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  expect(apiClient.loginAccount).toHaveBeenCalledWith('ada@example.com', 'password1');
  expect(root!.root.findByType(Text).props.children).toBe('ada@example.com');
});

it('clears the session on logout', async () => {
  mockedSession.getSessionToken.mockResolvedValue('session-token');
  mockedApi.fetchCurrentUser.mockResolvedValue({ user: mockUser });
  mockedApi.logoutAccount.mockResolvedValue({ ok: true });

  const TestComponent = () => {
    const { user, logout } = useAuth();

    React.useEffect(() => {
      if (user) {
        logout().catch(() => {});
      }
    }, [user]);

    return <Text>{user ? user.email : 'signed-out'}</Text>;
  };

  let root: renderer.ReactTestRenderer;

  await act(async () => {
    root = renderer.create(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );
    await new Promise(resolve => setTimeout(resolve, 80));
  });

  expect(apiClient.logoutAccount).toHaveBeenCalled();
  expect(sessionStorage.clearSessionToken).toHaveBeenCalled();
  expect(root!.root.findByType(Text).props.children).toBe('signed-out');
});
