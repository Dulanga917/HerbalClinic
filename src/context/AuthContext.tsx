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
  loginAccount,
  logoutAccount,
  registerAccount,
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

interface AuthContextType {
  user: AuthUser | null;
  sessionToken: string | null;
  loading: boolean;
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
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  const persistSession = useCallback(async (token: string, nextUser: AuthUser) => {
    tokenRef.current = token;
    await saveSessionToken(token);
    setSessionToken(token);
    setUser(nextUser);
  }, []);

  const clearSession = useCallback(async () => {
    tokenRef.current = null;
    await clearSessionToken();
    setSessionToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const token = await getSessionToken();
        if (!token) {
          return;
        }
        const { user: restored } = await fetchCurrentUser(token);
        if (!cancelled) {
          tokenRef.current = token;
          setSessionToken(token);
          setUser(restored);
        }
      } catch {
        await clearSessionToken();
        if (!cancelled) {
          tokenRef.current = null;
          setSessionToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

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
      const message = e instanceof Error ? e.message : 'Invalid email or password.';
      setError(message);
      throw e instanceof Error ? e : new Error(message);
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
      const message = e instanceof Error ? e.message : 'Could not create the account.';
      setError(message);
      throw e instanceof Error ? e : new Error(message);
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
        login,
        register,
        logout,
        refreshUser,
        error,
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
