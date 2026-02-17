// App.tsx  ← ROOT file: D:\dulanga\app\HerbalClinic\App.tsx
import React, { useState } from 'react';
import { Dosha } from './src/data/appData';
import { ScreenTransition } from './src/components/Animations';

// ── Screens ───────────────────────────────────────────────────
import SplashScreen         from './src/screens/SplashScreen';
import LoginScreen          from './src/screens/LoginScreen';
import RegisterScreen       from './src/screens/RegisterScreen';
import HomeScreen           from './src/screens/HomeScreen';
import SkinAnalysisScreen   from './src/screens/SkinAnalysisScreen';
import MeditationScreen     from './src/screens/MeditationScreen';
import HerbsScreen          from './src/screens/HerbsScreen';
import StressScreen         from './src/screens/StressScreen';
import AIChatScreen         from './src/screens/AIChatScreen';
import AISkinAnalysisScreen from './src/screens/AISkinAnalysisScreen';
import AIHerbScreen         from './src/screens/AIHerbScreen';

// ── All screen names ──────────────────────────────────────────
type FullScreen =
  | 'splash'
  | 'login'
  | 'register'
  | 'home'
  | 'skinAnalysis'
  | 'meditation'
  | 'herbs'
  | 'stress'
  | 'aiChat'
  | 'aiSkin'
  | 'aiHerbs';

// ── Root App ──────────────────────────────────────────────────
export default function App() {
  const [screen,      setScreen]      = useState<FullScreen>('splash');
  const [username,    setUsername]    = useState('');
  const [dosha,       setDosha]       = useState<Dosha>(null);
  const [stressLevel, setStressLevel] = useState(5);

  const goTo = (s: FullScreen) => setScreen(s);

  const handleLogin  = (name: string) => { setUsername(name); goTo('home'); };
  const handleLogout = ()             => { setUsername(''); setDosha(null); goTo('login'); };

  // Direction — going deeper = right, going back = left
  const isBack = ['home', 'login', 'splash', 'register'].includes(screen);

  const renderScreen = () => {
    switch (screen) {

      case 'splash':
        return <SplashScreen onFinish={() => goTo('login')} />;

      // ── Login ────────────────────────────────────────────────
      case 'login':
        return (
          <LoginScreen
            onLogin={handleLogin}
            onRegister={() => goTo('register')}
          />
        );

      // ── Register ─────────────────────────────────────────────
      case 'register':
        return (
          <RegisterScreen
            onRegister={handleLogin}
            onLogin={() => goTo('login')}
          />
        );

      // ── Skin Analysis ────────────────────────────────────────
      case 'skinAnalysis':
        return (
          <SkinAnalysisScreen
            onBack={() => goTo('home')}
            onDoshaResult={d => { setDosha(d); goTo('home'); }}
          />
        );

      // ── Meditation ───────────────────────────────────────────
      case 'meditation':
        return <MeditationScreen onBack={() => goTo('home')} dosha={dosha} />;

      // ── Herbs ────────────────────────────────────────────────
      case 'herbs':
        return <HerbsScreen onBack={() => goTo('home')} dosha={dosha} />;

      // ── Stress ───────────────────────────────────────────────
      case 'stress':
        return <StressScreen onBack={() => goTo('home')} />;

      // ── AI Chat ──────────────────────────────────────────────
      case 'aiChat':
        return <AIChatScreen onBack={() => goTo('home')} dosha={dosha} />;

      // ── AI Skin Scan ─────────────────────────────────────────
      case 'aiSkin':
        return (
          <AISkinAnalysisScreen
            onBack={() => goTo('home')}
            onDoshaDetected={d => setDosha(d as Dosha)}
          />
        );

      // ── AI Herb Advisor ──────────────────────────────────────
      case 'aiHerbs':
        return (
          <AIHerbScreen
            onBack={() => goTo('home')}
            dosha={dosha}
            stressLevel={stressLevel}
          />
        );

      // ── Home (default) ───────────────────────────────────────
      default:
        return (
          <HomeScreen
            username={username}
            dosha={dosha}
            onNav={s => goTo(s as FullScreen)}
            onLogout={handleLogout}
          />
        );
    }
  };

  return (
    <ScreenTransition key={screen} direction={isBack ? 'left' : 'right'}>
      {renderScreen()}
    </ScreenTransition>
  );
}
