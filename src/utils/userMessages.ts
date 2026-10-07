import { MIN_PASSWORD_LENGTH } from '../constants/passwordPolicy';
import { en, TranslationKey } from '../i18n/translations/en';
import { translate } from '../i18n/translate';
import type { Language, TranslationParams } from '../i18n/types';
import { API_UNREACHABLE, ApiError } from '../services/apiClient';

/**
 * A message that can be shown in either language. `detail` keeps an unrecognised but user-safe
 * English server message so English users still see it; other languages show `key` instead.
 */
export type UserMessage = {
  key: TranslationKey;
  params?: TranslationParams;
  detail?: string;
};

export const CONNECTION_MESSAGE = en['error.connection'];
export const GENERIC_ERROR_MESSAGE = en['error.generic'];

// Messages that read like internals (transport, parsing, runtime or model errors) are never shown to users.
const TECHNICAL_MESSAGE =
  /network request failed|json|unexpected token|content-type|request body|undefined|\bnull\b|nan\b|typeerror|referenceerror|syntaxerror|stack|tensor|http\s*\d{3}|status code|econn|etimedout|abort|fetch|\bat\s+\S+\s*\(/i;

// Exact user-facing texts sent by the API (server/src) or thrown by the app, mapped to keys.
const KNOWN_MESSAGES: Record<string, UserMessage> = {
  'An account with this email already exists.': { key: 'auth.error.accountExists' },
  'Invalid email or password.': { key: 'auth.error.invalidCredentials' },
  'Please sign in again.': { key: 'auth.sessionExpired' },
  'Too many attempts. Please wait a few minutes and try again.': { key: 'error.tooManyAttempts' },
  'Too many requests. Please slow down and try again shortly.': { key: 'error.tooManyRequests' },
  'Too many analysis requests. Please wait a minute and try again.': {
    key: 'error.tooManyAnalyses',
  },
  'Please enter your full name (at least 2 characters).': { key: 'validation.nameTooShort' },
  'Name must be 80 characters or fewer.': { key: 'validation.nameTooLong' },
  'Please enter a valid email address.': { key: 'validation.emailInvalid' },
  [`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`]: {
    key: 'validation.passwordTooShort',
    params: { min: MIN_PASSWORD_LENGTH },
  },
  'Password must be 128 characters or fewer.': {
    key: 'validation.passwordTooLong',
    params: { max: 128 },
  },
  'Please sign in again to run this analysis.': { key: 'error.signInToAnalyse' },
  'The HerbalClinic API address is not configured for this build.': {
    key: 'error.apiNotConfigured',
  },
  'The photo is too large. Please use an image under 6 MB.': { key: 'error.photoTooLarge' },
  'Only JPEG, PNG, or WebP photos are supported.': { key: 'error.photoUnsupported' },
};

/** Maps any thrown value to a user-safe, translatable message. */
export const describeError = (
  error: unknown,
  fallbackKey: TranslationKey = 'error.generic',
): UserMessage => {
  if (error instanceof ApiError) {
    if (error.code === API_UNREACHABLE || error.status === null) {
      return { key: 'error.connection' };
    }
    if (error.status >= 500) {
      return { key: 'error.generic' };
    }
  }
  const message = error instanceof Error ? error.message.trim() : '';
  const known = KNOWN_MESSAGES[message];
  if (known) {
    return known;
  }
  if (error instanceof ApiError && error.status === 429) {
    return { key: 'error.tooManyRequests' };
  }
  if (!message || message.length > 160 || TECHNICAL_MESSAGE.test(message)) {
    return { key: fallbackKey };
  }
  return { key: fallbackKey, detail: message };
};

export const resolveMessage = (message: UserMessage, language: Language): string =>
  language === 'en' && message.detail
    ? message.detail
    : translate(language, message.key, message.params);

/** English convenience wrapper around `describeError`. */
export const friendlyErrorMessage = (
  error: unknown,
  fallbackKey: TranslationKey = 'error.generic',
): string => resolveMessage(describeError(error, fallbackKey), 'en');
