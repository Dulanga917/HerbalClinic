// src/screens/RegisterScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, SafeAreaView,
  ScrollView, Alert, Animated, KeyboardAvoidingView,
  Platform, StatusBar, ImageBackground, TouchableOpacity,
} from 'react-native';
import { FadeIn, ScaleIn, AnimatedButton } from '../components/Animations';

// ── BACKGROUND IMAGE ─────────────────────────────────────────
const BG_IMAGE = require('../assets/03.png');

interface Props {
  onRegister: (name: string) => void;
  onLogin:    () => void;
}

export default function RegisterScreen({ onRegister, onLogin }: Props) {
  const [fullName,    setFullName]    = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const cardY     = useRef(new Animated.Value(140)).current;
  const cardOp    = useRef(new Animated.Value(0)).current;
  const overlayOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(overlayOp, { toValue:1, duration:800, useNativeDriver:true }).start();
    Animated.parallel([
      Animated.spring(cardY,  { toValue:0, speed:10, bounciness:10, delay:200, useNativeDriver:true }),
      Animated.timing(cardOp, { toValue:1, duration:500, delay:200, useNativeDriver:true }),
    ]).start();
  }, []);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleRegister = () => {
    if (!fullName.trim())        { Alert.alert('Missing Field',   'Please enter your full name.'); return; }
    if (!email.trim())           { Alert.alert('Missing Field',   'Please enter your email.'); return; }
    if (!validateEmail(email))   { Alert.alert('Invalid Email',   'Please enter a valid email address.'); return; }
    if (!password.trim())        { Alert.alert('Missing Field',   'Please enter a password.'); return; }
    if (password.length < 6)     { Alert.alert('Weak Password',   'Password must be at least 6 characters.'); return; }
    if (password !== confirmPass){ Alert.alert('Password Mismatch','Passwords do not match.'); return; }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        '🌿 Welcome!',
        `Account created for ${fullName}!\nYou can now sign in.`,
        [{ text:'Sign In', onPress:onLogin }]
      );
    }, 1400);
  };

  // Password strength
  const getStrength = () => {
    if (password.length === 0) return { label:'',       color:'transparent', width:'0%'   };
    if (password.length < 4)   return { label:'Weak',   color:'#f87171',     width:'30%'  };
    if (password.length < 7)   return { label:'Fair',   color:'#f59e0b',     width:'60%'  };
    return                            { label:'Strong',  color:'#4ade80',     width:'100%' };
  };
  const strength = getStrength();

  return (
    <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Local image background ─────────────────────── */}
      <ImageBackground source={BG_IMAGE} style={styles.bgImage} resizeMode="cover">
        <Animated.View style={[styles.overlay, { opacity:overlayOp }]} />
        <View style={styles.bottomGradient} />

        <SafeAreaView style={styles.safe}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Back button */}
            <FadeIn delay={100}>
              <TouchableOpacity style={styles.backBtn} onPress={onLogin} activeOpacity={0.8}>
                <Text style={styles.backTxt}>← Back to Login</Text>
              </TouchableOpacity>
            </FadeIn>

            {/* Logo */}
            <ScaleIn delay={200}>
              <View style={styles.logoWrap}>
                <Text style={styles.logoEmoji}>🌱</Text>
              </View>
            </ScaleIn>

            {/* Title */}
            <FadeIn delay={300}>
              <Text style={styles.appName}>Join HerbalClinic</Text>
              <Text style={styles.tagline}>Start your Ayurvedic wellness journey</Text>
            </FadeIn>

            {/* Card */}
            <Animated.View style={[styles.card, { opacity:cardOp, transform:[{ translateY:cardY }] }]}>
              <Text style={styles.flowerLeft}>🌸</Text>
              <Text style={styles.flowerRight}>🌼</Text>

              <FadeIn delay={400}>
                <Text style={styles.cardTitle}>Create Account</Text>
                <Text style={styles.cardSub}>Fill in your details to get started</Text>
              </FadeIn>

              {/* Full Name */}
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

              {/* Email */}
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

              {/* Password */}
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
                      <View style={[styles.strengthFill, { width:strength.width as any, backgroundColor:strength.color }]} />
                    </View>
                    <Text style={[styles.strengthTxt, { color:strength.color }]}>{strength.label}</Text>
                  </View>
                )}
              </FadeIn>

              {/* Confirm Password */}
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

              {/* Register button */}
              <FadeIn delay={900}>
                <AnimatedButton onPress={handleRegister} style={styles.registerBtn} color="#347005e6">
                  {loading
                    ? <View style={styles.loadingRow}>
                        <Text style={styles.registerBtnTxt}>Creating account</Text>
                        <View style={styles.dotRow}>
                          {[0,1,2].map(i => <BounceDot key={i} delay={i*150} />)}
                        </View>
                      </View>
                    : <Text style={styles.registerBtnTxt}>  Create My Account</Text>
                  }
                </AnimatedButton>
              </FadeIn>

              <FadeIn delay={1000}>
                <Text style={styles.termsTxt}>By registering you agree to our natural wellness journey </Text>
              </FadeIn>

              {/* Divider */}
              <FadeIn delay={1050}>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerTxt}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>
              </FadeIn>

              {/* Login link */}
              <FadeIn delay={1100}>
                <TouchableOpacity style={styles.loginLink} onPress={onLogin} activeOpacity={0.8}>
                  <Text style={styles.loginLinkTxt}>
                    Already have an account?{'  '}
                    <Text style={styles.loginLinkBold}>Sign in →</Text>
                  </Text>
                </TouchableOpacity>
              </FadeIn>

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
        Animated.timing(y, { toValue:-7, duration:300, delay, useNativeDriver:true }),
        Animated.timing(y, { toValue:0,  duration:300, useNativeDriver:true }),
        Animated.delay(300),
      ])
    ).start();
  }, []);
  return <Animated.View style={[styles.dot, { transform:[{ translateY:y }] }]} />;
}

const styles = StyleSheet.create({
  bgImage:        { flex:1, width:'100%', height:'100%' },
  overlay:        { ...StyleSheet.absoluteFillObject,},// backgroundColor:'rgba(240,245,235,0.82)' },
  bottomGradient: { position:'absolute', bottom:0, left:0, right:0, height:800, backgroundColor:'rgba(76, 85, 76, 0.61)' },
  safe:           { flex:1 },
  container:      { flexGrow:1, alignItems:'center', justifyContent:'center', paddingHorizontal:24, paddingTop:50, paddingBottom:30 },
  backBtn:        { alignSelf:'flex-start', marginBottom:10, paddingVertical:6, paddingHorizontal:4 },
  backTxt:        { color:'#0bd700', fontSize:14, fontWeight:'900',left:-100 },
  logoWrap:       { width:90, height:90, borderRadius:45, backgroundColor:'rgba(41, 180, 31, 0.2)', borderWidth:2, borderColor:'rgba(248, 248, 248, 0.5)', alignItems:'center', justifyContent:'center', marginBottom:14, alignSelf:'center', shadowColor:'#2e9526', shadowOpacity:0.4, shadowRadius:20, elevation:12 },
  logoEmoji:      { fontSize:46 },
  appName:        { fontSize:46, fontWeight:'900', color:'#fbfbfb', textAlign:'center', letterSpacing:1.5 },
  tagline:        { fontSize:15, color:'#fffefe', textAlign:'center', marginBottom:24, letterSpacing:0.5,fontWeight:'800' },
  card:           { width:'100%', backgroundColor:'rgba(80, 78, 78, 0.4)', borderRadius:28, padding:26, borderWidth:1, borderColor:'rgba(255, 255, 255, 0.4)', shadowColor:'#e9e9e9ad', shadowOpacity:0.15, shadowRadius:20, elevation:12, overflow:'hidden' },
  flowerLeft:     { position:'absolute', top:12, left:16, fontSize:22, opacity:0.4 },
  flowerRight:    { position:'absolute', top:12, right:16, fontSize:22, opacity:0.4 },
  cardTitle:      { fontSize:22, fontWeight:'800', color:'#f1f3f1', textAlign:'center', marginBottom:4 },
  cardSub:        { fontSize:12, color:'#fcfffc', textAlign:'center', marginBottom:18 },
  label:          { fontSize:13, fontWeight:'600', color:'#f8f8f8', marginBottom:6, marginTop:8 },
  inputWrap:      { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(60, 58, 58, 0.17)', borderRadius:14, borderWidth:1, borderColor:'rgba(5, 5, 5, 0.98)', marginBottom:4, paddingHorizontal:14 },
  inputIcon:      { fontSize:15, marginRight:10 },
  input:          { flex:1, paddingVertical:13, color:'#000000', fontSize:14 },
  eyeBtn:         { padding:8 },
  eyeTxt:         { fontSize:15 },
  validIcon:      { fontSize:14, marginLeft:6 },
  strengthWrap:   { flexDirection:'row', alignItems:'center', gap:8, marginTop:4, marginBottom:2 },
  strengthBg:     { flex:1, height:4, backgroundColor:'rgba(78, 76, 76, 0.79)', borderRadius:2, overflow:'hidden' },
  strengthFill:   { height:4, borderRadius:2 },
  strengthTxt:    { fontSize:11, fontWeight:'700', width:46 },
  registerBtn:    { borderRadius:50, paddingVertical:16, marginTop:16, backgroundColor:'#347005e6' },
  registerBtnTxt: { color:'#302e2e', fontSize:18, fontWeight:'900', letterSpacing:0.5 },
  loadingRow:     { flexDirection:'row', alignItems:'center', gap:10 },
  dotRow:         { flexDirection:'row', gap:5 },
  dot:            { width:7, height:7, borderRadius:4, backgroundColor:'#fff' },
  termsTxt:       { fontSize:11, color:'#ffffff', textAlign:'center', marginTop:10 },
  divider:        { flexDirection:'row', alignItems:'center', marginVertical:14, gap:10 },
  dividerLine:    { flex:1, height:1, backgroundColor:'rgb(255, 255, 255)' },
  dividerTxt:     { fontSize:12, color:'#ffffff', fontWeight:'600' },
  loginLink:      { alignItems:'center', paddingVertical:4 },
  loginLinkTxt:   { fontSize:14, color:'#ffffff' },
  loginLinkBold:  { color:'#2bec12', fontWeight:'700' },
  bottomTxt:      { fontSize:12, color:'#ffffff', textAlign:'center', marginTop:20, letterSpacing:0.5 },
});
