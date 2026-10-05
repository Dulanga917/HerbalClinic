import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { SkinStackParamList } from '../../navigation/types';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { openCamera, openGallery } from '../../utils/imageUtils';

type Props = {
  navigation: NativeStackNavigationProp<SkinStackParamList, 'SkinCamera'>;
  route: RouteProp<SkinStackParamList, 'SkinCamera'>;
};

const SkinCameraScreen: React.FC<Props> = ({ navigation, route }) => {
  const { analysisType } = route.params;
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const title = analysisType === 'type' ? 'Dosha Image Classifier' : 'AI Skin Guidance';
  const subtitle =
    analysisType === 'type'
      ? 'Experimental classification as Vata, Pitta, or Kapha'
      : 'Take a photo of the skin area you want guidance on';
  const tips =
    analysisType === 'type'
      ? [
          'Use a clear, well-lit photo',
          'Keep the camera steady and focused',
          'Avoid filters and heavy edits',
          'This experimental result is not a diagnosis',
        ]
      : [
          'Use natural lighting — avoid flash',
          'Keep the camera steady and focused',
          'Show the skin area clearly',
          'AI guidance is general information, not a medical diagnosis',
        ];

  const handleCamera = async () => {
    const image = await openCamera();
    if (image) {
      setSelectedImage(image.uri);
    }
  };

  const handleGallery = async () => {
    const image = await openGallery();
    if (image) {
      setSelectedImage(image.uri);
    }
  };

  const handleAnalyse = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please take or select a photo first.');
      return;
    }
    setLoading(true);
    // Navigate to result screen; actual Gemini call happens there
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('SkinResult', {
        imageUri: selectedImage,
        analysisType,
      });
    }, 300);
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={analysisType === 'type' ? Colors.gradientGreen : Colors.gradientVata}
        style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerEmoji}>{analysisType === 'type' ? '🔬' : '🩺'}</Text>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      </LinearGradient>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Preview Area */}
        <View style={styles.previewContainer}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Text style={styles.placeholderEmoji}>📷</Text>
              <Text style={styles.placeholderText}>No image selected</Text>
              <Text style={styles.placeholderHint}>Use the buttons below to add a photo</Text>
            </View>
          )}
        </View>

        {/* Capture Options */}
        <View style={styles.optionsRow}>
          <TouchableOpacity style={styles.optionBtn} onPress={handleCamera} activeOpacity={0.8}>
            <LinearGradient colors={Colors.gradientGreen} style={styles.optionGradient}>
              <Text style={styles.optionEmoji}>📷</Text>
              <Text style={styles.optionLabel}>Camera</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionBtn} onPress={handleGallery} activeOpacity={0.8}>
            <LinearGradient colors={Colors.gradientVata} style={styles.optionGradient}>
              <Text style={styles.optionEmoji}>🖼️</Text>
              <Text style={styles.optionLabel}>Gallery</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>📌 Tips for Best Results</Text>
          {[
            ...tips,
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipDot}>•</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Analyse Button */}
        <TouchableOpacity
          style={[styles.analyseBtn, !selectedImage && styles.analyseBtnDisabled]}
          onPress={handleAnalyse}
          disabled={!selectedImage || loading}
          activeOpacity={0.85}>
          <LinearGradient
            colors={selectedImage ? Colors.gradientGreen : ['#333', '#444']}
            style={styles.analyseGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}>
            {loading ? (
              <ActivityIndicator color={Colors.textPrimary} />
            ) : (
              <Text style={styles.analyseBtnText}>
                ✨  {analysisType === 'type' ? 'Classify on Device' : 'Get AI Skin Guidance'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 56,
    paddingBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 56,
    left: Spacing.xl,
    padding: Spacing.sm,
  },
  backIcon: { fontSize: 36, color: Colors.textPrimary, lineHeight: 36 },
  headerEmoji: { fontSize: 44, marginBottom: Spacing.sm },
  headerTitle: { fontSize: Typography['2xl'], fontWeight: '800', color: Colors.textPrimary },
  headerSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  body: { flex: 1, padding: Spacing.xl },
  previewContainer: {
    height: 280,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    borderWidth: 2,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
  },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  previewPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  placeholderEmoji: { fontSize: 56 },
  placeholderText: { fontSize: Typography.lg, color: Colors.textSecondary, fontWeight: '600' },
  placeholderHint: { fontSize: Typography.sm, color: Colors.textMuted },
  optionsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  optionBtn: { flex: 1, borderRadius: BorderRadius.xl, overflow: 'hidden' },
  optionGradient: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  optionEmoji: { fontSize: 36 },
  optionLabel: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary },
  tipsCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.xl,
  },
  tipsTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  tipRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  tipDot: { color: Colors.primaryLight, fontSize: Typography.base, lineHeight: 22 },
  tipText: { flex: 1, fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 22 },
  analyseBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  analyseBtnDisabled: { opacity: 0.5 },
  analyseGradient: {
    paddingVertical: Spacing.base + 4,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  analyseBtnText: { fontSize: Typography.md, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 0.5 },
  bottomPad: { height: Spacing['3xl'] },
});

export default SkinCameraScreen;
