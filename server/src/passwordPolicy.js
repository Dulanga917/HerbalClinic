const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateName(name) {
  if (typeof name !== 'string') {
    return { ok: false, message: 'Please enter your full name (at least 2 characters).' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { ok: false, message: 'Please enter your full name (at least 2 characters).' };
  }
  if (trimmed.length > 80) {
    return { ok: false, message: 'Name must be 80 characters or fewer.' };
  }
  return { ok: true, value: trimmed };
}

function validateEmail(email) {
  if (typeof email !== 'string') {
    return { ok: false, message: 'Please enter a valid email address.' };
  }
  const normalized = email.trim().toLowerCase();
  if (
    !normalized ||
    normalized.length > MAX_EMAIL_LENGTH ||
    !EMAIL_PATTERN.test(normalized)
  ) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }
  return { ok: true, value: normalized };
}

function validatePassword(password) {
  if (typeof password !== 'string') {
    return {
      ok: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`,
    };
  }
  return { ok: true, value: password };
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  validateName,
  validateEmail,
  validatePassword,
};
