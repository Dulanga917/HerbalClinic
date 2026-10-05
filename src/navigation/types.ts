// Navigation Type Definitions for HerbalClinic

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
};

export type HomeTabParamList = {
  Home: undefined;
  SkinAnalysis: undefined;
  HerbalTreatment: undefined;
  Meditation: undefined;
  Profile: undefined;
};

export type SkinStackParamList = {
  SkinHome: undefined;
  SkinCamera: { analysisType: 'type' | 'issue' };
  SkinResult: { imageUri: string; analysisType: 'type' | 'issue' };
};

export type HerbalStackParamList = {
  HerbalHome: undefined;
  HerbalDetail: { herbId: string };
  TreatmentPlan: { condition: string };
};

export type MeditationStackParamList = {
  MeditationHome: undefined;
  MeditationPlayer: { sessionId: string; title: string; duration: number };
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};
