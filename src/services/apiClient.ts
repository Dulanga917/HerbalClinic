import Config from '../constants/config';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  dosha: string | null;
  doshaConfidence: number | null;
  scanCount: number;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

type RequestOptions = {
  method?: 'GET' | 'POST';
  token?: string | null;
  body?: unknown;
  timeoutMs?: number;
};

export const GEMINI_UNAVAILABLE = 'GEMINI_UNAVAILABLE';
export const API_UNREACHABLE = 'API_UNREACHABLE';
export const SESSION_INVALID = 'SESSION_INVALID';

const SESSION_CHECK_TIMEOUT_MS = 15000;
// Just above the server's worst case for Gemini (two 45 s attempts plus a short retry backoff),
// so a stalled request ends as API_UNREACHABLE and the offline fallback is shown.
export const SKIN_ISSUE_TIMEOUT_MS = 100000;

export class ApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;

  constructor(message: string, status: number | null, code: string | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** True only when the server rejected the session token itself (never for network or 5xx failures). */
export const isSessionInvalid = (error: unknown): boolean =>
  error instanceof ApiError && error.code === SESSION_INVALID;

type SessionInvalidListener = (rejectedToken: string) => void;

let sessionInvalidListener: SessionInvalidListener | null = null;

/** Registers the single handler notified when an authenticated request is rejected. Returns an unsubscribe function. */
export const setSessionInvalidListener = (listener: SessionInvalidListener) => {
  sessionInvalidListener = listener;
  return () => {
    if (sessionInvalidListener === listener) {
      sessionInvalidListener = null;
    }
  };
};

const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  if (!Config.API_BASE_URL) {
    throw new Error('The HerbalClinic API address is not configured for this build.');
  }

  const controller = options.timeoutMs ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), options.timeoutMs) : null;

  let response: Response;
  let payload: Record<string, unknown>;
  try {
    try {
      response = await fetch(`${Config.API_BASE_URL}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller?.signal,
      });
    } catch {
      throw new ApiError(
        'Could not reach the HerbalClinic API. Start the local server, then try again.',
        null,
        API_UNREACHABLE,
      );
    }
    payload = await response.json().catch(() => ({}));
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }

  if (!response.ok) {
    // A 401 on a request that carried a token means the server no longer accepts that session.
    const sessionRejected = response.status === 401 && Boolean(options.token);
    const error = new ApiError(
      typeof payload.error === 'string' ? payload.error : 'Request failed. Please try again.',
      response.status,
      sessionRejected ? SESSION_INVALID : typeof payload.code === 'string' ? payload.code : null,
    );
    if (sessionRejected && options.token) {
      sessionInvalidListener?.(options.token);
    }
    throw error;
  }
  return payload as unknown as T;
};

export const registerAccount = (name: string, email: string, password: string) =>
  apiRequest<AuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });

export const loginAccount = (email: string, password: string) =>
  apiRequest<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password },
  });

export const logoutAccount = (token: string | null) =>
  apiRequest<{ ok: boolean }>('/api/v1/auth/logout', {
    method: 'POST',
    token,
  });

export const fetchCurrentUser = (token: string) =>
  apiRequest<{ user: AuthUser }>('/api/v1/me', { token, timeoutMs: SESSION_CHECK_TIMEOUT_MS });

export interface ScanRecord {
  id: number;
  dosha: string | null;
  confidence: number | null;
  imageReference: string | null;
  createdAt: string;
}

export const saveScan = (
  token: string,
  input: { dosha?: string; confidence?: number; imageReference?: string },
) =>
  apiRequest<{ user: AuthUser }>('/api/v1/scans', {
    method: 'POST',
    token,
    body: input,
  });

export const fetchScanHistory = (token: string) =>
  apiRequest<{ scans: ScanRecord[] }>('/api/v1/scans', { token });

/** Response language requested from the AI endpoints; the server accepts only these values. */
export type GuidanceLanguage = 'en' | 'si';

export const analyseSkinIssueRemote = (
  token: string,
  imageBase64: string,
  mimeType = 'image/jpeg',
  language: GuidanceLanguage = 'en',
) =>
  apiRequest<{ analysis: unknown }>('/api/v1/skin-issue', {
    method: 'POST',
    token,
    body: { imageBase64, mimeType, language },
    timeoutMs: SKIN_ISSUE_TIMEOUT_MS,
  });

export const fetchHerbalRecommendations = (
  token: string,
  condition: string,
  dosha?: string,
  language: GuidanceLanguage = 'en',
) =>
  apiRequest<{ herbs: unknown[] }>('/api/v1/herbal-recommendations', {
    method: 'POST',
    token,
    body: { condition, dosha, language },
  });

export const fetchDailyTip = (token: string, dosha?: string, language: GuidanceLanguage = 'en') =>
  apiRequest<{ tip: string }>('/api/v1/daily-tip', {
    method: 'POST',
    token,
    body: { dosha, language },
  });
