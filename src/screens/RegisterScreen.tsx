// src/screens/RegisterScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, SafeAreaView,
  ScrollView, Alert, Animated, KeyboardAvoidingView,
  Platform, StatusBar, ImageBackground, TouchableOpacity,
} from 'react-native';
import { FadeIn, ScaleIn, AnimatedButton } from '../components/Animations';

interface Props {
  onRegister: (name: string) => void;
  onLogin:    () => void;
}

// Different background — soft nature/flowers for register
const BG_IMAGE = { uri: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80' };

export default function RegisterScreen({ onRegister, onLogin }: Props) {
  const [fullName,   setFullName]   = useState('');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [confirmPass,setConfirmPass]= useState('');
  const [loading,    setLoading]    = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [showConfirm,setShowConfirm]= useState(false);

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
    if (!fullName.trim())  { Alert.alert('Missing Field', 'Please enter your full name.'); return; }
    if (!email.trim())     { Alert.alert('Missing Field', 'Please enter your email.'); return; }
    if (!validateEmail(email)) { Alert.alert('Invalid Email', 'Please enter a valid email address.'); return; }
    if (!password.trim())  { Alert.alert('Missing Field', 'Please enter a password.'); return; }
    if (password.length < 6) { Alert.alert('Weak Password', 'Password must be at least 6 characters.'); return; }
    if (password !== confirmPass) { Alert.alert('Password Mismatch', 'Passwords do not match.'); return; }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        '🌿 Welcome!',
        `Account created for ${fullName}!\nYou can now sign in.`,
        [{ text: 'Sign In', onPress: onLogin }]
      );
    }, 1400);
  };

  // Password strength indicator
  const getStrength = () => {
    if (password.length === 0) return { label:'', color:'transparent', width:'0%' };
    if (password.length < 4)   return { label:'Weak',   color:'#f87171', width:'30%' };
    if (password.length < 7)   return { label:'Fair',   color:'#f59e0b', width:'60%' };
    return                            { label:'Strong',  color:'#4ade80', width:'100%' };
  };
  const strength = getStrength();

  return (
    <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ImageBackground source={BG_IMAGE} style={styles.bgImage} resizeMode="cover">
        <Animated.View style={[styles.overlay, { opacity:overlayOp }]} />
        <View style={styles.bottomGradient} />

        <SafeAreaView style={styles.safe}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Back to login */}
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
                    placeholderTextColor="rgba(255,255,255,0.35)"
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
                    placeholderTextColor="rgba(255,255,255,0.35)"
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
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPass}
                  />
                  <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                    <Text style={styles.eyeTxt}>{showPass ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
                {/* Password strength bar */}
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
                    placeholderTextColor="rgba(255,255,255,0.35)"
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
                <AnimatedButton onPress={handleRegister} style={styles.registerBtn} color="rgb(125, 158, 7)">
                  {loading
                    ? <View style={styles.loadingRow}>
                        <Text style={styles.registerBtnTxt}>Creating account</Text>
                        <View style={styles.dotRow}>
                          {[0,1,2].map(i => <BounceDot key={i} delay={i*150} />)}
                        </View>
                      </View>
                    : <Text style={styles.registerBtnTxt}> Create My Account</Text>
                  }
                </AnimatedButton>
              </FadeIn>

              {/* Terms note */}
              <FadeIn delay={1000}>
                <Text style={styles.termsTxt}>
                  By registering you agree to our natural wellness journey 🌿
                </Text>
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
              <Text style={styles.bottomTxt}>🌿 Natural healing · Ancient wisdom · Modern care</Text>
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
  overlay:        { ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(24, 18, 34, 0.75)' },
  bottomGradient: { position:'absolute', bottom:0, left:0, right:0, height:200, backgroundColor:'rgba(30, 25, 35, 0.5)' },
  safe:           { flex:1 },
  container:      { flexGrow:1, alignItems:'center', justifyContent:'center', paddingHorizontal:24, paddingTop:50, paddingBottom:30 },
  backBtn:        { alignSelf:'flex-start', marginBottom:10, paddingVertical:6, paddingHorizontal:4 },
  backTxt:        { color:'rgba(255,255,255,0.6)', fontSize:14, fontWeight:'600' },
  logoWrap:       { width:90, height:90, borderRadius:45, backgroundColor:'rgba(72, 223, 70, 0.3)', borderWidth:2, borderColor:'rgba(76, 242, 128, 0.6)', alignItems:'center', justifyContent:'center', marginBottom:14, alignSelf:'center', shadowColor:'#835fd6', shadowOpacity:0.8, shadowRadius:20, elevation:12 },
  logoEmoji:      { fontSize:46 },
  appName:        { fontSize:32, fontWeight:'800', color:'#ffffff', textAlign:'center', letterSpacing:1.5, textShadowColor:'rgba(92, 246, 120, 0.8)', textShadowOffset:{width:0,height:0}, textShadowRadius:20 },
  tagline:        { fontSize:13, color:'rgba(255,255,255,0.6)', textAlign:'center', marginBottom:24, letterSpacing:0.5 },
  card:           { width:'100%', backgroundColor:'rgba(6, 49, 15, 0.88)', borderRadius:28, padding:26, borderWidth:1, borderColor:'rgba(92, 246, 95, 0.35)', shadowColor:'#69f65c', shadowOpacity:0.3, shadowRadius:20, elevation:12, overflow:'hidden' },
  flowerLeft:     { position:'absolute', top:12, left:16, fontSize:22, opacity:0.5 },
  flowerRight:    { position:'absolute', top:12, right:16, fontSize:22, opacity:0.5 },
  cardTitle:      { fontSize:22, fontWeight:'800', color:'#ffffff', textAlign:'center', marginBottom:4 },
  cardSub:        { fontSize:12, color:'rgba(255,255,255,0.4)', textAlign:'center', marginBottom:18 },
  label:          { fontSize:13, fontWeight:'600', color:'rgba(255,255,255,0.6)', marginBottom:6, marginTop:8 },
  inputWrap:      { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(255,255,255,0.07)', borderRadius:14, borderWidth:1, borderColor:'rgba(82, 223, 75, 0.3)', marginBottom:4, paddingHorizontal:14 },
  inputIcon:      { fontSize:15, marginRight:10 },
  input:          { flex:1, paddingVertical:13, color:'#ffffff', fontSize:14 },
  eyeBtn:         { padding:8 },
  eyeTxt:         { fontSize:15 },
  validIcon:      { fontSize:14, marginLeft:6 },
  strengthWrap:   { flexDirection:'row', alignItems:'center', gap:8, marginTop:4, marginBottom:2 },
  strengthBg:     { flex:1, height:4, backgroundColor:'rgba(255,255,255,0.1)', borderRadius:2, overflow:'hidden' },
  strengthFill:   { height:4, borderRadius:2 },
  strengthTxt:    { fontSize:11, fontWeight:'700', width:46 },
  registerBtn:    { borderRadius:16, paddingVertical:16, marginTop:16 },
  registerBtnTxt: { color:'#ffffff', fontSize:16, fontWeight:'800', letterSpacing:0.5 },
  loadingRow:     { flexDirection:'row', alignItems:'center', gap:10 },
  dotRow:         { flexDirection:'row', gap:5 },
  dot:            { width:7, height:7, borderRadius:4, backgroundColor:'#fff' },
  termsTxt:       { fontSize:11, color:'rgba(255,255,255,0.3)', textAlign:'center', marginTop:10 },
  divider:        { flexDirection:'row', alignItems:'center', marginVertical:14, gap:10 },
  dividerLine:    { flex:1, height:1, backgroundColor:'rgba(255,255,255,0.12)' },
  dividerTxt:     { fontSize:12, color:'rgba(255,255,255,0.4)', fontWeight:'600' },
  loginLink:      { alignItems:'center', paddingVertical:4 },
  loginLinkTxt:   { fontSize:14, color:'rgba(255,255,255,0.5)' },
  loginLinkBold:  { color:'#1866b4', fontWeight:'700' },
  bottomTxt:      { fontSize:12, color:'rgba(255,255,255,0.35)', textAlign:'center', marginTop:20, letterSpacing:0.5 },
});
