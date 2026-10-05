export const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateName = (
  name: string,
): { ok: true; value: string } | { ok: false; message: string } => {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { ok: false, message: 'Please enter your full name (at least 2 characters).' };
  }
  if (trimmed.length > 80) {
    return { ok: false, message: 'Name must be 80 characters or fewer.' };
  }
  return { ok: true, value: trimmed };
};

export const validateEmail = (
  email: string,
): { ok: true; value: string } | { ok: false; message: string } => {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !EMAIL_PATTERN.test(normalized)) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }
  return { ok: true, value: normalized };
};

export const validatePassword = (
  password: string,
): { ok: true; value: string } | { ok: false; message: string } => {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (password.length > 128) {
    return { ok: false, message: 'Password must be 128 characters or fewer.' };
  }
  return { ok: true, value: password };
};
