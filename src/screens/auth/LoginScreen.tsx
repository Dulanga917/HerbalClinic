import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { validateEmail, validatePassword } from '../../constants/passwordPolicy';
import FormField from '../../components/FormField';
import HerbalButton from '../../components/HerbalButton';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

type FieldErrors = { email?: string; password?: string };

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const submittingRef = useRef(false);
  const passwordRef = useRef<TextInput>(null);
  const { login, error, clearError, loading, sessionUnverified, retrySession } = useAuth();

  const handleRetrySession = async () => {
    setRetrying(true);
    try {
      await retrySession();
    } finally {
      setRetrying(false);
    }
  };

  const handleLogin = async () => {
    if (submittingRef.current) {
      return;
    }
    clearError();

    const nextErrors: FieldErrors = {};
    const emailResult = validateEmail(email);
    if (!email.trim()) {
      nextErrors.email = 'Please enter your email address.';
    } else if (!emailResult.ok) {
      nextErrors.email = emailResult.message;
    }
    const passwordResult = validatePassword(password);
    if (!password) {
      nextErrors.password = 'Please enter your password.';
    } else if (!passwordResult.ok) {
      nextErrors.password = passwordResult.message;
    }
    setFieldErrors(nextErrors);
    if (nextErrors.email || nextErrors.password || !emailResult.ok || !passwordResult.ok) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await login(emailResult.value, passwordResult.value);
    } catch {
      // AuthContext exposes a user-safe message through `error`, shown above the button.
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const busy = submitting || loading;

  return (
    <LinearGradient colors={Colors.gradientDark} style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <Text style={styles.emoji}>🌿</Text>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your HerbalClinic account</Text>
          </View>

          {sessionUnverified ? (
            <View style={styles.sessionCard} accessibilityRole="alert">
              <Text style={styles.sessionTitle}>Could not reach HerbalClinic</Text>
              <Text style={styles.sessionText}>
                Your saved sign-in was kept. Check your connection or the local server, then try
                again.
              </Text>
              <TouchableOpacity
                style={[styles.retryBtn, retrying && styles.retryBtnBusy]}
                onPress={handleRetrySession}
                disabled={retrying}
                accessibilityRole="button"
                accessibilityLabel="Retry saved session"
                accessibilityState={{ disabled: retrying, busy: retrying }}>
                {retrying ? <ActivityIndicator size="small" color={Colors.textPrimary} /> : null}
                <Text style={styles.retryText}>{retrying ? 'Checking…' : 'Retry'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.card}>
            <FormField
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChangeText={value => {
                setEmail(value);
                if (fieldErrors.email) {
                  setFieldErrors(current => ({ ...current, email: undefined }));
                }
              }}
              error={fieldErrors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
              editable={!busy}
            />

            <FormField
              ref={passwordRef}
              label="Password"
              placeholder="Your password"
              value={password}
              onChangeText={value => {
                setPassword(value);
                if (fieldErrors.password) {
                  setFieldErrors(current => ({ ...current, password: undefined }));
                }
              }}
              error={fieldErrors.password}
              passwordToggle
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              editable={!busy}
            />

            <TouchableOpacity
              style={styles.forgotBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              onPress={() =>
                Alert.alert(
                  'Password reset unavailable',
                  'This build does not reset passwords. Create a new account from Sign Up, or sign in with the account you already registered.',
                )
              }>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {error ? (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <HerbalButton
              title="Sign In"
              onPress={handleLogin}
              loading={busy}
              loadingLabel="Signing in…"
              style={styles.loginBtn}
            />
          </View>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              disabled={busy}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Sign Up">
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl },
  header: { alignItems: 'center', marginBottom: Spacing['2xl'] },
  emoji: { fontSize: 56, marginBottom: Spacing.md },
  title: {
    fontSize: Typography['3xl'],
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sessionCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.accent,
    marginBottom: Spacing.base,
  },
  sessionTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  sessionText: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  retryBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 44,
    marginTop: Spacing.md,
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  retryBtnBusy: { opacity: 0.7 },
  retryText: { color: Colors.textPrimary, fontWeight: '700' },
  forgotBtn: { alignSelf: 'flex-end', marginTop: Spacing.md, paddingVertical: Spacing.xs },
  forgotText: { fontSize: Typography.sm, color: Colors.primaryLight },
  errorBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: 'rgba(250,82,82,0.08)',
  },
  errorText: { color: '#ff9a9a', fontSize: Typography.sm, lineHeight: 20 },
  loginBtn: { marginTop: Spacing.xl },
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xl },
  registerText: { fontSize: Typography.base, color: Colors.textSecondary },
  registerLink: { fontSize: Typography.base, color: Colors.primaryLight, fontWeight: '700' },
});

export default LoginScreen;
