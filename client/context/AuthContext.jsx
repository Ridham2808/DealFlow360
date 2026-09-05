'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Load current authenticated user via secure cookie
  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/auth/me');
      if (res && res.data && res.data.user) {
        setUser(res.data.user);
        return res.data.user;
      } else {
        setUser(null);
        return null;
      }
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Helper to determine redirect path based on user role
  const getRoleRedirectPath = (role) => {
    if (role === 'CUSTOMER') {
      return '/portal';
    }
    return '/dashboard';
  };

  // Login handler
  const login = async ({ email, password }) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/auth/login', { email, password });
      const loggedInUser = res?.data?.user;
      setUser(loggedInUser);

      if (loggedInUser?.role) {
        router.push(getRoleRedirectPath(loggedInUser.role));
      } else {
        router.push('/dashboard');
      }
      return { success: true, user: loggedInUser };
    } catch (err) {
      setError(err.message || 'Login failed');
      return { success: false, error: err.message, code: err.code };
    } finally {
      setLoading(false);
    }
  };

  // Signup handler
  const signup = async (payload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/auth/signup', payload);
      const newUser = res?.data?.user;
      setUser(newUser);

      if (newUser?.role) {
        router.push(getRoleRedirectPath(newUser.role));
      } else {
        router.push('/dashboard');
      }
      return { success: true, user: newUser };
    } catch (err) {
      setError(err.message || 'Signup failed');
      return { success: false, error: err.message, code: err.code };
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    refreshUser: loadUser,
    isAuthenticated: !!user,
    isInternal: user && user.role !== 'CUSTOMER',
    isCustomer: user?.role === 'CUSTOMER',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
