// src/screens/LoginScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, SafeAreaView,
  ScrollView, Alert, Animated, KeyboardAvoidingView,
  Platform, StatusBar, ImageBackground, TouchableOpacity,
} from 'react-native';
import C from '../styles/colors';
import { FadeIn, ScaleIn, AnimatedButton, PulseView } from '../components/Animations';

interface Props {
  onLogin:    (name: string) => void;
  onRegister: () => void;
}

const BG_IMAGE = { uri: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80' };

export default function LoginScreen({ onLogin, onRegister }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const cardY     = useRef(new Animated.Value(120)).current;
  const cardOp    = useRef(new Animated.Value(0)).current;
  const overlayOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(overlayOp, { toValue:1, duration:800, useNativeDriver:true }).start();
    Animated.parallel([
      Animated.spring(cardY,  { toValue:0, speed:10, bounciness:10, delay:300, useNativeDriver:true }),
      Animated.timing(cardOp, { toValue:1, duration:500, delay:300, useNativeDriver:true }),
    ]).start();
  }, []);

  const handleLogin = () => {
    if (!username.trim()) { Alert.alert('Missing Field', 'Please enter your username.'); return; }
    if (!password.trim()) { Alert.alert('Missing Field', 'Please enter your password.'); return; }
    if (password.length < 4) { Alert.alert('Weak Password', 'Minimum 4 characters required.'); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(username.trim()); }, 1200);
  };

  return (
    <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ImageBackground source={BG_IMAGE} style={styles.bgImage} resizeMode="cover">
        <Animated.View style={[styles.overlay, { opacity:overlayOp }]} />
        <View style={styles.bottomGradient} />

        <SafeAreaView style={styles.safe}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Logo */}
            <ScaleIn delay={200}>
              <PulseView style={styles.logoWrap}>
                <Text style={styles.logoEmoji}>🌿</Text>
              </PulseView>
            </ScaleIn>

            {/* Title */}
            <FadeIn delay={400}>
              <Text style={styles.appName}>HerbalClinic</Text>
              <Text style={styles.tagline}>Ayurvedic Skin & Wellness</Text>
            </FadeIn>

            {/* Card */}
            <Animated.View style={[styles.card, { opacity:cardOp, transform:[{ translateY:cardY }] }]}>
              <Text style={styles.leafLeft}>🍃</Text>
              <Text style={styles.leafRight}>🌱</Text>

              <FadeIn delay={500}>
                <Text style={styles.cardTitle}>Welcome Back</Text>
                <Text style={styles.cardSub}>Sign in to continue your wellness journey</Text>
              </FadeIn>

              {/* Username */}
              <FadeIn delay={600}>
                <Text style={styles.label}>Username</Text>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your username"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </View>
              </FadeIn>

              {/* Password */}
              <FadeIn delay={700}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPass}
                  />
                  <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                    <Text style={styles.eyeTxt}>{showPass ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </FadeIn>

              {/* Login button */}
              <FadeIn delay={800}>
                <AnimatedButton onPress={handleLogin} style={styles.loginBtn} color="#729607">
                  {loading
                    ? <View style={styles.loadingRow}>
                        <Text style={styles.loginBtnTxt}>Signing in</Text>
                        <View style={styles.dotRow}>
                          {[0,1,2].map(i => <BounceDot key={i} delay={i*150} />)}
                        </View>
                      </View>
                    : <Text style={styles.loginBtnTxt}> Begin Your Journey</Text>
                  }
                </AnimatedButton>
              </FadeIn>

              {/* Divider */}
              <FadeIn delay={900}>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerTxt}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>
              </FadeIn>

              {/* Register link */}
              <FadeIn delay={1000}>
                <TouchableOpacity style={styles.registerBtn} onPress={onRegister} activeOpacity={0.8}>
                  <Text style={styles.registerTxt}>
                    Don't have an account?{'  '}
                    <Text style={styles.registerLink}>Create one →</Text>
                  </Text>
                </TouchableOpacity>
              </FadeIn>

            </Animated.View>

            <FadeIn delay={1100}>
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
  overlay:        { ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(5,20,10,0.72)' },
  bottomGradient: { position:'absolute', bottom:0, left:0, right:0, height:200, backgroundColor:'rgba(10,40,20,0.5)' },
  safe:           { flex:1 },
  container:      { flexGrow:1, alignItems:'center', justifyContent:'center', paddingHorizontal:24, paddingTop:60, paddingBottom:30 },
  logoWrap:       { width:100, height:100, borderRadius:50, backgroundColor:'rgba(46,204,113,0.25)', borderWidth:2, borderColor:'rgba(46,204,113,0.6)', alignItems:'center', justifyContent:'center', marginBottom:16, alignSelf:'center', shadowColor:'#2ecc71', shadowOpacity:0.8, shadowRadius:20, elevation:12 },
  logoEmoji:      { fontSize:52 },
  appName:        { fontSize:38, fontWeight:'800', color:'#ffffff', textAlign:'center', letterSpacing:2, textShadowColor:'rgba(46,204,113,0.8)', textShadowOffset:{width:0,height:0}, textShadowRadius:20 },
  tagline:        { fontSize:14, color:'rgba(255,255,255,0.65)', textAlign:'center', marginBottom:28, letterSpacing:1 },
  card:           { width:'100%', backgroundColor:'rgba(10,30,15,0.85)', borderRadius:28, padding:28, borderWidth:1, borderColor:'rgba(46,204,113,0.3)', shadowColor:'#000', shadowOpacity:0.5, shadowRadius:20, elevation:12, overflow:'hidden' },
  leafLeft:       { position:'absolute', top:12, left:16, fontSize:24, opacity:0.5 },
  leafRight:      { position:'absolute', top:12, right:16, fontSize:22, opacity:0.5 },
  cardTitle:      { fontSize:22, fontWeight:'800', color:'#ffffff', textAlign:'center', marginBottom:4 },
  cardSub:        { fontSize:12, color:'rgba(255,255,255,0.45)', textAlign:'center', marginBottom:20 },
  label:          { fontSize:13, fontWeight:'600', color:'rgba(255,255,255,0.6)', marginBottom:6, marginTop:8 },
  inputWrap:      { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(255,255,255,0.08)', borderRadius:14, borderWidth:1, borderColor:'rgba(46,204,113,0.25)', marginBottom:4, paddingHorizontal:14 },
  inputIcon:      { fontSize:16, marginRight:10 },
  input:          { flex:1, paddingVertical:13, color:'#ffffff', fontSize:15 },
  eyeBtn:         { padding:8 },
  eyeTxt:         { fontSize:16 },
  loginBtn:       { borderRadius:16, paddingVertical:16, marginTop:16 },
  loginBtnTxt:    { color:'#ffffff', fontSize:16, fontWeight:'800', letterSpacing:0.5 },
  loadingRow:     { flexDirection:'row', alignItems:'center', gap:10 },
  dotRow:         { flexDirection:'row', gap:5 },
  dot:            { width:7, height:7, borderRadius:4, backgroundColor:'#fff' },
  divider:        { flexDirection:'row', alignItems:'center', marginVertical:16, gap:10 },
  dividerLine:    { flex:1, height:1, backgroundColor:'rgba(255,255,255,0.15)' },
  dividerTxt:     { fontSize:12, color:'rgba(255,255,255,0.4)', fontWeight:'600' },
  registerBtn:    { alignItems:'center', paddingVertical:4 },
  registerTxt:    { fontSize:14, color:'rgba(255,255,255,0.5)' },
  registerLink:   { color:'#2ecc71', fontWeight:'700' },
  bottomTxt:      { fontSize:12, color:'rgba(255,255,255,0.4)', textAlign:'center', marginTop:20, letterSpacing:0.5 },
});
