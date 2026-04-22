
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, SafeAreaView,
  ScrollView, Alert, Animated, KeyboardAvoidingView,
  Platform, StatusBar, ImageBackground, TouchableOpacity,
} from 'react-native';
import { FadeIn, ScaleIn, AnimatedButton } from '../components/Animations';

import { registerUser, UserProfile } from '../services/dbService';

// BACKGROUND IMAGE
const BG_IMAGE = require('../assets/03.png');

interface Props {
  onRegister: (profile: UserProfile) => void;
  onLogin: () => void;
}

export default function RegisterScreen({ onRegister, onLogin }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const cardY = useRef(new Animated.Value(140)).current;
  const cardOp = useRef(new Animated.Value(0)).current;
  const overlayOp = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    Animated.timing(overlayOp, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    Animated.parallel([
      Animated.spring(cardY, { toValue: 0, speed: 10, bounciness: 10, delay: 200, useNativeDriver: true }),
      Animated.timing(cardOp, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shineAnim, { toValue: 400, duration: 2000, delay: 1000, useNativeDriver: true }),
          Animated.timing(shineAnim, { toValue: -200, duration: 0, useNativeDriver: true }),
          Animated.delay(4000),
        ])
      ).start();
    });
  }, []);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleRegister = async () => {
    if (!fullName.trim()) { Alert.alert('Missing Field', 'Please enter your full name.'); return; }
    if (!email.trim()) { Alert.alert('Missing Field', 'Please enter your email.'); return; }
    if (!validateEmail(email)) { Alert.alert('Invalid Email', 'Please enter a valid email address.'); return; }
    if (!password.trim()) { Alert.alert('Missing Field', 'Please enter a password.'); return; }
    if (password.length < 6) { Alert.alert('Weak Password', 'Password must be at least 6 characters.'); return; }
    if (password !== confirmPass) { Alert.alert('Password Mismatch', 'Passwords do not match.'); return; }

    setLoading(true);
    try {
      const newUser = await registerUser(fullName.trim(), email.trim(), password);
      setLoading(false);
      Alert.alert(
        '🌿 Welcome!',
        `Account created for ${newUser.fullName}!\nYou can now sign in.`,
        [{ text: 'Sign In', onPress: onLogin }]
      );
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Registration Failed', error.message || 'An error occurred');
    }
  };

  // Password strength
  const getStrength = () => {
    if (password.length === 0) return { label: '', color: 'transparent', width: '0%' };
    if (password.length < 4) return { label: 'Weak', color: '#f87171', width: '30%' };
    if (password.length < 7) return { label: 'Fair', color: '#f59e0b', width: '60%' };
    return { label: 'Strong', color: '#4ade80', width: '100%' };
  };
  const strength = getStrength();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ImageBackground source={BG_IMAGE} style={styles.bgImage} resizeMode="cover">
        <Animated.View style={[styles.overlay, { opacity: overlayOp }]} />
        <View style={[styles.blob, styles.blobTopLeft]} />
        <View style={[styles.blob, styles.blobTopRight]} />
        <View style={[styles.blob, styles.blobBottom]} />
        <View style={styles.bottomGradient} />

        <SafeAreaView style={styles.safe}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            <FadeIn delay={100}>
              <TouchableOpacity style={styles.backBtn} onPress={onLogin} activeOpacity={0.8}>
                <Text style={styles.backTxt}>← Back to Login</Text>
              </TouchableOpacity>
            </FadeIn>

            <ScaleIn delay={200}>
              <View style={styles.logoWrap}>
                <Text style={styles.logoEmoji}>🌱</Text>
              </View>
            </ScaleIn>

            <FadeIn delay={300}>
              <Text style={styles.appName}>Join HerbalClinic</Text>
              <Text style={styles.tagline}>Start your Ayurvedic wellness journey</Text>
            </FadeIn>
            <Animated.View style={[styles.cardOuter, { opacity: cardOp, transform: [{ translateY: cardY }] }]}>

              <View style={styles.glassLayer1} />
              <View style={styles.glassLayer2} />
              <View style={styles.glassLayer3} />
              <Animated.View style={[styles.shine, { transform: [{ translateX: shineAnim }, { rotate: '25deg' }] }]} />
              <View style={styles.topHighlight} />
              <View style={styles.leftHighlight} />
              <View style={styles.cardContent}>
                <Text style={styles.leafLeft}>🌸</Text>
                <Text style={styles.leafRight}>🌼</Text>

                <FadeIn delay={400}>
                  <Text style={styles.cardTitle}>Create Account</Text>
                  <Text style={styles.cardSub}>Fill in your details to get started</Text>
                </FadeIn>
                <FadeIn delay={500}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.inputWrap}>
                    <Text style={styles.inputIcon}>🧑</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your full name"
                      placeholderTextColor="rgba(0,0,0,0.3)"
                      value={fullName}
                      onChangeText={setFullName}
                      autoCapitalize="words"
                    />
                  </View>
                </FadeIn>
                <FadeIn delay={600}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputWrap}>
                    <Text style={styles.inputIcon}>📧</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email"
                      placeholderTextColor="rgba(0,0,0,0.3)"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                    {email.length > 0 && (
                      <Text style={styles.validIcon}>{validateEmail(email) ? '✅' : '❌'}</Text>
                    )}
                  </View>
                </FadeIn>
                <FadeIn delay={700}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrap}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Min. 6 characters"
                      placeholderTextColor="rgba(0,0,0,0.3)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPass}
                    />
                    <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                      <Text style={styles.eyeTxt}>{showPass ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                  {password.length > 0 && (
                    <View style={styles.strengthWrap}>
                      <View style={styles.strengthBg}>
                        <View style={[styles.strengthFill, { width: strength.width as any, backgroundColor: strength.color }]} />
                      </View>
                      <Text style={[styles.strengthTxt, { color: strength.color }]}>{strength.label}</Text>
                    </View>
                  )}
                </FadeIn>
                <FadeIn delay={800}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={styles.inputWrap}>
                    <Text style={styles.inputIcon}>🔐</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Re-enter your password"
                      placeholderTextColor="rgb(255, 254, 254)"
                      value={confirmPass}
                      onChangeText={setConfirmPass}
                      secureTextEntry={!showConfirm}
                    />
                    <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                      <Text style={styles.eyeTxt}>{showConfirm ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                    {confirmPass.length > 0 && (
                      <Text style={styles.validIcon}>{password === confirmPass ? '✅' : '❌'}</Text>
                    )}
                  </View>
                </FadeIn>
                <FadeIn delay={900}>
                  <AnimatedButton onPress={handleRegister} style={styles.registerBtn} color="#347005e6">
                    {loading
                      ? <View style={styles.loadingRow}>
                        <Text style={styles.registerBtnTxt}>Creating account</Text>
                        <View style={styles.dotRow}>
                          {[0, 1, 2].map(i => <BounceDot key={i} delay={i * 150} />)}
                        </View>
                      </View>
                      : <Text style={styles.registerBtnTxt}>  Create My Account</Text>
                    }
                  </AnimatedButton>
                </FadeIn>

                <FadeIn delay={1000}>
                  <Text style={styles.termsTxt}>By registering you agree to our natural wellness journey </Text>
                </FadeIn>
                <FadeIn delay={1050}>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerTxt}>OR</Text>
                    <View style={styles.dividerLine} />
                  </View>
                </FadeIn>
                <FadeIn delay={1100}>
                  <TouchableOpacity style={styles.loginLink} onPress={onLogin} activeOpacity={0.8}>
                    <Text style={styles.loginLinkTxt}>
                      Already have an account?{'  '}
                      <Text style={styles.loginLinkBold}>Sign in →</Text>
                    </Text>
                  </TouchableOpacity>
                </FadeIn>

              </View>
            </Animated.View>

            <FadeIn delay={1200}>
              <Text style={styles.bottomTxt}>Natural healing · Ancient wisdom · Modern care</Text>
            </FadeIn>

          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

function BounceDot({ delay }: { delay: number }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -7, duration: 300, delay, useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(300),
      ])
    ).start();
  }, []);
  return <Animated.View style={[styles.dot, { transform: [{ translateY: y }] }]} />;
}

const styles = StyleSheet.create({
  bgImage: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject },
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 0, backgroundColor: 'rgba(4,16,8,0.45)' },
  safe: { flex: 1 },
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 40, paddingBottom: 30 },

  blob: { position: 'absolute', borderRadius: 999 },
  blobTopLeft: { width: 280, height: 280, top: -80, left: -80, backgroundColor: 'rgba(5, 8, 6, 0.12)' },
  blobTopRight: { width: 240, height: 240, top: 60, right: -60, backgroundColor: 'rgba(0, 0, 0, 0.1)' },
  blobBottom: { width: 320, height: 320, bottom: -100, left: '10%', backgroundColor: 'rgba(9, 9, 9, 0.08)' },

  backBtn: { alignSelf: 'flex-start', marginBottom: 0, paddingVertical: 6, paddingHorizontal: 4, left: -100 },
  backTxt: { color: '#4ade80', fontSize: 14, fontWeight: '700' },

  logoWrap: {
    width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(46,204,113,0.20)',
    borderWidth: 2, borderColor: 'rgba(46,204,113,0.55)', alignItems: 'center', justifyContent: 'center',
    marginBottom: 10, alignSelf: 'center', shadowColor: '#000000', shadowOpacity: 0.7, shadowRadius: 18, elevation: 10,
  },
  logoEmoji: { fontSize: 36 },

  appName: {
    fontSize: 32, fontWeight: '800', color: '#ffffff', textAlign: 'center', letterSpacing: 2,
    textShadowColor: 'rgba(0, 254, 106, 0.7)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18,
  },
  tagline: { fontSize: 13, color: 'rgba(255, 255, 255, 0.99)', textAlign: 'center', marginBottom: 20, letterSpacing: 1 },

  cardOuter: { width: '100%', borderRadius: 28, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 30, elevation: 20 },
  glassLayer1: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0)', borderRadius: 28 },
  glassLayer2: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24, 24, 24, 0.56)', borderRadius: 28 },
  glassLayer3: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(207, 194, 194, 0.04)', borderRadius: 28 },
  shine: { position: 'absolute', top: -100, width: 100, height: '150%', backgroundColor: 'rgba(255,255,255,0.15)' },
  topHighlight: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.25)', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  leftHighlight: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderTopLeftRadius: 28, borderBottomLeftRadius: 28 },
  cardContent: { padding: 24, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.14)' },

  leafLeft: { position: 'absolute', top: 12, left: 16, fontSize: 22, opacity: 0.45 },
  leafRight: { position: 'absolute', top: 12, right: 16, fontSize: 20, opacity: 0.45 },

  cardTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff', textAlign: 'center', marginBottom: 4 },
  cardSub: { fontSize: 12, color: 'rgba(255, 255, 255, 1)', textAlign: 'center', marginBottom: 16 },

  label: { fontSize: 13, fontWeight: '600', color: 'rgb(255, 255, 255)', marginBottom: 4, marginTop: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(107, 99, 99, 0.5)', borderRadius: 14, borderWidth: 1, borderColor: 'rgb(186, 241, 200)', marginBottom: 2, paddingHorizontal: 14 },
  inputIcon: { fontSize: 15, marginRight: 10 },
  input: { flex: 1, paddingVertical: 10, color: '#fbfbfb', fontSize: 14 },
  eyeBtn: { padding: 6 },
  eyeTxt: { fontSize: 15 },
  validIcon: { fontSize: 14, marginLeft: 6 },

  strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, marginBottom: 0 },
  strengthBg: { flex: 1, height: 4, backgroundColor: 'rgba(78, 76, 76, 0.79)', borderRadius: 2, overflow: 'hidden' },
  strengthFill: { height: 4, borderRadius: 2 },
  strengthTxt: { fontSize: 11, fontWeight: '700', width: 46 },

  registerBtn: { borderRadius: 16, paddingVertical: 14, marginTop: 12, backgroundColor: '#068139d1' },
  registerBtnTxt: { color: '#ffffff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dotRow: { flexDirection: 'row', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#ffffff' },

  termsTxt: { fontSize: 11, color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center', marginTop: 10 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgb(255, 251, 251)' },
  dividerTxt: { fontSize: 12, color: 'rgb(255, 255, 255)', fontWeight: '600' },
  loginLink: { alignItems: 'center', paddingVertical: 4 },
  loginLinkTxt: { fontSize: 14, color: 'rgb(255, 255, 255)' },
  loginLinkBold: { color: '#4ade80', fontWeight: '700' },
  bottomTxt: { fontSize: 12, color: 'rgb(255, 255, 255)', textAlign: 'center', marginTop: 16, letterSpacing: 0.5 },
});
