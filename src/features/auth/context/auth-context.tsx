import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AuthCredentials, Session, User } from '../types';
import * as authService from '../services/auth-service';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (credentials: AuthCredentials) => Promise<{ error: string | null }>;
  signUp: (credentials: AuthCredentials) => Promise<{ error: string | null }>;
  signInAsGuest: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session from AsyncStorage on app launch
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const stored = await authService.getStoredSession();
        if (isMounted) {
          if (stored) {
            setSession(stored);
            setUser(stored.user);
          } else {
            setSession(null);
            setUser(null);
          }
        }
      } catch {
        if (isMounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignIn = async (credentials: AuthCredentials) => {
    const res = await authService.signIn(credentials);
    if (res.user && res.session) {
      setUser(res.user);
      setSession(res.session);
      return { error: null };
    }
    return { error: res.error || 'Failed to sign in' };
  };

  const handleSignUp = async (credentials: AuthCredentials) => {
    const res = await authService.signUp(credentials);
    if (res.user && res.session) {
      setUser(res.user);
      setSession(res.session);
      return { error: null };
    }
    return { error: res.error || 'Failed to sign up' };
  };

  const handleSignInAsGuest = async () => {
    const res = await authService.signInAsGuest();
    if (res.user && res.session) {
      setUser(res.user);
      setSession(res.session);
      return { error: null };
    }
    return { error: res.error || 'Failed to start guest session' };
  };

  const handleSignOut = async () => {
    await authService.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signInAsGuest: handleSignInAsGuest,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
