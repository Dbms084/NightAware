import { Link } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/providers/AuthProvider';

type AuthFormProps = { mode: 'sign-in' | 'sign-up' };
type AuthFieldProps = ComponentProps<typeof TextInput> & { icon: string; label: string };

const ACCENT = '#ff9200';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function BrandHeader() {
  return (
    <View style={styles.brandHeader}>
      <View style={styles.brandMark}>
        <Text style={styles.brandMarkText}>◉</Text>
        <View style={styles.brandDot} />
      </View>
      <Text style={styles.brandName}>
        Night<Text style={styles.accentText}>Aware</Text>
      </Text>
      <View style={styles.taglineRow}>
        <Text style={styles.moon}>☾</Text>
        <Text style={styles.tagline}>INTELLIGENT NIGHT NAVIGATION</Text>
      </View>
    </View>
  );
}

function AuthField({ icon, label, ...props }: AuthFieldProps) {
  return (
    <View style={styles.field}>
      <Text accessibilityElementsHidden style={styles.fieldIcon}>{icon}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#969da1"
        style={styles.input}
        {...props}
      />
    </View>
  );
}

export function AuthForm({ mode }: AuthFormProps) {
  const isSignUp = mode === 'sign-up';
  const { signIn, signUp, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmationEmail, setConfirmationEmail] = useState('');

  async function handleSubmit() {
    setErrorMessage('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage('Enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Enter your password.');
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const result = await signUp(normalizedEmail, password);
        if (result.requiresEmailConfirmation) setConfirmationEmail(normalizedEmail);
      } else {
        await signIn(normalizedEmail, password);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'We couldn’t complete that request.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = confirmationEmail ? 'Check your email' : isSignUp ? 'Create your account' : 'Welcome back';
  const description = confirmationEmail
    ? `We sent a confirmation link to ${confirmationEmail}. Confirm your email, then sign in.`
    : isSignUp
      ? 'Join NightAware to plan safer journeys and stay informed.'
      : 'Log in to plan safer journeys and stay aware.';

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <BrandHeader />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>

            {confirmationEmail ? (
              <Link href="/(auth)/sign-in" asChild>
                <Pressable style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Back to log in</Text>
                </Pressable>
              </Link>
            ) : (
              <>
                <AuthField
                  icon="✉"
                  label="Email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="Email"
                  returnKeyType="next"
                  textContentType="emailAddress"
                  value={email}
                />
                <AuthField
                  icon="♙"
                  label="Password"
                  autoCapitalize="none"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  onChangeText={setPassword}
                  onSubmitEditing={handleSubmit}
                  placeholder="Password"
                  returnKeyType={isSignUp ? 'next' : 'go'}
                  secureTextEntry
                  textContentType={isSignUp ? 'newPassword' : 'password'}
                  value={password}
                />
                {isSignUp ? (
                  <AuthField
                    icon="♙"
                    label="Confirm password"
                    autoCapitalize="none"
                    autoComplete="new-password"
                    onChangeText={setConfirmPassword}
                    onSubmitEditing={handleSubmit}
                    placeholder="Confirm password"
                    returnKeyType="go"
                    secureTextEntry
                    textContentType="newPassword"
                    value={confirmPassword}
                  />
                ) : null}

                {!isConfigured ? (
                  <Text style={styles.setupMessage}>
                    Add your Supabase URL and publishable key to the local environment to enable authentication.
                  </Text>
                ) : null}
                {errorMessage ? (
                  <Text accessibilityRole="alert" style={styles.errorMessage}>{errorMessage}</Text>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isSubmitting || !isConfigured }}
                  disabled={isSubmitting || !isConfigured}
                  onPress={handleSubmit}
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                  {isSubmitting ? <ActivityIndicator color="#080a0b" /> : (
                    <Text style={styles.primaryButtonText}>
                      {isSignUp ? 'Create account' : 'Log in'}  →
                    </Text>
                  )}
                </Pressable>

                <View style={styles.switchRow}>
                  <Text style={styles.switchPrompt}>
                    {isSignUp ? 'Already have an account?' : 'Don’t have an account?'}
                  </Text>
                  <Link href={isSignUp ? '/(auth)/sign-in' : '/(auth)/sign-up'} asChild>
                    <Pressable style={styles.switchButton}>
                      <Text style={styles.switchLink}>{isSignUp ? 'Log in' : 'Register'}</Text>
                    </Pressable>
                  </Link>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#080a0b' },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  form: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  brandHeader: { alignItems: 'center', marginBottom: 42 },
  brandMark: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandMarkText: { fontSize: 48, color: '#ffffff' },
  brandDot: {
    position: 'absolute',
    bottom: 16,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: ACCENT,
  },
  brandName: { fontSize: 29, fontWeight: '700', color: '#ffffff' },
  accentText: { color: ACCENT },
  taglineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 26 },
  moon: { color: ACCENT, fontSize: 18, marginRight: 12 },
  tagline: { color: '#c3c7ca', fontSize: 11, fontWeight: '500', letterSpacing: 2.5 },
  title: { color: '#ffffff', fontSize: 34, fontWeight: '600', marginBottom: 8 },
  description: { color: '#b5bbc0', fontSize: 17, lineHeight: 24, marginBottom: 26 },
  field: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#394044',
    backgroundColor: '#111516',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  fieldIcon: { width: 28, textAlign: 'center', color: '#d4d8da', fontSize: 22, marginRight: 12 },
  input: { flex: 1, minHeight: 56, color: '#ffffff', fontSize: 16, paddingVertical: 8 },
  setupMessage: { color: '#f2c879', fontSize: 14, lineHeight: 20, marginBottom: 14 },
  errorMessage: { color: '#ff9a9a', fontSize: 14, lineHeight: 20, marginBottom: 14 },
  primaryButton: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: ACCENT,
  },
  primaryButtonText: { color: '#080a0b', fontSize: 18, fontWeight: '600' },
  pressed: { opacity: 0.8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  switchPrompt: { color: '#b5bbc0', fontSize: 15 },
  switchButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  switchLink: { color: ACCENT, fontSize: 15, fontWeight: '600' },
});
