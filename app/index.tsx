import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import {
  auth,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from '@/lib/firebase';
import { useColorScheme } from '@/hooks/use-color-scheme';

type AuthMode = 'login' | 'signup';

type AuthError = {
  code?: string;
  message?: string;
};

const getAuthErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object') {
    const { code, message } = error as AuthError;
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-email':
        return 'Invalid email or password. Please try again.';
      case 'auth/email-already-in-use':
        return 'Email already in use. Try logging in or reset your password.';
      case 'auth/weak-password':
        return 'Password is too weak. Use at least 6 characters.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.';
      default:
        if (message) return message;
    }
  }
  return 'Something went wrong. Please try again.';
};

export default function AuthScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLogin = mode === 'login';

  const handlePrimary = async () => {
    if (loading) return;
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please enter email and password.');
      return;
    }

    if (!isLogin && trimmedPassword !== confirmPassword.trim()) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      } else {
        const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        if (name.trim()) {
          await updateProfile(credential.user, { displayName: name.trim() }).catch(() => null);
        }
      }
      router.replace('/(tabs)/home');
    } catch (err) {
      console.error(err);
      const message = getAuthErrorMessage(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (loading) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Enter your email to reset your password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      Alert.alert('Password reset sent', 'Check your email for reset instructions.');
    } catch (err) {
      const message = getAuthErrorMessage(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    Alert.alert('Google Sign-In', 'We will hook this up next.');
  };

  const bottomPrompt = isLogin ? "Don't have an account? " : 'Already have an account? ';
  const bottomAction = isLogin ? 'Sign up' : 'Log in';
  const primaryLabel = loading ? (isLogin ? 'Logging in...' : 'Creating account...') : isLogin ? 'Log In' : 'Create Account';

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}>
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top + 8, 28),
              paddingBottom: Math.max(insets.bottom + 20, 40),
            },
          ]}>
          <View style={styles.backgroundGlyphs} pointerEvents="none">        
            <Text style={[styles.glyph, styles.glyphPi, { color: theme.primaryMuted }]}>π</Text>        
            <Text style={[styles.glyph, styles.glyphInfinity, { color: theme.primaryMuted }]}>∞</Text>        
          </View>        
        
          <View style={styles.headerCenter}>        
            <View        
              style={[        
                styles.logoBadge,        
                {        
                  backgroundColor: theme.primaryMuted,        
                  borderColor: theme.border,        
                  shadowColor: theme.shadow,        
                },        
              ]}>        
              <Ionicons name="calculator-outline" size={28} color={theme.primary} />        
            </View>        
          </View>        
        
          <Text style={[styles.title, { color: theme.text }]}>Speed Math</Text>        
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Solve fast, score high.</Text>        
        
          <View        
            style={[        
              styles.switcher,        
              {        
                borderColor: theme.border,        
                backgroundColor: theme.card,        
                shadowColor: theme.shadow,        
              },        
            ]}>        
            <Pressable        
              onPress={() => setMode('login')}        
              style={[        
                styles.switcherButton,        
                mode === 'login' && styles.switcherActive,        
                mode === 'login' && { backgroundColor: theme.primary, shadowColor: theme.shadow },        
              ]}>        
              <Text style={[styles.switcherLabel, mode === 'login' && styles.switcherLabelActive]}>Login</Text>        
            </Pressable>        
            <Pressable        
              onPress={() => setMode('signup')}        
              style={[        
                styles.switcherButton,        
                mode === 'signup' && styles.switcherActive,        
                mode === 'signup' && { backgroundColor: theme.primary, shadowColor: theme.shadow },        
              ]}>        
              <Text style={[styles.switcherLabel, mode === 'signup' && styles.switcherLabelActive]}>Sign Up</Text>        
            </Pressable>        
          </View>        
        
          <View style={[styles.formCard, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>        
            <Text style={[styles.sectionTitle, { color: theme.text }]}>        
              {isLogin ? 'Welcome back, Math Whiz!' : 'Create your account'}        
            </Text>        
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>        
              {isLogin ? 'Please enter your details to sign in.' : 'Please enter your details to sign up.'}        
            </Text>        
        
            {!isLogin && (        
              <View style={styles.field}>        
                <Text style={[styles.label, { color: theme.textMuted }]}>Name</Text>        
                <View        
                  style={[        
                    styles.inputShell,        
                    {        
                      backgroundColor: theme.inputBackground,        
                      borderColor: theme.border,        
                      shadowColor: theme.shadow,        
                    },        
                  ]}>        
                  <TextInput        
                    placeholder="Your name"        
                    placeholderTextColor={theme.textMuted}        
                    style={[styles.input, { color: theme.text }]}        
                    value={name}        
                    onChangeText={setName}        
                    autoCapitalize="words"        
                    returnKeyType="next"        
                  />        
                  <Ionicons name="person-outline" size={20} color={theme.icon} />        
                </View>        
              </View>        
            )}        
        
            <View style={styles.field}>        
              <Text style={[styles.label, { color: theme.textMuted }]}>Email</Text>        
              <View        
                style={[        
                  styles.inputShell,        
                  {        
                    backgroundColor: theme.inputBackground,        
                    borderColor: theme.border,        
                    shadowColor: theme.shadow,        
                  },        
                ]}>        
                <TextInput        
                  placeholder="mathwhiz@example.com"        
                  placeholderTextColor={theme.textMuted}        
                  style={[styles.input, { color: theme.text }]}        
                  value={email}        
                  onChangeText={setEmail}        
                  keyboardType="email-address"        
                  autoCapitalize="none"        
                  autoComplete="email"        
                  textContentType="emailAddress"        
                  returnKeyType="next"        
                />        
                <MaterialCommunityIcons name="email-outline" size={20} color={theme.icon} />        
              </View>        
            </View>        
        
            <View style={styles.field}>        
              <Text style={[styles.label, { color: theme.textMuted }]}>Password</Text>        
              <View        
                style={[        
                  styles.inputShell,        
                  {        
                    backgroundColor: theme.inputBackground,        
                    borderColor: theme.border,        
                    shadowColor: theme.shadow,        
                  },        
                ]}>        
                <TextInput        
                  placeholder="Enter your password"        
                  placeholderTextColor={theme.textMuted}        
                  style={[styles.input, { color: theme.text }]}        
                  value={password}        
                  onChangeText={setPassword}        
                  secureTextEntry={!showPassword}        
                  autoCapitalize="none"        
                  autoComplete={isLogin ? 'password' : 'new-password'}        
                  textContentType={isLogin ? 'password' : 'newPassword'}        
                />        
                <Pressable hitSlop={8} onPress={() => setShowPassword((prev) => !prev)}>        
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.icon} />        
                </Pressable>        
              </View>        
            </View>        
        
            {!isLogin && (        
              <View style={styles.field}>        
                <Text style={[styles.label, { color: theme.textMuted }]}>Confirm Password</Text>        
                <View        
                  style={[        
                    styles.inputShell,        
                    {        
                      backgroundColor: theme.inputBackground,        
                      borderColor: theme.border,        
                      shadowColor: theme.shadow,        
                    },        
                  ]}>        
                  <TextInput        
                    placeholder="Re-enter your password"        
                    placeholderTextColor={theme.textMuted}        
                    style={[styles.input, { color: theme.text }]}        
                    value={confirmPassword}        
                    onChangeText={setConfirmPassword}        
                    secureTextEntry={!showConfirm}        
                    autoCapitalize="none"        
                    textContentType="password"        
                  />        
                  <Pressable hitSlop={8} onPress={() => setShowConfirm((prev) => !prev)}>        
                    <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.icon} />        
                  </Pressable>        
                </View>        
              </View>        
            )}        
        
            {isLogin && (        
              <Pressable style={styles.forgotRow} onPress={handleForgot}>        
                <Text style={[styles.forgotText, { color: theme.primary }]}>Forgot Password?</Text>        
              </Pressable>        
            )}        
        
            <Pressable        
              onPress={handlePrimary}        
              disabled={loading}        
              style={[        
                styles.primaryButton,        
                {        
                  backgroundColor: theme.primary,        
                  shadowColor: theme.shadow,        
                  opacity: loading ? 0.8 : 1,        
                },        
              ]}>        
              <Text style={styles.primaryButtonText}>{primaryLabel}</Text>        
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />        
            </Pressable>        
        
            {error && <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>}        
          </View>        
        
          <View style={styles.dividerRow}>        
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />        
            <Text style={[styles.dividerText, { color: theme.textMuted }]}>Or continue with</Text>        
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />        
          </View>        
        
          <Pressable        
            onPress={handleGoogle}        
            disabled={loading}        
            style={[        
              styles.googleButton,        
              {        
                borderColor: theme.border,        
                backgroundColor: theme.card,        
                shadowColor: theme.shadow,        
                opacity: loading ? 0.8 : 1,        
              },        
            ]}>        
            <View style={styles.googleContent}>        
              <MaterialCommunityIcons name="google" size={20} color="#db4437" />        
              <Text style={[styles.googleText, { color: theme.text }]}>Google</Text>        
            </View>        
          </Pressable>        
        
          <View style={styles.footerRow}>        
            <Text style={[styles.footerText, { color: theme.textMuted }]}>{bottomPrompt}</Text>        
            <Pressable onPress={() => setMode(isLogin ? 'signup' : 'login')}>        
              <Text style={[styles.footerLink, { color: theme.primary }]}>{bottomAction}</Text>        
            </Pressable>        
          </View>        
        
          <Text style={[styles.termsText, { color: theme.textMuted }]}>        
            By continuing, you agree to our <Text style={[styles.footerLink, { color: theme.primary }]}>Terms</Text> &        
            <Text style={[styles.footerLink, { color: theme.primary }]}> Privacy Policy</Text>        
          </Text>        
        </ScrollView>        
      </KeyboardAvoidingView>        
    </SafeAreaView>        
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  backgroundGlyphs: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 360,
  },
  glyph: {
    fontSize: 120,
    fontWeight: '800',
    opacity: 0.08,
  },
  glyphPi: {
    position: 'absolute',
    top: 28,
    left: -6,
  },
  glyphInfinity: {
    position: 'absolute',
    right: -12,
    bottom: 40,
    fontSize: 140,
  },
  headerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 6,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  switcher: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  switcherButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switcherActive: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  switcherLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6b7280',
  },
  switcherLabelActive: {
    color: '#ffffff',
  },
  formCard: {
    borderRadius: 18,
    padding: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionSubtitle: {
    fontSize: 15,
    marginTop: 6,
    marginBottom: 10,
  },
  field: {
    marginTop: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: 10,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 18,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginRight: 8,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    marginHorizontal: 12,
  },
  googleButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  googleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
  termsText: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: 12,
    marginBottom: 8,
  },
});
