export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export type Session = {
  user: User;
  token: string;
  expiresAt: number;
};

export type AuthCredentials = {
  email: string;
  password: string;
  name?: string;
};

export type AuthResponse = {
  user: User | null;
  session: Session | null;
  error: string | null;
};
