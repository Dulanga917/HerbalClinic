import React, { useState } from 'react';
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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { validateEmail, validatePassword } from '../../constants/passwordPolicy';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, error, clearError } = useAuth();

  const handleLogin = async () => {
    clearError();

    const trimmedEmail = email.trim();
    const trimmedPassword = password;

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Missing details', 'Please enter your email and password.');
      return;
    }

    const emailResult = validateEmail(trimmedEmail);
    if (!emailResult.ok) {
      Alert.alert('Check your email', emailResult.message);
      return;
    }

    const passwordResult = validatePassword(trimmedPassword);
    if (!passwordResult.ok) {
      Alert.alert('Check your password', passwordResult.message);
      return;
    }

    try {
      await login(emailResult.value, passwordResult.value);
    } catch (err: any) {
      Alert.alert('Login failed', err?.message || 'Invalid email or password.');
    }
  };

  return (
    <LinearGradient colors={Colors.gradientDark} style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>🌿</Text>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your HerbalClinic account</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity style={styles.loginBtnWrapper} onPress={handleLogin}>
              <LinearGradient
                colors={Colors.gradientGreen}
                style={styles.loginBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}>
                <Text style={styles.loginBtnText}>Sign In</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Register Link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
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
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  label: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography.base,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  forgotBtn: { alignSelf: 'flex-end', marginTop: Spacing.sm },
  forgotText: { fontSize: Typography.sm, color: Colors.primaryLight },
  errorText: { color: '#ff9a9a', fontSize: Typography.sm, marginTop: Spacing.sm },
  loginBtnWrapper: { marginTop: Spacing.xl, borderRadius: BorderRadius.md, overflow: 'hidden' },
  loginBtn: { paddingVertical: Spacing.base + 2, alignItems: 'center', borderRadius: BorderRadius.md },
  loginBtnText: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.5 },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  registerText: { fontSize: Typography.base, color: Colors.textSecondary },
  registerLink: { fontSize: Typography.base, color: Colors.primaryLight, fontWeight: '700' },
});

export default LoginScreen;
