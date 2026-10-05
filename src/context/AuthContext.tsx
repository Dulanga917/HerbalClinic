import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

// --- Types ---
interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Mock user store (replace with Firebase later) ---
const MOCK_USERS: Record<string, { password: string; name: string }> = {};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simulate checking persisted session on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await new Promise(r => setTimeout(r, 1000));
      const stored = MOCK_USERS[email.toLowerCase()];
      if (!stored || stored.password !== password) {
        throw new Error('Invalid email or password.');
      }
      setUser({
        uid: `uid_${email}`,
        email,
        displayName: stored.name,
      });
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await new Promise(r => setTimeout(r, 1000));
      if (MOCK_USERS[email.toLowerCase()]) {
        throw new Error('An account with this email already exists.');
      }
      MOCK_USERS[email.toLowerCase()] = { password, name };
      setUser({
        uid: `uid_${email}`,
        email,
        displayName: name,
      });
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    setUser(null);
    setLoading(false);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, error, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
