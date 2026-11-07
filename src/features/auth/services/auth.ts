import type { AuthError } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

function requireConfiguration() {
  if (!isSupabaseConfigured) {
    throw new Error('Authentication is not configured. Add your Supabase URL and publishable key.');
  }
}

export function getAuthErrorMessage(error: AuthError): string {
  const message = error.message.toLowerCase();
  const code = error.code?.toLowerCase() ?? '';

  if (message.includes('invalid login credentials')) {
    return 'Email or password is incorrect.';
  }
  if (code === 'email_address_not_authorized' || message.includes('email address not authorized')) {
    return 'Supabase’s default email service only sends to project team members. Configure custom SMTP to register other email addresses.';
  }
  if (code === 'over_email_send_rate_limit' || message.includes('email rate limit exceeded')) {
    return 'Supabase’s email send limit was reached. Wait before trying again, or configure custom SMTP.';
  }
  if (code === 'signup_disabled' || message.includes('signups not allowed')) {
    return 'Email registration is disabled for this Supabase project.';
  }
  if (code === 'email_provider_disabled') {
    return 'Email sign-in is disabled for this Supabase project.';
  }
  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in.';
  }
  if (code === 'weak_password' || message.includes('password')) {
    return 'Password does not meet your Supabase project requirements.';
  }
  if (error.status === 429) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  return 'We couldn’t complete that request. Check your connection and try again.';
}

export async function signInWithEmailPassword(email: string, password: string) {
  requireConfiguration();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(getAuthErrorMessage(error));
}

export async function signUpWithEmailPassword(email: string, password: string) {
  requireConfiguration();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(getAuthErrorMessage(error));
  return { requiresEmailConfirmation: !data.session };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(getAuthErrorMessage(error));
}
