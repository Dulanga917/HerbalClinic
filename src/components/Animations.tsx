// src/components/Animations.tsx
// All reusable animation components for HerbalClinic
import React, { useEffect, useRef, ReactNode } from 'react';
import {
  Animated, TouchableOpacity, StyleSheet,
  ViewStyle, View, Easing,
} from 'react-native';

// ── FadeIn ────────────────────────────────────────────────────
export function FadeIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1, duration: 500, delay, useNativeDriver: true,
    }).start();
  }, []);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

// ── ScaleIn ───────────────────────────────────────────────────
export function ScaleIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const scale   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue:1, speed:10, bounciness:14, delay, useNativeDriver:true }),
      Animated.timing(opacity, { toValue:1, duration:300, delay, useNativeDriver:true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform:[{ scale }] }}>
      {children}
    </Animated.View>
  );
}

// ── SlideInLeft ───────────────────────────────────────────────
export function SlideInLeft({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const x       = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(x,       { toValue:0, speed:14, bounciness:8, delay, useNativeDriver:true }),
      Animated.timing(opacity, { toValue:1, duration:400, delay, useNativeDriver:true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform:[{ translateX:x }] }}>
      {children}
    </Animated.View>
  );
}

// ── SlideInRight ──────────────────────────────────────────────
export function SlideInRight({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const x       = useRef(new Animated.Value(60)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(x,       { toValue:0, speed:14, bounciness:8, delay, useNativeDriver:true }),
      Animated.timing(opacity, { toValue:1, duration:400, delay, useNativeDriver:true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform:[{ translateX:x }] }}>
      {children}
    </Animated.View>
  );
}

// ── PulseView ─────────────────────────────────────────────────
export function PulseView({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue:1.06, duration:900, useNativeDriver:true }),
        Animated.timing(scale, { toValue:1,    duration:900, useNativeDriver:true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[style, { transform:[{ scale }] }]}>
      {children}
    </Animated.View>
  );
}

// ── AnimatedButton ────────────────────────────────────────────
interface AnimatedButtonProps {
  onPress:   () => void;
  children:  ReactNode;
  style?:    ViewStyle;
  color?:    string;
}
export function AnimatedButton({ onPress, children, style, color = '#2ecc71' }: AnimatedButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, { toValue:0.95, speed:30, bounciness:4, useNativeDriver:true }).start();

  const pressOut = () =>
    Animated.spring(scale, { toValue:1, speed:30, bounciness:6, useNativeDriver:true }).start();

  return (
    <Animated.View style={[{ transform:[{ scale }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
        style={[styles.btn, { backgroundColor: color }]}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Spinner ───────────────────────────────────────────────────
export function Spinner({ size = 32, color = '#2ecc71' }: { size?: number; color?: string }) {
  const rotate = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(rotate, {
        toValue: 1, duration: 900,
        easing: Easing.linear, useNativeDriver: true,
      })
    ).start();
  }, []);
  const spin = rotate.interpolate({ inputRange:[0,1], outputRange:['0deg','360deg'] });
  return (
    <Animated.View style={[
      styles.spinner,
      { width:size, height:size, borderRadius:size/2, borderColor:color, transform:[{ rotate:spin }] },
    ]} />
  );
}

// ── ScreenTransition ──────────────────────────────────────────
interface ScreenTransitionProps {
  children:   ReactNode;
  direction?: 'left' | 'right';
}
export function ScreenTransition({ children, direction = 'right' }: ScreenTransitionProps) {
  const x       = useRef(new Animated.Value(direction === 'right' ? 60 : -60)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(x,       { toValue:0, speed:16, bounciness:6, useNativeDriver:true }),
      Animated.timing(opacity, { toValue:1, duration:300, useNativeDriver:true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[styles.full, { opacity, transform:[{ translateX:x }] }]}>
      {children}
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  btn:     { alignItems:'center', justifyContent:'center', borderRadius:16, paddingVertical:14, paddingHorizontal:20 },
  spinner: { borderWidth:3, borderTopColor:'transparent' },
  full:    { flex:1 },
});
