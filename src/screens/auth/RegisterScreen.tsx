import React, { useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import {
  MIN_PASSWORD_LENGTH,
  validateEmail,
  validateName,
  validatePassword,
} from '../../constants/passwordPolicy';
import FormField from '../../components/FormField';
import HerbalButton from '../../components/HerbalButton';
import { useTopInset } from '../../components/ScreenHeader';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

type FieldName = 'name' | 'email' | 'password' | 'confirmPassword';
type FieldErrors = Partial<Record<FieldName, string>>;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const { register, error, clearError, loading } = useAuth();
  const topInset = useTopInset();

  useEffect(
    () => navigation.addListener('beforeRemove', () => clearError()),
    [navigation, clearError],
  );

  const clearFieldError = (field: FieldName) => {
    if (fieldErrors[field]) {
      setFieldErrors(current => ({ ...current, [field]: undefined }));
    }
  };

  const handleRegister = async () => {
    if (submittingRef.current) {
      return;
    }
    clearError();

    const nextErrors: FieldErrors = {};
    const nameResult = validateName(name);
    if (!nameResult.ok) {
      nextErrors.name = nameResult.message;
    }
    const emailResult = validateEmail(email);
    if (!email.trim()) {
      nextErrors.email = 'Please enter your email address.';
    } else if (!emailResult.ok) {
      nextErrors.email = emailResult.message;
    }
    const passwordResult = validatePassword(password);
    if (!passwordResult.ok) {
      nextErrors.password = passwordResult.message;
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'The passwords do not match.';
    }
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean) || !nameResult.ok || !emailResult.ok || !passwordResult.ok) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await register(nameResult.value, emailResult.value, passwordResult.value);
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
        style={[styles.flex, { paddingTop: topInset }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <Text style={styles.emoji}>🌱</Text>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Start your Ayurvedic wellness journey</Text>
          </View>

          <View style={styles.card}>
            <FormField
              label="Full Name"
              placeholder="Your name"
              value={name}
              onChangeText={value => {
                setName(value);
                clearFieldError('name');
              }}
              error={fieldErrors.name}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              blurOnSubmit={false}
              editable={!busy}
            />

            <FormField
              ref={emailRef}
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChangeText={value => {
                setEmail(value);
                clearFieldError('email');
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
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              value={password}
              onChangeText={value => {
                setPassword(value);
                clearFieldError('password');
              }}
              error={fieldErrors.password}
              passwordToggle
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password-new"
              textContentType="newPassword"
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              blurOnSubmit={false}
              editable={!busy}
            />

            <FormField
              ref={confirmRef}
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={value => {
                setConfirmPassword(value);
                clearFieldError('confirmPassword');
              }}
              error={fieldErrors.confirmPassword}
              passwordToggle
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password-new"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={handleRegister}
              editable={!busy}
            />

            {error ? (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <HerbalButton
              title="Create Account"
              onPress={handleRegister}
              loading={busy}
              loadingLabel="Creating account…"
              style={styles.registerBtn}
            />
          </View>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => {
                clearError();
                navigation.navigate('Login');
              }}
              disabled={busy}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Sign In">
              <Text style={styles.loginLink}>Sign In</Text>
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
  title: { fontSize: Typography['3xl'], fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.5 },
  subtitle: { fontSize: Typography.base, color: Colors.textSecondary, marginTop: Spacing.xs, textAlign: 'center' },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  errorBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: 'rgba(250,82,82,0.08)',
  },
  errorText: { color: '#ff9a9a', fontSize: Typography.sm, lineHeight: 20 },
  registerBtn: { marginTop: Spacing.xl },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xl },
  loginText: { fontSize: Typography.base, color: Colors.textSecondary },
  loginLink: { fontSize: Typography.base, color: Colors.primaryLight, fontWeight: '700' },
});

export default RegisterScreen;
