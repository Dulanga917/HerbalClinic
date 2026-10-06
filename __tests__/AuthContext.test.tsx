/**
 * @format
 */

import 'react-native';
import React from 'react';
import { Text } from 'react-native';
import { afterEach, beforeEach, describe, it, expect, jest } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import { AuthProvider, SESSION_EXPIRED_MESSAGE, useAuth } from '../src/context/AuthContext';
import * as apiClient from '../src/services/apiClient';
import * as sessionStorage from '../src/services/sessionStorage';

jest.mock('../src/services/apiClient', () => ({
  ...jest.requireActual<typeof import('../src/services/apiClient')>('../src/services/apiClient'),
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

describe('session restore and expiry', () => {
  const { ApiError, API_UNREACHABLE, SESSION_INVALID, GEMINI_UNAVAILABLE, fetchScanHistory } =
    jest.requireActual<typeof import('../src/services/apiClient')>('../src/services/apiClient');
  const fetchCurrentUser = apiClient.fetchCurrentUser as unknown as jest.Mock<
    (token: string) => Promise<unknown>
  >;
  const originalFetch = global.fetch;

  let auth: ReturnType<typeof useAuth>;
  const Probe = () => {
    auth = useAuth();
    return null;
  };

  const mount = async () => {
    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      );
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    return root;
  };

  const respondWith = (status: number, body: unknown) => {
    (global as { fetch: unknown }).fetch = jest.fn(async () => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }));
  };

  beforeEach(() => {
    mockedSession.getSessionToken.mockResolvedValue('stored-token');
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('restores a valid stored session', async () => {
    fetchCurrentUser.mockResolvedValue({ user: mockUser });
    const root = await mount();
    expect(fetchCurrentUser).toHaveBeenCalledWith('stored-token');
    expect(auth.user).toEqual(mockUser);
    expect(auth.sessionToken).toBe('stored-token');
    expect(auth.sessionUnverified).toBe(false);
    expect(auth.loading).toBe(false);
    expect(sessionStorage.clearSessionToken).not.toHaveBeenCalled();
    root.unmount();
  });

  it('keeps the stored token when the API is unreachable during restore', async () => {
    fetchCurrentUser.mockRejectedValue(
      new ApiError('Could not reach the HerbalClinic API.', null, API_UNREACHABLE),
    );
    const root = await mount();
    expect(sessionStorage.clearSessionToken).not.toHaveBeenCalled();
    expect(auth.user).toBeNull();
    expect(auth.sessionUnverified).toBe(true);
    expect(auth.error).toBeNull();
    expect(auth.loading).toBe(false);
    root.unmount();
  });

  it.each([500, 502, 503])('keeps the stored token on a %i restore failure', async status => {
    fetchCurrentUser.mockRejectedValue(
      new ApiError('Something went wrong. Please try again.', status, status === 503 ? GEMINI_UNAVAILABLE : null),
    );
    const root = await mount();
    expect(sessionStorage.clearSessionToken).not.toHaveBeenCalled();
    expect(auth.user).toBeNull();
    expect(auth.sessionUnverified).toBe(true);
    root.unmount();
  });

  it('keeps the stored token on an unexpected non-API restore error', async () => {
    fetchCurrentUser.mockRejectedValue(new Error('Please sign in again.'));
    const root = await mount();
    expect(sessionStorage.clearSessionToken).not.toHaveBeenCalled();
    expect(auth.sessionUnverified).toBe(true);
    root.unmount();
  });

  it('retries with the still-stored token once the API is reachable again', async () => {
    fetchCurrentUser
      .mockRejectedValueOnce(new ApiError('Could not reach the HerbalClinic API.', null, API_UNREACHABLE))
      .mockResolvedValueOnce({ user: mockUser });
    const root = await mount();
    expect(auth.sessionUnverified).toBe(true);
    await act(async () => {
      await auth.retrySession();
    });
    expect(fetchCurrentUser).toHaveBeenCalledTimes(2);
    expect(fetchCurrentUser).toHaveBeenNthCalledWith(2, 'stored-token');
    expect(auth.user).toEqual(mockUser);
    expect(auth.sessionUnverified).toBe(false);
    expect(sessionStorage.clearSessionToken).not.toHaveBeenCalled();
    root.unmount();
  });

  it('clears the stored token when the server rejects it during restore', async () => {
    fetchCurrentUser.mockRejectedValue(new ApiError('Please sign in again.', 401, SESSION_INVALID));
    const root = await mount();
    expect(sessionStorage.clearSessionToken).toHaveBeenCalledTimes(1);
    expect(auth.user).toBeNull();
    expect(auth.sessionToken).toBeNull();
    expect(auth.sessionUnverified).toBe(false);
    expect(auth.error).toBe(SESSION_EXPIRED_MESSAGE);
    root.unmount();
  });

  it('signs out centrally when any authenticated request is rejected while inside the app', async () => {
    fetchCurrentUser.mockResolvedValue({ user: mockUser });
    const root = await mount();
    expect(auth.user).toEqual(mockUser);

    respondWith(401, { error: 'Please sign in again.', code: 'SESSION_INVALID' });
    await act(async () => {
      await fetchScanHistory('stored-token').catch(() => undefined);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(sessionStorage.clearSessionToken).toHaveBeenCalledTimes(1);
    expect(auth.user).toBeNull();
    expect(auth.sessionToken).toBeNull();
    expect(auth.error).toBe(SESSION_EXPIRED_MESSAGE);
    root.unmount();
  });

  it.each([
    ['network failure', () => {
      (global as { fetch: unknown }).fetch = jest.fn(async () => {
        throw new TypeError('Network request failed');
      });
    }],
    ['500 error', () => respondWith(500, { error: 'Something went wrong. Please try again.' })],
    ['503 Gemini unavailable', () => respondWith(503, { error: 'AI guidance is temporarily unavailable.', code: 'GEMINI_UNAVAILABLE' })],
  ])('does not sign out on an in-app %s', async (_label, arrange) => {
    fetchCurrentUser.mockResolvedValue({ user: mockUser });
    const root = await mount();
    arrange();
    await act(async () => {
      await fetchScanHistory('stored-token').catch(() => undefined);
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(sessionStorage.clearSessionToken).not.toHaveBeenCalled();
    expect(auth.user).toEqual(mockUser);
    expect(auth.sessionToken).toBe('stored-token');
    root.unmount();
  });

  it('ignores a rejection for a token that is no longer the active session', async () => {
    fetchCurrentUser.mockResolvedValue({ user: mockUser });
    const root = await mount();
    respondWith(401, { error: 'Please sign in again.', code: 'SESSION_INVALID' });
    await act(async () => {
      await fetchScanHistory('previous-token').catch(() => undefined);
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(sessionStorage.clearSessionToken).not.toHaveBeenCalled();
    expect(auth.user).toEqual(mockUser);
    root.unmount();
  });
});
