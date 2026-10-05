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
import { validateEmail, validateName, validatePassword } from '../../constants/passwordPolicy';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { register, error, clearError } = useAuth();

  const handleRegister = async () => {
    clearError();

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Missing details', 'Please fill in all fields.');
      return;
    }

    const nameResult = validateName(name);
    if (!nameResult.ok) {
      Alert.alert('Check your name', nameResult.message);
      return;
    }

    const emailResult = validateEmail(email);
    if (!emailResult.ok) {
      Alert.alert('Check your email', emailResult.message);
      return;
    }

    const passwordResult = validatePassword(password);
    if (!passwordResult.ok) {
      Alert.alert('Check your password', passwordResult.message);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'The passwords do not match.');
      return;
    }

    try {
      await register(nameResult.value, emailResult.value, passwordResult.value);
    } catch (err: any) {
      Alert.alert('Registration failed', err?.message || 'Could not create the account.');
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
            <Text style={styles.emoji}>🌱</Text>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Start your Ayurvedic wellness journey</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your Name"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
            />

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

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Register Button */}
            <TouchableOpacity style={styles.registerBtnWrapper} onPress={handleRegister}>
              <LinearGradient
                colors={Colors.gradientGreen}
                style={styles.registerBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}>
                <Text style={styles.registerBtnText}>Create Account</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
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
  registerBtnWrapper: { marginTop: Spacing.xl, borderRadius: BorderRadius.md, overflow: 'hidden' },
  registerBtn: { paddingVertical: Spacing.base + 2, alignItems: 'center', borderRadius: BorderRadius.md },
  registerBtnText: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.5 },
  errorText: { color: '#ff9a9a', fontSize: Typography.sm, marginTop: Spacing.sm },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  loginText: { fontSize: Typography.base, color: Colors.textSecondary },
  loginLink: { fontSize: Typography.base, color: Colors.primaryLight, fontWeight: '700' },
});

export default RegisterScreen;
