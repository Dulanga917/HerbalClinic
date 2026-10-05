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
};

export const GEMINI_UNAVAILABLE = 'GEMINI_UNAVAILABLE';
export const API_UNREACHABLE = 'API_UNREACHABLE';

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

  let response: Response;
  try {
    response = await fetch(`${Config.API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(
      'Could not reach the HerbalClinic API. Start the local server, then try again.',
      null,
      API_UNREACHABLE,
    );
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      typeof payload.error === 'string' ? payload.error : 'Request failed. Please try again.',
      response.status,
      typeof payload.code === 'string' ? payload.code : null,
    );
  }
  return payload as T;
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
  apiRequest<{ user: AuthUser }>('/api/v1/me', { token });

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

export const analyseSkinIssueRemote = (
  token: string,
  imageBase64: string,
  mimeType = 'image/jpeg',
) =>
  apiRequest<{ analysis: unknown }>('/api/v1/skin-issue', {
    method: 'POST',
    token,
    body: { imageBase64, mimeType },
  });

export const fetchHerbalRecommendations = (
  token: string,
  condition: string,
  dosha?: string,
) =>
  apiRequest<{ herbs: unknown[] }>('/api/v1/herbal-recommendations', {
    method: 'POST',
    token,
    body: { condition, dosha },
  });

export const fetchDailyTip = (token: string, dosha?: string) =>
  apiRequest<{ tip: string }>('/api/v1/daily-tip', {
    method: 'POST',
    token,
    body: { dosha },
  });
