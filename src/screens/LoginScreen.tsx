
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, SafeAreaView,
  ScrollView, Alert, Animated, KeyboardAvoidingView,
  Platform, StatusBar, ImageBackground, TouchableOpacity, Image
} from 'react-native';
import C from '../styles/colors';
import { FadeIn, ScaleIn, AnimatedButton, PulseView } from '../components/Animations';

import { loginUser, UserProfile } from '../services/dbService';

interface Props {
  onLogin: (profile: UserProfile) => void;
  onRegister: () => void;
}


const BG_IMAGE = require('../assets/02.png');

export default function LoginScreen({ onLogin, onRegister }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const cardY = useRef(new Animated.Value(120)).current;
  const cardOp = useRef(new Animated.Value(0)).current;
  const overlayOp = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    Animated.timing(overlayOp, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    Animated.parallel([
      Animated.spring(cardY, { toValue: 0, speed: 10, bounciness: 10, delay: 300, useNativeDriver: true }),
      Animated.timing(cardOp, { toValue: 1, duration: 500, delay: 300, useNativeDriver: true }),
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

  const handleLogin = async () => {
    if (!email.trim()) { Alert.alert('Missing Field', 'Please enter your email.'); return; }
    if (!password.trim()) { Alert.alert('Missing Field', 'Please enter your password.'); return; }

    setLoading(true);
    try {
      const user = await loginUser(email.trim(), password);
      onLogin(user);
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Login Failed', error.message || 'An error occurred');
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // For the offline demonstration, we simulate a Google login
      // using our dbService which will auto-create the account if needed
      setTimeout(async () => {
        const user = await loginUser('google_demo@gmail.com', 'google_offline_auth');
        onLogin(user);
      }, 1000); // Add a 1 second delay to simulate network request
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Google Login Failed', error.message);
    }
  };

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
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <ScaleIn delay={200}>
              <PulseView style={styles.logoWrap}>
                <Text style={styles.logoEmoji}>🌿</Text>
              </PulseView>
            </ScaleIn><FadeIn delay={400}>
              <Text style={styles.appName}>HerbalClinic</Text>
              <Text style={styles.tagline}>Ayurvedic Skin & Wellness</Text>
            </FadeIn>
            <Animated.View style={[styles.cardOuter, { opacity: cardOp, transform: [{ translateY: cardY }] }]}>
              <View style={styles.glassLayer1} />
              <View style={styles.glassLayer2} />
              <View style={styles.glassLayer3} />
              <Animated.View style={[styles.shine, { transform: [{ translateX: shineAnim }, { rotate: '25deg' }] }]} />
              <View style={styles.topHighlight} />              <View style={styles.leftHighlight} />


              <View style={styles.cardContent}>

                <Text style={styles.leafLeft}>🍃</Text>
                <Text style={styles.leafRight}>🌱</Text>

                <FadeIn delay={500}>
                  <Text style={styles.cardTitle}>Welcome Back!</Text>
                  <Text style={styles.cardSub}>Sign in to continue your wellness journey</Text>
                </FadeIn>

                <FadeIn delay={600}>
                  <Text style={styles.label}>Email</Text>
                  <View style={styles.inputWrap}>
                    <Text style={styles.inputIcon}>📧</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email"
                      placeholderTextColor="rgba(162, 189, 168, 0.94)"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </FadeIn>

                <FadeIn delay={700}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrap}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor="rgba(162, 189, 168, 0.94)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPass}
                    />
                    <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                      <Text style={styles.eyeTxt}>{showPass ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                </FadeIn>
                <FadeIn delay={800}>
                  <AnimatedButton onPress={handleLogin} style={styles.loginBtn} color="#068139d1">
                    {loading
                      ? <View style={styles.loadingRow}>
                        <Text style={styles.loginBtnTxt}>Signing in</Text>
                        <View style={styles.dotRow}>
                          {[0, 1, 2].map(i => <BounceDot key={i} delay={i * 150} />)}
                        </View>
                      </View>
                      : <Text style={styles.loginBtnTxt}>Begin Your Journey</Text>
                    }
                  </AnimatedButton>
                </FadeIn>
                <FadeIn delay={900}>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerTxt}>OR</Text>
                    <View style={styles.dividerLine} />
                  </View>
                </FadeIn>

                {/* Google Button */}
                <FadeIn delay={950}>
                  <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin} activeOpacity={0.8}>
                    <View style={styles.googleIconWrap}>
                      <Image 
                        source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/120px-Google_%22G%22_logo.svg.png' }} 
                        style={styles.googleIconImage} 
                        resizeMode="contain" 
                      />
                    </View>
                    <Text style={styles.googleBtnTxt}>Continue with Google</Text>
                  </TouchableOpacity>
                </FadeIn>

                <FadeIn delay={1000}>
                  <TouchableOpacity style={styles.registerBtn} onPress={onRegister} activeOpacity={0.8}>
                    <Text style={styles.registerTxt}>
                      Don't have an account?{'  '}
                      <Text style={styles.registerLink}>Create one →</Text>
                    </Text>
                  </TouchableOpacity>
                </FadeIn>

              </View>
            </Animated.View>

            <FadeIn delay={1100}>
              <Text style={styles.bottomTxt}>🌿 Natural healing · Ancient wisdom · Modern care</Text>
            </FadeIn>

          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
} function BounceDot({ delay }: { delay: number }) {
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
} const styles = StyleSheet.create({

  bgImage: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject },
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 0, backgroundColor: 'rgba(4,16,8,0.45)' },
  safe: { flex: 1 },
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 30 },

  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobTopLeft: {
    width: 280, height: 280,
    top: -80, left: -80,
    backgroundColor: 'rgba(5, 8, 6, 0.12)',
  },
  blobTopRight: {
    width: 240, height: 240,
    top: 60, right: -60,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  blobBottom: {
    width: 320, height: 320,
    bottom: -100, left: '10%',
    backgroundColor: 'rgba(9, 9, 9, 0.08)',
  },

  logoWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(46,204,113,0.20)',
    borderWidth: 2, borderColor: 'rgba(46,204,113,0.55)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, alignSelf: 'center',
    shadowColor: '#000000', shadowOpacity: 0.7, shadowRadius: 18, elevation: 10,
  },
  logoEmoji: { fontSize: 44 },

  appName: {
    fontSize: 36, fontWeight: '800', color: '#ffffff', textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 254, 106, 0.7)',
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18,
  },
  tagline: { fontSize: 13, color: 'rgba(255, 255, 255, 0.99)', textAlign: 'center', marginBottom: 26, letterSpacing: 1 },
  cardOuter: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  glassLayer1: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0)',
    borderRadius: 28,
  },
  glassLayer2: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24, 24, 24, 0.56)',
    borderRadius: 28,
  },
  glassLayer3: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(207, 194, 194, 0.04)',
    borderRadius: 28,
  },

  shine: {
    position: 'absolute',
    top: -100,
    width: 100,
    height: '150%',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  topHighlight: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  leftHighlight: {
    position: 'absolute',
    top: 0, left: 0, bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderTopLeftRadius: 28, borderBottomLeftRadius: 28,
  },
  cardContent: {
    padding: 28,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.14)',
  },
  leafLeft: { position: 'absolute', top: 12, left: 16, fontSize: 22, opacity: 0.45 },
  leafRight: { position: 'absolute', top: 12, right: 16, fontSize: 20, opacity: 0.45 },

  cardTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff', textAlign: 'center', marginBottom: 4 },
  cardSub: { fontSize: 12, color: 'rgba(255, 255, 255, 1)', textAlign: 'center', marginBottom: 20 },

  label: { fontSize: 13, fontWeight: '600', color: 'rgb(255, 255, 255)', marginBottom: 6, marginTop: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(107, 99, 99, 0.5)',
    borderRadius: 14,
    borderWidth: 1, borderColor: 'rgb(186, 241, 200)',
    marginBottom: 4, paddingHorizontal: 14,
  },
  inputIcon: { fontSize: 15, marginRight: 10 },
  input: { flex: 1, paddingVertical: 13, color: '#fbfbfb', fontSize: 15 },
  eyeBtn: { padding: 8 },
  eyeTxt: { fontSize: 15 },

  loginBtn: { borderRadius: 16, paddingVertical: 16, marginTop: 16 },
  loginBtnTxt: { color: '#ffffff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dotRow: { flexDirection: 'row', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#ffffff' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgb(255, 251, 251)' },
  dividerTxt: { fontSize: 12, color: 'rgb(255, 255, 255)', fontWeight: '600' },
  
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', borderRadius: 16, paddingVertical: 14, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  googleIconWrap: { marginRight: 10, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  googleIconImage: { width: 24, height: 24 },
  googleBtnTxt: { color: '#333333', fontSize: 15, fontWeight: '700' },

  registerBtn: { alignItems: 'center', paddingVertical: 4 },
  registerTxt: { fontSize: 14, color: 'rgb(255, 255, 255)' },
  registerLink: { color: '#00fa0d', fontWeight: '700' },
  bottomTxt: { fontSize: 12, color: 'rgb(255, 255, 255)', textAlign: 'center', marginTop: 20, letterSpacing: 0.5 },

});