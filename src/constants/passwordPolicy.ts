import type { TranslationKey } from '../i18n/translations/en';
import type { TranslationParams } from '../i18n/types';

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ValidationFailure = {
  ok: false;
  /** English text, matching the API's validation messages. */
  message: string;
  key: TranslationKey;
  params?: TranslationParams;
};

export type ValidationResult = { ok: true; value: string } | ValidationFailure;

export const validateName = (name: string): ValidationResult => {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return {
      ok: false,
      message: 'Please enter your full name (at least 2 characters).',
      key: 'validation.nameTooShort',
    };
  }
  if (trimmed.length > 80) {
    return { ok: false, message: 'Name must be 80 characters or fewer.', key: 'validation.nameTooLong' };
  }
  return { ok: true, value: trimmed };
};

export const validateEmail = (email: string): ValidationResult => {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !EMAIL_PATTERN.test(normalized)) {
    return { ok: false, message: 'Please enter a valid email address.', key: 'validation.emailInvalid' };
  }
  return { ok: true, value: normalized };
};

export const validatePassword = (password: string): ValidationResult => {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      key: 'validation.passwordTooShort',
      params: { min: MIN_PASSWORD_LENGTH },
    };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`,
      key: 'validation.passwordTooLong',
      params: { max: MAX_PASSWORD_LENGTH },
    };
  }
  return { ok: true, value: password };
};
