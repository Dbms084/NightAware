import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthCredentials, AuthResponse, Session, User } from '../types';

const STORAGE_KEY_SESSION = '@nightaware_auth_session';
const STORAGE_KEY_USERS = '@nightaware_registered_users';

type StoredUserRecord = User & {
  passwordHash: string;
};

const DEFAULT_DEMO_USER: StoredUserRecord = {
  id: 'usr_demo_101',
  email: 'demo@nightaware.app',
  name: 'Demo Traveler',
  passwordHash: 'password123',
  createdAt: new Date().toISOString(),
};

/**
 * Retrieve registered user records from local storage.
 * Pre-populates with a default demo account if storage is currently empty.
 */
async function getStoredUsers(): Promise<StoredUserRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) {
      await AsyncStorage.setItem(STORAGE_KEY_USERS, JSON.stringify([DEFAULT_DEMO_USER]));
      return [DEFAULT_DEMO_USER];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [DEFAULT_DEMO_USER];
  } catch {
    return [DEFAULT_DEMO_USER];
  }
}

/**
 * Persist registered user records to local storage.
 */
async function saveUsers(users: StoredUserRecord[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
}

/**
 * Simple email validation regex.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Generate a local session token and expiration date (30 days).
 */
function createSession(user: User): Session {
  return {
    user,
    token: `local_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };
}

/**
 * Register a new user locally.
 */
export async function signUp({ email, password, name }: AuthCredentials): Promise<AuthResponse> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = (name ?? '').trim() || cleanEmail.split('@')[0];

  if (!cleanEmail) {
    return { user: null, session: null, error: 'Email is required' };
  }
  if (!isValidEmail(cleanEmail)) {
    return { user: null, session: null, error: 'Please enter a valid email address' };
  }
  if (!password || password.length < 6) {
    return { user: null, session: null, error: 'Password must be at least 6 characters' };
  }

  const users = await getStoredUsers();
  const existing = users.find((u) => u.email === cleanEmail);
  if (existing) {
    return { user: null, session: null, error: 'An account with this email already exists' };
  }

  const newUser: StoredUserRecord = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    email: cleanEmail,
    name: cleanName,
    passwordHash: password, // Stored locally on-device
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  await saveUsers(users);

  const { passwordHash: _, ...userProfile } = newUser;
  const session = createSession(userProfile);
  await AsyncStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));

  return { user: userProfile, session, error: null };
}

/**
 * Authenticate an existing user against local storage records.
 */
export async function signIn({ email, password }: AuthCredentials): Promise<AuthResponse> {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail) {
    return { user: null, session: null, error: 'Email is required' };
  }
  if (!password) {
    return { user: null, session: null, error: 'Password is required' };
  }

  const users = await getStoredUsers();
  const match = users.find((u) => u.email === cleanEmail);

  if (!match) {
    return {
      user: null,
      session: null,
      error: 'Account not found. Sign up or use demo@nightaware.app / password123',
    };
  }

  if (match.passwordHash !== password) {
    return { user: null, session: null, error: 'Incorrect password. Please try again.' };
  }

  const { passwordHash: _, ...userProfile } = match;
  const session = createSession(userProfile);
  await AsyncStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));

  return { user: userProfile, session, error: null };
}

/**
 * One-tap guest entry for instant exploration without sign-up.
 */
export async function signInAsGuest(): Promise<AuthResponse> {
  const guestUser: User = {
    id: `guest_${Date.now()}`,
    email: 'guest@nightaware.local',
    name: 'Guest Traveler',
    createdAt: new Date().toISOString(),
  };

  const session = createSession(guestUser);
  await AsyncStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));

  return { user: guestUser, session, error: null };
}

/**
 * Retrieve active session restored on app launch.
 */
export async function getStoredSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_SESSION);
    if (!raw) return null;
    const session: Session = JSON.parse(raw);
    if (!session || !session.expiresAt || session.expiresAt < Date.now()) {
      await AsyncStorage.removeItem(STORAGE_KEY_SESSION);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/**
 * Clear the current active session.
 */
export async function signOut(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_SESSION);
  } catch {}
}
