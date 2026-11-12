import React, { useState } from 'react';
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
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, signInAsGuest } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    setErrorMessage(null);
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn({ email: email.trim(), password });
      if (error) {
        setErrorMessage(error);
      } else {
        // Successful login - navigation guard in _layout will automatically route to (app)
        router.replace('/(app)');
      }
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = () => {
    setEmail('demo@nightaware.app');
    setPassword('password123');
    setErrorMessage(null);
  };

  const handleGuestLogin = async () => {
    setErrorMessage(null);
    setGuestLoading(true);
    try {
      const { error } = await signInAsGuest();
      if (error) {
        setErrorMessage(error);
      } else {
        router.replace('/(app)');
      }
    } catch {
      setErrorMessage('Failed to enter as guest.');
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header & Logo */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoIcon}>🌙</Text>
            </View>
            <Text style={styles.title}>NightAware</Text>
            <Text style={styles.subtitle}>
              Intelligent nighttime route comparison & safety indicator engine
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.formTitle}>Sign In</Text>

            {errorMessage && (
              <View style={styles.errorBox}>
                <Text style={styles.errorEmoji}>⚠️</Text>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Email Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <TextInput
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="name@example.com"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>PASSWORD</Text>
                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.showPasswordText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </Pressable>
              </View>
              <TextInput
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter password"
                placeholderTextColor="#64748b"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={styles.input}
              />
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleSignIn}
              disabled={loading || guestLoading}
              style={({ pressed }) => [
                styles.primaryBtn,
                (loading || pressed) && styles.primaryBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              {loading ? (
                <ActivityIndicator color="#090D17" />
              ) : (
                <Text style={styles.primaryBtnText}>Sign In</Text>
              )}
            </Pressable>

            {/* Demo & Guest options */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR QUICK ACCESS</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.quickActionsCol}>
              <Pressable
                onPress={handleQuickDemo}
                style={styles.secondaryBtn}
                accessibilityRole="button"
                accessibilityLabel="Fill demo credentials"
              >
                <Text style={styles.secondaryBtnText}>
                  Use Demo Account (demo@nightaware.app)
                </Text>
              </Pressable>

              <Pressable
                onPress={handleGuestLogin}
                disabled={loading || guestLoading}
                style={styles.guestBtn}
                accessibilityRole="button"
                accessibilityLabel="Continue as guest"
              >
                {guestLoading ? (
                  <ActivityIndicator color="#F7F7F5" size="small" />
                ) : (
                  <Text style={styles.guestBtnText}>Continue as Guest →</Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* Footer Link */}
          <View style={styles.footer}>
            <Text style={styles.footerPrompt}>Don't have an account?</Text>
            <Pressable onPress={() => router.push('/(auth)/sign-up')}>
              <Text style={styles.footerLink}>Create Account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090D17',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#171A22',
    borderWidth: 1.5,
    borderColor: '#ff9400',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoIcon: {
    fontSize: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#F7F7F5',
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 13,
    color: '#A7ADBB',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 290,
  },
  card: {
    backgroundColor: '#171A22',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#262d36',
    padding: 20,
  },
  formTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#F7F7F5',
    marginBottom: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorEmoji: {
    fontSize: 16,
  },
  errorText: {
    flex: 1,
    color: '#fca5a5',
    fontSize: 13,
    lineHeight: 17,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A7ADBB',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  showPasswordText: {
    fontSize: 12,
    color: '#ff9400',
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0F121C',
    borderWidth: 1,
    borderColor: '#262d36',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#F7F7F5',
  },
  primaryBtn: {
    backgroundColor: '#ff9400',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 48,
  },
  primaryBtnPressed: {
    opacity: 0.85,
  },
  primaryBtnText: {
    color: '#090D17',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#262d36',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.8,
  },
  quickActionsCol: {
    gap: 10,
  },
  secondaryBtn: {
    backgroundColor: '#222630',
    borderWidth: 1,
    borderColor: '#343945',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  secondaryBtnText: {
    color: '#D7B66A',
    fontSize: 13,
    fontWeight: '600',
  },
  guestBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#343945',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  guestBtnText: {
    color: '#F7F7F5',
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
  },
  footerPrompt: {
    color: '#A7ADBB',
    fontSize: 14,
  },
  footerLink: {
    color: '#ff9400',
    fontSize: 14,
    fontWeight: '700',
  },
});
