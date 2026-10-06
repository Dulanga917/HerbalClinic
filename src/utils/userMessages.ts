import { API_UNREACHABLE, ApiError } from '../services/apiClient';

export const CONNECTION_MESSAGE =
  'Unable to connect to HerbalClinic right now. Please check your connection and try again.';
export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

// Messages that read like internals (transport, parsing, runtime or model errors) are never shown to users.
const TECHNICAL_MESSAGE =
  /network request failed|json|unexpected token|content-type|request body|undefined|\bnull\b|nan\b|typeerror|referenceerror|syntaxerror|stack|tensor|http\s*\d{3}|status code|econn|etimedout|abort|fetch|\bat\s+\S+\s*\(/i;

/** Maps any thrown value to a short, user-safe sentence. */
export const friendlyErrorMessage = (error: unknown, fallback = GENERIC_ERROR_MESSAGE): string => {
  if (error instanceof ApiError) {
    if (error.code === API_UNREACHABLE || error.status === null) {
      return CONNECTION_MESSAGE;
    }
    if (error.status >= 500) {
      return GENERIC_ERROR_MESSAGE;
    }
  }
  const message = error instanceof Error ? error.message.trim() : '';
  if (!message || message.length > 160 || TECHNICAL_MESSAGE.test(message)) {
    return fallback;
  }
  return message;
};
