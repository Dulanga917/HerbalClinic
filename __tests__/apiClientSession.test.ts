import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  analyseSkinIssueRemote,
  API_UNREACHABLE,
  ApiError,
  fetchCurrentUser,
  fetchScanHistory,
  GEMINI_UNAVAILABLE,
  isSessionInvalid,
  loginAccount,
  SESSION_INVALID,
  setSessionInvalidListener,
  SKIN_ISSUE_TIMEOUT_MS,
} from '../src/services/apiClient';

type FetchResult = { status: number; body: unknown } | Error;

const originalFetch = global.fetch;

const mockFetch = (result: FetchResult) => {
  (global as { fetch: unknown }).fetch = jest.fn(async () => {
    if (result instanceof Error) {
      throw result;
    }
    return {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      json: async () => result.body,
    };
  });
};

const SESSION_REJECTED = {
  status: 401,
  body: { error: 'Please sign in again.', code: 'SESSION_INVALID' },
};

describe('apiClient session error classification', () => {
  let unsubscribe: (() => void) | null = null;

  afterEach(() => {
    unsubscribe?.();
    unsubscribe = null;
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  const listen = () => {
    const listener = jest.fn();
    unsubscribe = setSessionInvalidListener(listener);
    return listener;
  };

  it('marks a 401 on an authenticated request as SESSION_INVALID and notifies the central listener', async () => {
    const listener = listen();
    mockFetch(SESSION_REJECTED);
    const error = await fetchScanHistory('stale-token').catch(e => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(error.code).toBe(SESSION_INVALID);
    expect(error.message).toBe('Please sign in again.');
    expect(isSessionInvalid(error)).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('stale-token');
  });

  it('classifies a 401 by status even if the server omits the code', async () => {
    const listener = listen();
    mockFetch({ status: 401, body: { error: 'Please sign in again.' } });
    const error = await fetchCurrentUser('stale-token').catch(e => e);
    expect(isSessionInvalid(error)).toBe(true);
    expect(listener).toHaveBeenCalledWith('stale-token');
  });

  it('does not treat a wrong-password 401 on login (no session token) as an expired session', async () => {
    const listener = listen();
    mockFetch({ status: 401, body: { error: 'Invalid email or password.' } });
    const error = await loginAccount('a@b.test', 'wrongpass1').catch(e => e);
    expect(error.status).toBe(401);
    expect(isSessionInvalid(error)).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it.each([
    ['500', { status: 500, body: { error: 'Something went wrong. Please try again.' } }],
    ['502', { status: 502, body: {} }],
    ['503 Gemini unavailable', { status: 503, body: { error: 'AI guidance is temporarily unavailable.', code: GEMINI_UNAVAILABLE } }],
    ['429', { status: 429, body: { error: 'Too many requests.' } }],
  ])('does not treat a %s response as an expired session', async (_label, result) => {
    const listener = listen();
    mockFetch(result);
    const error = await fetchScanHistory('valid-token').catch(e => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(result.status);
    expect(isSessionInvalid(error)).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('preserves the server error code on non-auth failures', async () => {
    mockFetch({ status: 503, body: { error: 'AI guidance is temporarily unavailable.', code: GEMINI_UNAVAILABLE } });
    const error = await fetchScanHistory('valid-token').catch(e => e);
    expect(error.code).toBe(GEMINI_UNAVAILABLE);
  });

  it('reports a network failure as API_UNREACHABLE without notifying the session listener', async () => {
    const listener = listen();
    mockFetch(new TypeError('Network request failed'));
    const error = await fetchCurrentUser('valid-token').catch(e => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBeNull();
    expect(error.code).toBe(API_UNREACHABLE);
    expect(isSessionInvalid(error)).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('times out a hanging session check as API_UNREACHABLE instead of waiting forever', async () => {
    jest.useFakeTimers();
    const listener = listen();
    (global as { fetch: unknown }).fetch = jest.fn(
      (_url: unknown, init: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
        }),
    );
    const pending = fetchCurrentUser('valid-token').catch(e => e);
    jest.advanceTimersByTime(15000);
    const error = await pending;
    expect(error.code).toBe(API_UNREACHABLE);
    expect(isSessionInvalid(error)).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('times out a stalled skin guidance request at SKIN_ISSUE_TIMEOUT_MS as API_UNREACHABLE', async () => {
    jest.useFakeTimers();
    const listener = listen();
    (global as { fetch: unknown }).fetch = jest.fn(
      (_url: unknown, init: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
        }),
    );
    let settled = false;
    const pending = analyseSkinIssueRemote('valid-token', 'AAAA').catch(e => {
      settled = true;
      return e;
    });
    jest.advanceTimersByTime(SKIN_ISSUE_TIMEOUT_MS - 1);
    await Promise.resolve();
    expect(settled).toBe(false);
    jest.advanceTimersByTime(1);
    const error = await pending;
    expect(SKIN_ISSUE_TIMEOUT_MS).toBe(100000);
    expect(error.code).toBe(API_UNREACHABLE);
    expect(isSessionInvalid(error)).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('does not add a timeout to unrelated API requests', async () => {
    mockFetch({ status: 200, body: { scans: [] } });
    await fetchScanHistory('valid-token');
    const init = (global.fetch as jest.Mock).mock.calls[0][1] as { signal?: AbortSignal };
    expect(init.signal).toBeUndefined();
  });

  it('stops notifying a listener after it unsubscribes', async () => {
    const listener = jest.fn();
    setSessionInvalidListener(listener)();
    mockFetch(SESSION_REJECTED);
    await fetchScanHistory('stale-token').catch(() => undefined);
    expect(listener).not.toHaveBeenCalled();
  });

  it('isSessionInvalid ignores plain errors that merely mention signing in', () => {
    expect(isSessionInvalid(new Error('Please sign in again.'))).toBe(false);
    expect(isSessionInvalid(new ApiError('Please sign in again.', 500, null))).toBe(false);
  });
});
