import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { HomeTabParamList } from '../../navigation/types';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import geminiService from '../../services/geminiService';

type Props = BottomTabScreenProps<HomeTabParamList, 'Home'>;

const features = [
  {
    id: 'skin-type',
    emoji: '🔬',
    title: 'Dosha Image Classifier',
    description: 'Experimental image classification as Vata, Pitta, or Kapha',
    gradient: Colors.gradientGreen,
  },
  {
    id: 'skin-issue',
    emoji: '🩺',
    title: 'Skin Issue Scanner',
    description: 'Detect skin conditions with Gemini Vision AI',
    gradient: Colors.gradientVata,
  },
  {
    id: 'herbal',
    emoji: '🌿',
    title: 'Herbal Treatments',
    description: 'Personalized Ayurvedic herbal recommendations',
    gradient: Colors.gradientKapha,
  },
  {
    id: 'meditation',
    emoji: '🧘',
    title: 'Meditation & Wellness',
    description: 'Guided sessions for mind-body balance',
    gradient: Colors.gradientAccent,
  },
];

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [dailyTip, setDailyTip] = useState(
    'Start your day with warm water infused with tulsi and ginger to boost immunity and balance your doshas.',
  );

  useEffect(() => {
    let cancelled = false;
    geminiService
      .getDailyTip(user?.dosha || undefined)
      .then(tip => {
        if (!cancelled && tip) {
          setDailyTip(tip);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user?.dosha]);

  const handleFeaturePress = (featureId: string) => {
    switch (featureId) {
      case 'skin-type':
        navigation.navigate('SkinAnalysis', {
          screen: 'SkinCamera',
          params: { analysisType: 'type' },
        });
        break;
      case 'skin-issue':
        navigation.navigate('SkinAnalysis', {
          screen: 'SkinCamera',
          params: { analysisType: 'issue' },
        });
        break;
      case 'herbal':
        navigation.navigate('HerbalTreatment');
        break;
      case 'meditation':
        navigation.navigate('Meditation');
        break;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero Header */}
        <LinearGradient
          colors={Colors.gradientGreen}
          style={styles.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}>
          <Text style={styles.greeting}>
            {user?.name ? `Hello, ${user.name.split(' ')[0]} 🌿` : 'Good day 🌿'}
          </Text>
          <Text style={styles.heroTitle}>HerbalClinic</Text>
          <Text style={styles.heroSubtitle}>Your AI-powered Ayurvedic companion</Text>
        </LinearGradient>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Core Features</Text>
          <View style={styles.featuresGrid}>
            {features.map(f => (
              <TouchableOpacity
                key={f.id}
                style={styles.featureCard}
                activeOpacity={0.85}
                onPress={() => handleFeaturePress(f.id)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${f.title}`}>
                <LinearGradient
                  colors={f.gradient}
                  style={styles.featureGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}>
                  <Text style={styles.featureEmoji}>{f.emoji}</Text>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.description}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Daily Tip */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Ayurveda Tip</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipEmoji}>💡</Text>
            <Text style={styles.tipText}>{dailyTip}</Text>
          </View>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: {
    paddingTop: 60,
    paddingBottom: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  greeting: { fontSize: Typography.base, color: Colors.textSecondary, marginBottom: Spacing.xs },
  heroTitle: {
    fontSize: Typography['4xl'],
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  heroSubtitle: { fontSize: Typography.md, color: Colors.textSecondary, marginTop: Spacing.xs },
  section: { padding: Spacing.xl, paddingTop: Spacing['2xl'] },
  sectionTitle: {
    fontSize: Typography.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
    letterSpacing: 0.3,
  },
  featuresGrid: { gap: Spacing.md },
  featureCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  featureGradient: {
    padding: Spacing.xl,
    minHeight: 120,
    justifyContent: 'flex-end',
  },
  featureEmoji: { fontSize: 36, marginBottom: Spacing.sm },
  featureTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  featureDesc: { fontSize: Typography.sm, color: Colors.textSecondary },
  tipCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: Spacing.md,
  },
  tipEmoji: { fontSize: 28 },
  tipText: {
    flex: 1,
    fontSize: Typography.base,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  bottomPad: { height: Spacing['3xl'] },
});

export default HomeScreen;
