import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import {
  signInWithEmailPassword,
  signOut as signOutService,
  signUpWithEmailPassword,
} from '@/features/auth/services/auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let receivedAuthEvent = false;

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      receivedAuthEvent = true;
      if (isMounted) {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted || receivedAuthEvent) return;
      setUser(error ? null : data.session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isConfigured: isSupabaseConfigured,
    signIn: signInWithEmailPassword,
    signUp: signUpWithEmailPassword,
    signOut: signOutService,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
