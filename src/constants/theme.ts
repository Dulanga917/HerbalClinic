export const Colors = {
  // Primary Palette
  primary: '#2D6A4F',
  primaryLight: '#52B788',
  primaryDark: '#1B4332',

  // Accent
  accent: '#F4A261',
  accentLight: '#FFBE76',
  accentDark: '#E07B39',

  // Background / Surface
  background: '#0A0F0D',
  surface: '#111714',
  surfaceElevated: '#182219',
  card: '#1A2820',
  cardBorder: '#2A3F2F',

  // Text
  textPrimary: '#F0F4F1',
  textSecondary: '#8BA898',
  textMuted: '#4A6557',
  textDisabled: '#374F44',

  // Dosha Colors
  vata: '#9B8EC4',
  vataDark: '#6B5B95',
  vataLight: '#C5BBE3',

  pitta: '#E76F51',
  pittaDark: '#BF4F31',
  pittaLight: '#F4A28C',

  kapha: '#52B788',
  kaphaDark: '#2D6A4F',
  kaphaLight: '#B7E4C7',

  // Status
  success: '#40C057',
  warning: '#FAB005',
  error: '#FA5252',
  info: '#339AF0',

  // Gradients
  gradientGreen: ['#1B4332', '#2D6A4F', '#52B788'] as string[],
  gradientDark: ['#0A0F0D', '#111714', '#182219'] as string[],
  gradientVata: ['#3D3068', '#6B5B95', '#9B8EC4'] as string[],
  gradientPitta: ['#7A2010', '#BF4F31', '#E76F51'] as string[],
  gradientKapha: ['#1B4332', '#2D6A4F', '#52B788'] as string[],
  gradientAccent: ['#E07B39', '#F4A261', '#FFBE76'] as string[],

  // Overlays
  overlay: 'rgba(0,0,0,0.6)',
  overlayLight: 'rgba(0,0,0,0.3)',
  glassBackground: 'rgba(26, 40, 32, 0.8)',
  glassBorder: 'rgba(82, 183, 136, 0.2)',
};

export const Typography = {
  // Font Families
  fontRegular: 'Poppins-Regular',
  fontMedium: 'Poppins-Medium',
  fontSemiBold: 'Poppins-SemiBold',
  fontBold: 'Poppins-Bold',
  fontLight: 'Poppins-Light',

  // Font Sizes
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  glow: {
    shadowColor: Colors.primaryLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
};
