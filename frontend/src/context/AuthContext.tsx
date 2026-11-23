import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  apiClient,
  clearAccessToken,
  getAccessToken,
  onUnauthorized,
  setAccessToken,
  unwrap,
  type AuthResponse,
  type User,
} from "../api";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (auth: AuthResponse) => void;
  updateUserState: (updated: User) => void;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() =>
    Boolean(getAccessToken()),
  );

  const refreshUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await unwrap(apiClient.GET("/users/me"));
      setUser(currentUser);
    } catch {
      clearAccessToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    return onUnauthorized(() => {
      setUser(null);
    });
  }, []);

  const setAuth = useCallback((auth: AuthResponse) => {
    setAccessToken(auth.token);
    setUser(auth.user);
  }, []);

  const updateUserState = useCallback((updated: User) => {
    setUser(updated);
  }, []);

  const logout = useCallback(() => {
    clearAccessToken();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      setAuth,
      updateUserState,
      refreshUser,
      logout,
    }),
    [user, isLoading, setAuth, updateUserState, refreshUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth trebuie folosit în interiorul unui AuthProvider.");
  }
  return context;
}