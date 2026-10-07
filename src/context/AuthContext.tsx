import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import {
  AuthUser,
  fetchCurrentUser,
  isSessionInvalid,
  loginAccount,
  logoutAccount,
  registerAccount,
  setSessionInvalidListener,
} from '../services/apiClient';
import {
  clearSessionToken,
  getSessionToken,
  saveSessionToken,
} from '../services/sessionStorage';
import {
  validateEmail,
  validateName,
  validatePassword,
} from '../constants/passwordPolicy';
import { describeError, resolveMessage, UserMessage } from '../utils/userMessages';
import { useLanguage } from '../i18n/LanguageContext';
import { en } from '../i18n/translations/en';

export const SESSION_EXPIRED_MESSAGE = en['auth.sessionExpired'];
const SESSION_EXPIRED: UserMessage = { key: 'auth.sessionExpired' };

interface AuthContextType {
  user: AuthUser | null;
  sessionToken: string | null;
  loading: boolean;
  /** A saved session exists but could not be checked because the API was unreachable. */
  sessionUnverified: boolean;
  retrySession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionUnverified, setSessionUnverified] = useState(false);
  const { language } = useLanguage();
  // Stored untranslated so a visible error follows a later language change.
  const [error, setError] = useState<UserMessage | null>(null);
  const tokenRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const persistSession = useCallback(async (token: string, nextUser: AuthUser) => {
    tokenRef.current = token;
    await saveSessionToken(token);
    setSessionToken(token);
    setUser(nextUser);
    setSessionUnverified(false);
  }, []);

  const clearSession = useCallback(async () => {
    tokenRef.current = null;
    await clearSessionToken();
    setSessionToken(null);
    setUser(null);
    setSessionUnverified(false);
  }, []);

  const verifyStoredSession = useCallback(async () => {
    let token: string | null;
    try {
      token = await getSessionToken();
    } catch {
      token = null;
    }
    if (!token) {
      if (mountedRef.current) {
        setSessionUnverified(false);
      }
      return;
    }
    try {
      const { user: restored } = await fetchCurrentUser(token);
      if (mountedRef.current) {
        tokenRef.current = token;
        setSessionToken(token);
        setUser(restored);
        setSessionUnverified(false);
      }
    } catch (e) {
      if (isSessionInvalid(e)) {
        await clearSessionToken();
        if (mountedRef.current) {
          tokenRef.current = null;
          setSessionToken(null);
          setUser(null);
          setSessionUnverified(false);
          setError(SESSION_EXPIRED);
        }
        return;
      }
      // Network, timeout and 5xx failures keep the stored token so the session can be retried.
      if (mountedRef.current) {
        setSessionUnverified(true);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    verifyStoredSession().finally(() => {
      if (mountedRef.current) {
        setLoading(false);
      }
    });
    return () => {
      mountedRef.current = false;
    };
  }, [verifyStoredSession]);

  useEffect(
    () =>
      setSessionInvalidListener(rejectedToken => {
        if (!rejectedToken || tokenRef.current !== rejectedToken) {
          return;
        }
        tokenRef.current = null;
        clearSessionToken()
          .catch(() => {})
          .finally(() => {
            if (mountedRef.current) {
              setSessionToken(null);
              setUser(null);
              setSessionUnverified(false);
              setError(SESSION_EXPIRED);
            }
          });
      }),
    [],
  );

  const retrySession = useCallback(async () => {
    setError(null);
    await verifyStoredSession();
  }, [verifyStoredSession]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const emailResult = validateEmail(email);
      if (!emailResult.ok) {
        throw new Error(emailResult.message);
      }
      const passwordResult = validatePassword(password);
      if (!passwordResult.ok) {
        throw new Error(passwordResult.message);
      }
      const result = await loginAccount(emailResult.value, passwordResult.value);
      await persistSession(result.token, result.user);
    } catch (e: unknown) {
      const message = describeError(e, 'auth.error.signInFailed');
      setError(message);
      throw new Error(resolveMessage(message, language));
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const nameResult = validateName(name);
      if (!nameResult.ok) {
        throw new Error(nameResult.message);
      }
      const emailResult = validateEmail(email);
      if (!emailResult.ok) {
        throw new Error(emailResult.message);
      }
      const passwordResult = validatePassword(password);
      if (!passwordResult.ok) {
        throw new Error(passwordResult.message);
      }
      const result = await registerAccount(
        nameResult.value,
        emailResult.value,
        passwordResult.value,
      );
      await persistSession(result.token, result.user);
    } catch (e: unknown) {
      const message = describeError(e, 'auth.error.registerFailed');
      setError(message);
      throw new Error(resolveMessage(message, language));
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = tokenRef.current;
      if (token) {
        try {
          await logoutAccount(token);
        } catch {
          // Local sign-out still proceeds if the API is unreachable.
        }
      }
      await clearSession();
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    const token = tokenRef.current;
    if (!token) {
      return;
    }
    const { user: latest } = await fetchCurrentUser(token);
    setUser(latest);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionToken,
        loading,
        sessionUnverified,
        retrySession,
        login,
        register,
        logout,
        refreshUser,
        error: error ? resolveMessage(error, language) : null,
        clearError,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
};
