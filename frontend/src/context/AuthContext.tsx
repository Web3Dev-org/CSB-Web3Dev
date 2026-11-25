import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { AuthContext, type AuthContextValue } from "./useAuth";

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
    const token = getAccessToken();
    if (!token) return;

    let cancelled = false;

    unwrap(apiClient.GET("/users/me"))
      .then((currentUser) => {
        if (!cancelled) {
          setUser(currentUser);
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearAccessToken();
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
      isAdmin: user?.role === "admin",
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