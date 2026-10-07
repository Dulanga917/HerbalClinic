import { describe, expect, it } from '@jest/globals';
import { API_UNREACHABLE, ApiError, GEMINI_UNAVAILABLE } from '../src/services/apiClient';
import { translate } from '../src/i18n/translate';
import {
  CONNECTION_MESSAGE,
  GENERIC_ERROR_MESSAGE,
  describeError,
  friendlyErrorMessage,
  resolveMessage,
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
      expect(friendlyErrorMessage(new Error(message), 'auth.error.signInFailed')).toBe(
        'Could not sign in. Please try again.',
      );
    }
  });

  it('falls back for non-Error values and empty messages', () => {
    expect(friendlyErrorMessage('oops')).toBe(GENERIC_ERROR_MESSAGE);
    expect(friendlyErrorMessage(new Error('   '), 'auth.error.registerFailed')).toBe(
      'Could not create the account. Please try again.',
    );
    expect(friendlyErrorMessage(undefined)).toBe(GENERIC_ERROR_MESSAGE);
  });
});

describe('describeError + resolveMessage (localized)', () => {
  it('maps known API messages to translation keys', () => {
    expect(describeError(new ApiError('Invalid email or password.', 401, null))).toEqual({
      key: 'auth.error.invalidCredentials',
    });
    expect(describeError(new ApiError('An account with this email already exists.', 409, null))).toEqual({
      key: 'auth.error.accountExists',
    });
    expect(
      describeError(new ApiError('Too many attempts. Please wait a few minutes and try again.', 429, null)),
    ).toEqual({ key: 'error.tooManyAttempts' });
  });

  it('keeps validation parameters', () => {
    const message = describeError(new Error('Password must be at least 8 characters.'));
    expect(message).toEqual({ key: 'validation.passwordTooShort', params: { min: 8 } });
    expect(resolveMessage(message, 'si')).toBe('මුරපදයේ අවම වශයෙන් අක්ෂර 8ක් තිබිය යුතුය.');
  });

  it('shows connection, server and fallback errors in Sinhala', () => {
    const offline = new ApiError('Could not reach the HerbalClinic API.', null, API_UNREACHABLE);
    expect(resolveMessage(describeError(offline), 'si')).toBe(translate('si', 'error.connection'));
    expect(resolveMessage(describeError(new ApiError('boom', 500, null)), 'si')).toBe(
      translate('si', 'error.generic'),
    );
    expect(resolveMessage(describeError(new Error('HTTP 502'), 'auth.error.signInFailed'), 'si')).toBe(
      translate('si', 'auth.error.signInFailed'),
    );
  });

  it('shows an unrecognised user-safe message in English but a translated fallback in Sinhala', () => {
    const message = describeError(new ApiError('A condition is required.', 400, null), 'herbal.unavailableBody');
    expect(resolveMessage(message, 'en')).toBe('A condition is required.');
    expect(resolveMessage(message, 'si')).toBe(translate('si', 'herbal.unavailableBody'));
  });
});
