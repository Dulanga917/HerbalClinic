import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { Colors, Typography, Spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Splash'>;
};

const MIN_SPLASH_MS = 1200;

const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const { loading, user } = useAuth();
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  // A restored session is routed to Home by AppNavigator; only send signed-out users to Login.
  useEffect(() => {
    if (minElapsed && !loading && !user) {
      navigation.replace('Login');
    }
  }, [minElapsed, loading, user, navigation]);

  return (
    <LinearGradient
      colors={Colors.gradientGreen}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.logoContainer}>
        <Text style={styles.emoji}>🌿</Text>
        <Text style={styles.appName}>HerbalClinic</Text>
        <Text style={styles.tagline}>Ayurvedic self-care companion</Text>
        {minElapsed && loading ? (
          <View style={styles.statusRow} accessibilityLiveRegion="polite">
            <ActivityIndicator color={Colors.textPrimary} size="small" />
            <Text style={styles.statusText}>Checking your sign-in…</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.footer}>Informational guidance — not a medical diagnosis</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 72,
    marginBottom: Spacing.md,
  },
  appName: {
    fontSize: Typography['4xl'],
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: Typography.md,
    color: 'rgba(240,244,241,0.85)',
    marginTop: Spacing.sm,
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing['2xl'],
  },
  statusText: {
    fontSize: Typography.sm,
    color: 'rgba(240,244,241,0.85)',
  },
  footer: {
    position: 'absolute',
    bottom: Spacing['3xl'],
    fontSize: Typography.sm,
    color: 'rgba(240,244,241,0.85)',
  },
});

export default SplashScreen;
