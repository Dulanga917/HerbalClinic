import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { Colors, Typography, Spacing } from '../../constants/theme';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Splash'>;
};

const SplashScreen: React.FC<Props> = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigation]);

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
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: Spacing['3xl'],
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
});

export default SplashScreen;
