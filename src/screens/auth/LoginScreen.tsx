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
import LanguageSelector from '../../components/LanguageSelector';
import { useTopInset } from '../../components/ScreenHeader';
import { useLanguage } from '../../i18n';
import { UserMessage } from '../../utils/userMessages';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

type FieldErrors = { email?: UserMessage; password?: UserMessage };

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const submittingRef = useRef(false);
  const passwordRef = useRef<TextInput>(null);
  const { login, error, clearError, loading, sessionUnverified, retrySession } = useAuth();
  const { t } = useLanguage();
  const topInset = useTopInset();

  const fieldError = (message?: UserMessage) => (message ? t(message.key, message.params) : undefined);

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
      nextErrors.email = { key: 'validation.emailRequired' };
    } else if (!emailResult.ok) {
      nextErrors.email = emailResult;
    }
    const passwordResult = validatePassword(password);
    if (!password) {
      nextErrors.password = { key: 'validation.passwordRequired' };
    } else if (!passwordResult.ok) {
      nextErrors.password = passwordResult;
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
        style={[styles.flex, { paddingTop: topInset }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          <LanguageSelector style={styles.language} />

          <View style={styles.header}>
            <Text style={styles.emoji}>🌿</Text>
            <Text style={styles.title}>{t('auth.login.title')}</Text>
            <Text style={styles.subtitle}>{t('auth.login.subtitle')}</Text>
          </View>

          {sessionUnverified ? (
            <View style={styles.sessionCard} accessibilityRole="alert">
              <Text style={styles.sessionTitle}>{t('auth.unreachableTitle')}</Text>
              <Text style={styles.sessionText}>{t('auth.unreachableBody')}</Text>
              <TouchableOpacity
                style={[styles.retryBtn, retrying && styles.retryBtnBusy]}
                onPress={handleRetrySession}
                disabled={retrying}
                accessibilityRole="button"
                accessibilityLabel={t('auth.retrySession')}
                accessibilityState={{ disabled: retrying, busy: retrying }}>
                {retrying ? <ActivityIndicator size="small" color={Colors.textPrimary} /> : null}
                <Text style={styles.retryText}>{retrying ? t('auth.checking') : t('auth.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.card}>
            <FormField
              label={t('auth.email')}
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChangeText={value => {
                setEmail(value);
                if (fieldErrors.email) {
                  setFieldErrors(current => ({ ...current, email: undefined }));
                }
              }}
              error={fieldError(fieldErrors.email)}
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
              label={t('auth.password')}
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChangeText={value => {
                setPassword(value);
                if (fieldErrors.password) {
                  setFieldErrors(current => ({ ...current, password: undefined }));
                }
              }}
              error={fieldError(fieldErrors.password)}
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
              onPress={() => Alert.alert(t('auth.forgotTitle'), t('auth.forgotBody'))}>
              <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
            </TouchableOpacity>

            {error ? (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <HerbalButton
              title={t('auth.signIn')}
              onPress={handleLogin}
              loading={busy}
              loadingLabel={t('auth.signingIn')}
              style={styles.loginBtn}
            />
          </View>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>{t('auth.noAccount')}</Text>
            <TouchableOpacity
              onPress={() => {
                clearError();
                navigation.navigate('Register');
              }}
              disabled={busy}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('auth.signUp')}>
              <Text style={styles.registerLink}>{t('auth.signUp')}</Text>
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
  language: { alignSelf: 'center', marginBottom: Spacing.xl },
  header: { alignItems: 'center', marginBottom: Spacing['2xl'] },
  emoji: { fontSize: 56, marginBottom: Spacing.md },
  title: {
    fontSize: Typography['3xl'],
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.base,
    lineHeight: 22,
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
  sessionText: { fontSize: Typography.sm, lineHeight: 20, color: Colors.textSecondary, marginTop: Spacing.xs },
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
  registerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  registerText: { fontSize: Typography.base, color: Colors.textSecondary },
  registerLink: { fontSize: Typography.base, color: Colors.primaryLight, fontWeight: '700' },
});

export default LoginScreen;
