import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, Dimensions } from 'react-native';
import C from '../styles/colors';
import { Spinner } from '../components/Animations';

const { width } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  // Logo scale + opacity
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  // Title slide up
  const titleY = useRef(new Animated.Value(40)).current;
  const titleOp = useRef(new Animated.Value(0)).current;
  // Tagline slide up
  const tagY = useRef(new Animated.Value(30)).current;
  const tagOp = useRef(new Animated.Value(0)).current;
  // Ring pulse
  const ring1 = useRef(new Animated.Value(1)).current;
  const ring2 = useRef(new Animated.Value(1)).current;
  const ring1Op = useRef(new Animated.Value(0.6)).current;
  const ring2Op = useRef(new Animated.Value(0.4)).current;
  // Bottom bar width
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Ring pulses loop
    const ringAnim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ring1, { toValue: 1.6, duration: 1200, useNativeDriver: true }),
          Animated.timing(ring1, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(ring1Op, { toValue: 0, duration: 1200, useNativeDriver: true }),
          Animated.timing(ring1Op, { toValue: 0.6, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(ring2, { toValue: 1.6, duration: 1200, useNativeDriver: true }),
          Animated.timing(ring2, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(ring2Op, { toValue: 0, duration: 1200, useNativeDriver: true }),
          Animated.timing(ring2Op, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
        ]),
      ])
    );
    ringAnim.start();

    // Entrance sequence
    Animated.sequence([
      // Logo pops in
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, speed: 8, bounciness: 18, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      // Title slides up
      Animated.parallel([
        Animated.spring(titleY, { toValue: 0, speed: 14, bounciness: 10, useNativeDriver: true }),
        Animated.timing(titleOp, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      // Tagline slides up
      Animated.parallel([
        Animated.spring(tagY, { toValue: 0, speed: 14, bounciness: 8, useNativeDriver: true }),
        Animated.timing(tagOp, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      // Loading bar fills
      Animated.timing(barWidth, { toValue: width * 0.6, duration: 1200, useNativeDriver: false }),
    ]).start(() => {
      ringAnim.stop();
      setTimeout(onFinish, 300);
    });
  }, []);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Pulsing rings behind logo */}
      <View style={styles.ringWrap}>
        <Animated.View style={[styles.ring, { transform: [{ scale: ring1 }], opacity: ring1Op }]} />
        <Animated.View style={[styles.ring, styles.ring2, { transform: [{ scale: ring2 }], opacity: ring2Op }]} />

        {/* Logo */}
        <Animated.View style={[styles.logoCircle, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
          <Text style={styles.logoEmoji}>🌿</Text>
        </Animated.View>
      </View>

      {/* Title */}
      <Animated.Text style={[styles.title, { transform: [{ translateY: titleY }], opacity: titleOp }]}>
        HerbalClinic
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { transform: [{ translateY: tagY }], opacity: tagOp }]}>
        Ayurvedic Skin & Wellness
      </Animated.Text>

      {/* Loading bar */}
      <View style={styles.barBg}>
        <Animated.View style={[styles.barFill, { width: barWidth }]} />
      </View>

      {/* Spinner */}
      <View style={{ marginTop: 20 }}>
        <Spinner size={28} color={C.accentDim} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  ringWrap: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  ring: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 2, borderColor: C.accent },
  ring2: { borderColor: C.accentDim },
  logoCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center', shadowColor: C.accent, shadowOpacity: 0.8, shadowRadius: 20, elevation: 12 },
  logoEmoji: { fontSize: 50 },
  title: { fontSize: 36, fontWeight: '800', color: C.accent, letterSpacing: 2, marginBottom: 8 },
  tagline: { fontSize: 14, color: C.muted, letterSpacing: 1, marginBottom: 40 },
  barBg: { width: '60%', height: 4, backgroundColor: C.surface, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, backgroundColor: C.accent, borderRadius: 2 },
});
