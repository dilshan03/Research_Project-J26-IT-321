import React, { createContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => void;
  updateUser: (updatedData: Partial<User>) => void;
}

const AUTH_STORAGE_KEY = 'mathquest_auth_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with null or temporary cached data, but verify with backend immediately
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = sessionStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Verify authentication with backend on mount
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      try {
        const response = await authService.getSession();
        if (isMounted) {
          if (response.success && response.data?.user) {
            setUser(response.data.user);
            try {
              sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(response.data.user));
            } catch {
              // ignore storage errors
            }
          } else {
            // Not authenticated on backend: clear local storage
            setUser(null);
            try {
              sessionStorage.removeItem(AUTH_STORAGE_KEY);
              localStorage.removeItem(AUTH_STORAGE_KEY);
            } catch {
              // ignore storage errors
            }
          }
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    try {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
    } catch {
      // ignore storage errors
    }
  };

  const logout = () => {
    setUser(null);
    try {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
    // Invalidate session on the backend and clear cookie
    authService.signOut().catch(() => {});
  };

  const updateUser = (updatedData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated: User = { ...prev, ...updatedData };
      try {
        if (sessionStorage.getItem(AUTH_STORAGE_KEY)) {
          sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
        }
        if (localStorage.getItem(AUTH_STORAGE_KEY)) {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
        }
        if (!sessionStorage.getItem(AUTH_STORAGE_KEY) && !localStorage.getItem(AUTH_STORAGE_KEY)) {
          sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
        }
      } catch {
        // ignore storage errors
      }
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export type { AuthContextType };
export { AuthContext };
