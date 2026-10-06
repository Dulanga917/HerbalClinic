import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { SkinStackParamList } from '../../navigation/types';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { openCamera, openGallery, PickedImage } from '../../utils/imageUtils';
import ScreenHeader from '../../components/ScreenHeader';
import HerbalButton from '../../components/HerbalButton';

type Props = {
  navigation: NativeStackNavigationProp<SkinStackParamList, 'SkinCamera'>;
  route: RouteProp<SkinStackParamList, 'SkinCamera'>;
};

type PickerSource = 'camera' | 'gallery';

const SkinCameraScreen: React.FC<Props> = ({ navigation, route }) => {
  const { analysisType } = route.params;
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [picking, setPicking] = useState<PickerSource | null>(null);
  const pickingRef = useRef(false);
  const navigatingRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => navigation.addListener('focus', () => {
    navigatingRef.current = false;
    scrollRef.current?.scrollTo?.({ y: 0, animated: false });
  }), [navigation]);

  const isSkinType = analysisType === 'type';
  const title = isSkinType ? 'Skin Type Assessment' : 'AI Skin Guidance';
  const subtitle = isSkinType
    ? 'Experimental on-device Dosha prediction: Vata, Pitta, or Kapha'
    : 'General Ayurvedic self-care guidance for a skin area';
  const privacyNote = isSkinType
    ? 'The photo is classified on this phone by the on-device model.'
    : 'The photo is sent to the HerbalClinic server to request Gemini guidance.';
  const tips = isSkinType
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

  const pickImage = async (source: PickerSource) => {
    if (pickingRef.current) {
      return;
    }
    pickingRef.current = true;
    setPicking(source);
    try {
      const image: PickedImage | null = source === 'camera' ? await openCamera() : await openGallery();
      if (image) {
        setSelectedImage(image.uri);
      }
    } finally {
      pickingRef.current = false;
      setPicking(null);
    }
  };

  const handleAnalyse = () => {
    if (!selectedImage || navigatingRef.current) {
      return;
    }
    navigatingRef.current = true;
    navigation.navigate('SkinResult', {
      imageUri: selectedImage,
      analysisType,
    });
  };

  const hasImage = Boolean(selectedImage);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScreenHeader
        emoji={isSkinType ? '🔬' : '🩺'}
        title={title}
        subtitle={subtitle}
        colors={isSkinType ? Colors.gradientGreen : Colors.gradientVata}
        onBack={() => navigation.goBack()}
      />

      <ScrollView ref={scrollRef} style={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.previewContainer}>
          {selectedImage ? (
            <>
              <Image
                source={{ uri: selectedImage }}
                style={styles.previewImage}
                accessibilityLabel="Selected photo preview"
              />
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>✓ Photo selected</Text>
              </View>
            </>
          ) : (
            <View style={styles.previewPlaceholder}>
              <Text style={styles.placeholderEmoji}>📷</Text>
              <Text style={styles.placeholderText}>No photo selected</Text>
              <Text style={styles.placeholderHint}>Take a photo or choose one from your gallery</Text>
            </View>
          )}
        </View>

        <Text style={styles.stepLabel}>{hasImage ? 'Change photo' : '1. Add a photo'}</Text>
        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={[styles.optionBtn, picking && picking !== 'camera' && styles.optionBtnDimmed]}
            onPress={() => pickImage('camera')}
            disabled={picking !== null}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={hasImage ? 'Retake photo with camera' : 'Take photo with camera'}
            accessibilityState={{ disabled: picking !== null, busy: picking === 'camera' }}>
            <LinearGradient colors={Colors.gradientGreen} style={styles.optionGradient}>
              {picking === 'camera' ? (
                <ActivityIndicator color={Colors.textPrimary} />
              ) : (
                <Text style={styles.optionEmoji}>📷</Text>
              )}
              <Text style={styles.optionLabel}>{hasImage ? 'Retake' : 'Camera'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionBtn, picking && picking !== 'gallery' && styles.optionBtnDimmed]}
            onPress={() => pickImage('gallery')}
            disabled={picking !== null}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={hasImage ? 'Change photo from gallery' : 'Choose photo from gallery'}
            accessibilityState={{ disabled: picking !== null, busy: picking === 'gallery' }}>
            <LinearGradient colors={Colors.gradientVata} style={styles.optionGradient}>
              {picking === 'gallery' ? (
                <ActivityIndicator color={Colors.textPrimary} />
              ) : (
                <Text style={styles.optionEmoji}>🖼️</Text>
              )}
              <Text style={styles.optionLabel}>{hasImage ? 'Change Photo' : 'Gallery'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={styles.stepLabel}>{hasImage ? 'Ready' : '2. Analyse'}</Text>
        <HerbalButton
          title={isSkinType ? '✨  Classify on Device' : '✨  Get AI Skin Guidance'}
          accessibilityLabel={isSkinType ? 'Classify on Device' : 'Get AI Skin Guidance'}
          onPress={handleAnalyse}
          disabled={!hasImage || picking !== null}
        />
        <Text style={styles.actionHint}>
          {hasImage ? privacyNote : 'Add a photo first to continue.'}
        </Text>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>📌 Tips for Best Results</Text>
          {tips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipDot}>•</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1, padding: Spacing.xl },
  previewContainer: {
    height: 260,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
  },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  previewBadge: {
    position: 'absolute',
    left: Spacing.md,
    top: Spacing.md,
    backgroundColor: 'rgba(10,15,13,0.75)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  previewBadgeText: { color: Colors.primaryLight, fontWeight: '700', fontSize: Typography.sm },
  previewPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  placeholderEmoji: { fontSize: 56 },
  placeholderText: { fontSize: Typography.lg, color: Colors.textSecondary, fontWeight: '600' },
  placeholderHint: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center' },
  stepLabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: Spacing.sm,
  },
  optionsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  optionBtn: { flex: 1, borderRadius: BorderRadius.xl, overflow: 'hidden' },
  optionBtnDimmed: { opacity: 0.5 },
  optionGradient: {
    minHeight: 104,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  optionEmoji: { fontSize: 32 },
  optionLabel: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary },
  actionHint: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  tipsCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  tipsTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  tipRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  tipDot: { color: Colors.primaryLight, fontSize: Typography.base, lineHeight: 22 },
  tipText: { flex: 1, fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 22 },
  bottomPad: { height: Spacing['3xl'] },
});

export default SkinCameraScreen;
