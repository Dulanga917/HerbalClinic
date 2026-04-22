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
import AyurvedicTreatmentScreen from './src/screens/AyurvedicTreatmentScreen';
import { getLoggedInUser, logoutUser as dbLogout, UserProfile } from './src/services/dbService';

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
  | 'aiHerbs'
  | 'ayurvedic';

// ── Root App ──────────────────────────────────────────────────
export default function App() {
  const [screen,      setScreen]      = useState<FullScreen>('splash');
  const [username,    setUsername]    = useState('');
  const [userEmail,   setUserEmail]   = useState('');
  const [dosha,       setDosha]       = useState<Dosha>(null);
  const [stressLevel, setStressLevel] = useState(5);

  const goTo = (s: FullScreen) => setScreen(s);

  const handleLogin  = (profile: UserProfile) => { 
    setUsername(profile.fullName);
    setUserEmail(profile.email);
    if (profile.dosha) setDosha(profile.dosha);
    goTo('home'); 
  };
  
  const handleLogout = async () => { 
    await dbLogout();
    setUsername(''); 
    setUserEmail('');
    setDosha(null); 
    goTo('login'); 
  };

  // Direction — going deeper = right, going back = left
  const isBack = ['home', 'login', 'splash', 'register'].includes(screen);

  const renderScreen = () => {
    switch (screen) {

      case 'splash':
        return <SplashScreen onFinish={async () => {
          const user = await getLoggedInUser();
          if (user) {
            handleLogin(user);
          } else {
            goTo('login');
          }
        }} />;

      case 'login':
        return (
          <LoginScreen
            onLogin={handleLogin}
            onRegister={() => goTo('register')}
          />
        );
    //
      case 'register':
        return (
          <RegisterScreen
            onRegister={handleLogin}
            onLogin={() => goTo('login')}
          />
        );
//
      case 'skinAnalysis':
        return (
          <SkinAnalysisScreen
            onBack={() => goTo('home')}
            onDoshaResult={d => setDosha(d)}
          />
        );
//
      case 'meditation':
        return <MeditationScreen onBack={() => goTo('home')} dosha={dosha} />;
//
      case 'herbs':
        return <HerbsScreen onBack={() => goTo('home')} dosha={dosha} />;
//
      case 'stress':
        return <StressScreen onBack={() => goTo('home')} />;
//
      case 'aiChat':
        return <AIChatScreen onBack={() => goTo('home')} dosha={dosha} />;
//
      case 'aiSkin':
        return (
          <AISkinAnalysisScreen
            onBack={() => goTo('home')}
            onDoshaDetected={d => setDosha(d)}
          />
        );
//
      case 'aiHerbs':
        return (
          <AIHerbScreen
            onBack={() => goTo('home')}
            dosha={dosha}
            stressLevel={stressLevel}
          />
        );

      case 'ayurvedic':
        return <AyurvedicTreatmentScreen onBack={() => goTo('home')} />;

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
