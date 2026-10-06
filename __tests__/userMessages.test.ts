import { describe, expect, it } from '@jest/globals';
import { API_UNREACHABLE, ApiError, GEMINI_UNAVAILABLE } from '../src/services/apiClient';
import {
  CONNECTION_MESSAGE,
  GENERIC_ERROR_MESSAGE,
  friendlyErrorMessage,
} from '../src/utils/userMessages';

describe('friendlyErrorMessage', () => {
  it('maps an unreachable API to a connection message', () => {
    const error = new ApiError('Could not reach the HerbalClinic API. Start the local server, then try again.', null, API_UNREACHABLE);
    expect(friendlyErrorMessage(error)).toBe(CONNECTION_MESSAGE);
  });

  it('never exposes server-side failures', () => {
    expect(friendlyErrorMessage(new ApiError('boom at handler (index.js:12)', 500, null))).toBe(GENERIC_ERROR_MESSAGE);
    expect(friendlyErrorMessage(new ApiError('AI guidance is temporarily unavailable.', 503, GEMINI_UNAVAILABLE))).toBe(
      GENERIC_ERROR_MESSAGE,
    );
  });

  it('keeps short, user-safe validation messages from the server', () => {
    expect(friendlyErrorMessage(new ApiError('Invalid email or password.', 401, null))).toBe('Invalid email or password.');
    expect(friendlyErrorMessage(new Error('Please sign in again to run this analysis.'))).toBe(
      'Please sign in again to run this analysis.',
    );
  });

  it('hides transport, parsing, runtime and model internals', () => {
    const technical = [
      'Network request failed',
      'Request body is not valid JSON.',
      'Content-Type must be application/json.',
      "Cannot read properties of undefined (reading 'tip')",
      'TypeError: x is not a function',
      'JSON Parse error: Unexpected token <',
      'The model returned an unexpected tensor shape.',
      'HTTP 502',
    ];
    for (const message of technical) {
      expect(friendlyErrorMessage(new Error(message), 'Fallback.')).toBe('Fallback.');
    }
  });

  it('falls back for non-Error values and empty messages', () => {
    expect(friendlyErrorMessage('oops')).toBe(GENERIC_ERROR_MESSAGE);
    expect(friendlyErrorMessage(new Error('   '), 'Fallback.')).toBe('Fallback.');
    expect(friendlyErrorMessage(undefined)).toBe(GENERIC_ERROR_MESSAGE);
  });
});
