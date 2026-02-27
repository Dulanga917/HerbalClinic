// src/components/FloatingLeaves.tsx
// Animated floating leaves background — deep purple & green mix
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions, Easing } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// Leaf emojis pool
const LEAVES = ['🍃', '🌿', '🍀', '☘️', '🌱', '🍂', '🌾', '🪴'];

interface Leaf {
  id:       number;
  emoji:    string;
  x:        number;
  size:     number;
  duration: number;
  delay:    number;
  swing:    number;
  rotate:   number;
}

// Generate random leaves
const generateLeaves = (count: number): Leaf[] =>
  Array.from({ length: count }, (_, i) => ({
    id:       i,
    emoji:    LEAVES[Math.floor(Math.random() * LEAVES.length)],
    x:        Math.random() * (W - 40),
    size:     16 + Math.random() * 22,
    duration: 6000 + Math.random() * 8000,
    delay:    Math.random() * 8000,
    swing:    30 + Math.random() * 50,
    rotate:   Math.random() * 360,
  }));

const LEAF_DATA = generateLeaves(18);

// Single animated leaf
function FallingLeaf({ leaf }: { leaf: Leaf }) {
  const translateY = useRef(new Animated.Value(-60)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate     = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      // Reset
      translateY.setValue(-60);
      translateX.setValue(0);
      rotate.setValue(0);
      opacity.setValue(0);

      Animated.parallel([
        // Fall down
        Animated.timing(translateY, {
          toValue:  H + 80,
          duration: leaf.duration,
          delay:    leaf.delay,
          easing:   Easing.linear,
          useNativeDriver: true,
        }),
        // Swing left-right
        Animated.sequence([
          Animated.timing(translateX, {
            toValue:  leaf.swing,
            duration: leaf.duration / 3,
            delay:    leaf.delay,
            easing:   Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue:  -leaf.swing / 2,
            duration: leaf.duration / 3,
            easing:   Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue:  leaf.swing / 3,
            duration: leaf.duration / 3,
            easing:   Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        // Rotate while falling
        Animated.timing(rotate, {
          toValue:  1,
          duration: leaf.duration,
          delay:    leaf.delay,
          easing:   Easing.linear,
          useNativeDriver: true,
        }),
        // Fade in then out
        Animated.sequence([
          Animated.timing(opacity, {
            toValue:  0.7 + Math.random() * 0.3,
            duration: 800,
            delay:    leaf.delay,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue:  0.7,
            duration: leaf.duration - 1600,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue:  0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => startAnimation()); // loop forever
    };

    startAnimation();
  }, []);

  const spin = rotate.interpolate({
    inputRange:  [0, 1],
    outputRange: [`${leaf.rotate}deg`, `${leaf.rotate + 360}deg`],
  });

  return (
    <Animated.Text
      style={[
        styles.leaf,
        {
          left:      leaf.x,
          fontSize:  leaf.size,
          opacity,
          transform: [
            { translateY },
            { translateX },
            { rotate: spin },
          ],
        },
      ]}>
      {leaf.emoji}
    </Animated.Text>
  );
}

// Glowing orb background element
function GlowOrb({ x, y, color, size }: { x: number; y: number; color: string; size: number }) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale,   { toValue:1.3, duration:3000+Math.random()*2000, useNativeDriver:true }),
          Animated.timing(scale,   { toValue:1,   duration:3000+Math.random()*2000, useNativeDriver:true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue:0.3, duration:2500, useNativeDriver:true }),
          Animated.timing(opacity, { toValue:0.1, duration:2500, useNativeDriver:true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[
      styles.orb,
      {
        left:            x,
        top:             y,
        width:           size,
        height:          size,
        borderRadius:    size / 2,
        backgroundColor: color,
        opacity,
        transform:       [{ scale }],
      },
    ]} />
  );
}

// Main component
export default function FloatingLeaves() {
  // Orb positions
  const orbs = [
    { x: -60,    y: 100,  color: '#7c3aed', size: 200 },
    { x: W - 80, y: 300,  color: '#166534', size: 160 },
    { x: W / 2 - 100, y: H * 0.4, color: '#4c1d95', size: 220 },
    { x: -40,    y: H * 0.6, color: '#14532d', size: 180 },
    { x: W - 60, y: H * 0.75, color: '#6d28d9', size: 150 },
  ];

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Background orbs */}
      {orbs.map((o, i) => <GlowOrb key={i} {...o} />)}

      {/* Falling leaves */}
      {LEAF_DATA.map(leaf => <FallingLeaf key={leaf.id} leaf={leaf} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  leaf: {
    position: 'absolute',
    top:      0,
  },
  orb: {
    position: 'absolute',
  },
});
