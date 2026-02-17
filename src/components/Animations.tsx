// src/components/Animations.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, StyleSheet, View, Text, ViewStyle } from 'react-native';
import C from '../styles/colors';

// ── FadeIn ────────────────────────────────────────────────────────────────────
export function FadeIn({ children, delay = 0, duration = 600 }:
  { children: React.ReactNode; delay?: number; duration?: number }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue:1, duration, delay, useNativeDriver:true }),
      Animated.spring(translateY, { toValue:0, speed:12, bounciness:6, delay, useNativeDriver:true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform:[{ translateY }] }}>{children}</Animated.View>;
}

// ── SlideInLeft ───────────────────────────────────────────────────────────────
export function SlideInLeft({ children, delay = 0 }:
  { children: React.ReactNode; delay?: number }) {
  const translateX = useRef(new Animated.Value(-80)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, { toValue:0, speed:14, bounciness:8, delay, useNativeDriver:true }),
      Animated.timing(opacity,    { toValue:1, duration:400, delay, useNativeDriver:true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform:[{ translateX }] }}>{children}</Animated.View>;
}

// ── SlideInRight ──────────────────────────────────────────────────────────────
export function SlideInRight({ children, delay = 0 }:
  { children: React.ReactNode; delay?: number }) {
  const translateX = useRef(new Animated.Value(80)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, { toValue:0, speed:14, bounciness:8, delay, useNativeDriver:true }),
      Animated.timing(opacity,    { toValue:1, duration:400, delay, useNativeDriver:true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform:[{ translateX }] }}>{children}</Animated.View>;
}

// ── ScaleIn ───────────────────────────────────────────────────────────────────
export function ScaleIn({ children, delay = 0 }:
  { children: React.ReactNode; delay?: number }) {
  const scale   = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue:1, speed:10, bounciness:12, delay, useNativeDriver:true }),
      Animated.timing(opacity, { toValue:1, duration:300, delay, useNativeDriver:true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform:[{ scale }] }}>{children}</Animated.View>;
}

// ── AnimatedButton — press shrinks + bounces back ─────────────────────────────
export function AnimatedButton({
  onPress, style, children, color = C.accent,
}: {
  onPress: () => void;
  style?: ViewStyle;
  children: React.ReactNode;
  color?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, { toValue:0.92, speed:50, bounciness:0, useNativeDriver:true }).start();

  const pressOut = () =>
    Animated.spring(scale, { toValue:1, speed:20, bounciness:14, useNativeDriver:true }).start();

  return (
    <TouchableOpacity onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} activeOpacity={1}>
      <Animated.View style={[{ transform:[{ scale }], backgroundColor:color, borderRadius:14, paddingVertical:15, alignItems:'center' }, style]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── PulseView — continuous pulsing glow ───────────────────────────────────────
export function PulseView({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue:1.1, duration:1000, useNativeDriver:true }),
        Animated.timing(scale, { toValue:1,   duration:1000, useNativeDriver:true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[style, { transform:[{ scale }] }]}>{children}</Animated.View>;
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 40, color = C.accent }: { size?: number; color?: string }) {
  const rotate = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(rotate, { toValue:1, duration:900, useNativeDriver:true })
    ).start();
  }, []);
  const spin = rotate.interpolate({ inputRange:[0,1], outputRange:['0deg','360deg'] });
  return (
    <Animated.View style={[styles.spinner, { width:size, height:size, borderColor:color, transform:[{ rotate:spin }] }]} />
  );
}

// ── ShimmerCard — loading placeholder ────────────────────────────────────────
export function ShimmerCard({ width = '100%', height = 80 }:
  { width?: any; height?: number }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue:1, duration:900, useNativeDriver:true }),
        Animated.timing(shimmer, { toValue:0, duration:900, useNativeDriver:true }),
      ])
    ).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange:[0,1], outputRange:[0.3, 0.7] });
  return <Animated.View style={[styles.shimmer, { width, height, opacity }]} />;
}

// ── ScreenTransition — slide left/right between screens ──────────────────────
export function ScreenTransition({ children, direction = 'right' }:
  { children: React.ReactNode; direction?: 'left' | 'right' }) {
  const translateX = useRef(new Animated.Value(direction === 'right' ? 400 : -400)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, { toValue:0, speed:18, bounciness:4, useNativeDriver:true }),
      Animated.timing(opacity,    { toValue:1, duration:300, useNativeDriver:true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[styles.fullScreen, { opacity, transform:[{ translateX }] }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  spinner:    { borderWidth:3, borderTopColor:'transparent', borderRadius:999 },
  shimmer:    { backgroundColor:C.card, borderRadius:12 },
  fullScreen: { flex:1 },
});
