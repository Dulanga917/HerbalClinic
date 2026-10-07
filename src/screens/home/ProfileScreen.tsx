import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Modal,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { HomeTabParamList } from '../../navigation/types';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import Config from '../../constants/config';
import { fetchScanHistory, isSessionInvalid, ScanRecord } from '../../services/apiClient';
import { describeError, resolveMessage } from '../../utils/userMessages';
import { useTopInset } from '../../components/ScreenHeader';
import LanguageSelector from '../../components/LanguageSelector';
import { TranslationKey, useLanguage } from '../../i18n';
import { doshaLabel as formatDosha } from '../../i18n/content';

type Props = BottomTabScreenProps<HomeTabParamList, 'Profile'>;

const menuItems: { id: string; emoji: string; title: TranslationKey; description: TranslationKey }[] = [
  { id: 'history', emoji: '📋', title: 'profile.menu.history', description: 'profile.menu.historyDesc' },
  { id: 'treatments', emoji: '🌿', title: 'profile.menu.herbs', description: 'profile.menu.herbsDesc' },
  { id: 'meditation', emoji: '🧘', title: 'profile.menu.meditation', description: 'profile.menu.meditationDesc' },
  { id: 'settings', emoji: '⚙️', title: 'profile.menu.settings', description: 'profile.menu.settingsDesc' },
  { id: 'about', emoji: 'ℹ️', title: 'profile.menu.about', description: 'profile.menu.aboutDesc' },
];

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout, sessionToken } = useAuth();
  const { language, t } = useLanguage();
  const displayName = user?.name?.trim() || t('profile.member');
  const displayEmail = user?.email?.trim() || t('profile.noEmail');
  const doshaLabel = user?.dosha
    ? t('profile.dosha', { dosha: formatDosha(user.dosha, language) })
    : t('profile.doshaNone');
  const scanCount = String(user?.scanCount ?? 0);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [signingOut, setSigningOut] = useState(false);
  const topInset = useTopInset();

  const signOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } catch {
      Alert.alert(t('profile.signOutFailedTitle'), t('profile.signOutFailedBody'));
    } finally {
      setSigningOut(false);
    }
  };

  const handleSignOut = () => {
    if (signingOut) {
      return;
    }
    Alert.alert(t('profile.signOutConfirmTitle'), t('profile.signOutConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.signOut'), style: 'destructive', onPress: signOut },
    ]);
  };

  const openScanHistory = async () => {
    if (!sessionToken) {
      Alert.alert(t('profile.signInRequiredTitle'), t('profile.signInRequiredBody'));
      return;
    }
    setHistoryVisible(true);
    setHistoryLoading(true);
    try {
      const result = await fetchScanHistory(sessionToken);
      setScans(result.scans);
    } catch (error) {
      setHistoryVisible(false);
      if (isSessionInvalid(error)) {
        return;
      }
      Alert.alert(
        t('profile.menu.history'),
        resolveMessage(describeError(error, 'profile.historyLoadFailed'), language),
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleMenuPress = (id: string) => {
    switch (id) {
      case 'history':
        openScanHistory();
        break;
      case 'treatments':
        navigation.navigate('HerbalTreatment');
        break;
      case 'meditation':
        navigation.navigate('Meditation');
        break;
      case 'settings':
        Alert.alert(
          t('profile.menu.settings'),
          t('profile.settingsBody', {
            email: displayEmail,
            api: Config.API_BASE_URL || t('profile.apiNotConfigured'),
          }),
        );
        break;
      case 'about':
        Alert.alert(
          t('profile.menu.about'),
          t('profile.aboutBody', { app: Config.APP_NAME, version: Config.VERSION }),
        );
        break;
      default:
        break;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={Colors.gradientDark}
          style={[styles.header, { paddingTop: topInset + Spacing.xl }]}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>🌿</Text>
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{displayEmail}</Text>
          <View style={styles.doshaBadge}>
            <Text style={styles.doshaText}>{doshaLabel}</Text>
          </View>
        </LinearGradient>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{scanCount}</Text>
            <Text style={styles.statLabel}>{t('profile.savedScans')}</Text>
          </View>
        </View>

        <View style={styles.languageCard}>
          <View style={styles.languageHeader}>
            <Text style={styles.menuEmoji}>🌐</Text>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>{t('language.label')}</Text>
              <Text style={styles.menuDesc}>{t('language.description')}</Text>
            </View>
          </View>
          <LanguageSelector style={styles.languageSelector} />
        </View>

        <View style={styles.menuSection}>
          {menuItems.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              activeOpacity={0.75}
              onPress={() => handleMenuPress(item.id)}
              accessibilityRole="button"
              accessibilityLabel={t(item.title)}>
              <Text style={styles.menuEmoji}>{item.emoji}</Text>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>{t(item.title)}</Text>
                <Text style={styles.menuDesc}>{t(item.description)}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.signOutWrapper}
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('profile.signOut')}
          accessibilityState={{ disabled: signingOut, busy: signingOut }}>
          <LinearGradient
            colors={['#7A2010', '#FA5252']}
            style={styles.signOutBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}>
            {signingOut ? (
              <View style={styles.signOutBusy}>
                <ActivityIndicator size="small" color={Colors.textPrimary} />
                <Text style={styles.signOutText}>{t('profile.signingOut')}</Text>
              </View>
            ) : (
              <Text style={styles.signOutText}>🚪  {t('profile.signOut')}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomPad} />
      </ScrollView>

      <Modal
        visible={historyVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHistoryVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('profile.menu.history')}</Text>
            {historyLoading ? (
              <View style={styles.historyLoading} accessibilityLiveRegion="polite">
                <ActivityIndicator color={Colors.primaryLight} />
                <Text style={styles.historyLoadingText}>{t('profile.historyLoading')}</Text>
              </View>
            ) : scans.length === 0 ? (
              <Text style={styles.historyEmpty}>{t('profile.historyEmpty')}</Text>
            ) : (
              <FlatList
                testID="scan-history-list"
                style={styles.historyList}
                data={scans}
                keyExtractor={scan => String(scan.id)}
                showsVerticalScrollIndicator
                renderItem={({ item: scan }) => (
                  <View style={styles.historyRow}>
                    <Text style={styles.historyEmoji}>{scan.dosha ? '🔬' : '🩺'}</Text>
                    <View style={styles.historyText}>
                      <Text style={[styles.historyKind, !scan.dosha && styles.historyKindAi]}>
                        {scan.dosha ? t('profile.historyKindType') : t('profile.historyKindAi')}
                      </Text>
                      <Text style={styles.menuTitle}>
                        {scan.dosha
                          ? t('profile.dosha', { dosha: formatDosha(scan.dosha, language) })
                          : t('profile.historyAiTitle')}
                      </Text>
                      <Text style={styles.historyMeta}>
                        {!scan.dosha
                          ? t('profile.historyAiMeta')
                          : scan.confidence != null
                            ? t('result.modelConfidence', { value: scan.confidence })
                            : t('profile.historyNoConfidence')}
                        {scan.createdAt ? ` · ${scan.createdAt.slice(0, 10)}` : ''}
                      </Text>
                    </View>
                  </View>
                )}
              />
            )}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setHistoryVisible(false)}
              accessibilityRole="button"
              accessibilityLabel={t('profile.closeHistoryA11y')}>
              <Text style={styles.closeText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingBottom: Spacing['3xl'],
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.card,
    borderWidth: 3,
    borderColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarEmoji: { fontSize: 44 },
  userName: { fontSize: Typography['2xl'], fontWeight: '700', color: Colors.textPrimary },
  userEmail: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  doshaBadge: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  doshaText: { fontSize: Typography.sm, color: Colors.primaryLight, fontWeight: '600', textAlign: 'center' },
  statsRow: {
    marginHorizontal: Spacing.xl,
    marginTop: -Spacing.lg,
  },
  statCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statValue: { fontSize: Typography['2xl'], fontWeight: '800', color: Colors.primaryLight },
  statLabel: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  languageCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  languageHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  languageSelector: { marginTop: Spacing.md },
  menuSection: { padding: Spacing.xl, paddingTop: Spacing.base, gap: Spacing.sm },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: Spacing.md,
  },
  menuEmoji: { fontSize: 28 },
  menuText: { flex: 1 },
  menuTitle: { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary },
  menuDesc: { fontSize: Typography.sm, lineHeight: 20, color: Colors.textSecondary, marginTop: 2 },
  menuArrow: { fontSize: 24, color: Colors.textSecondary },
  signOutWrapper: { marginHorizontal: Spacing.xl, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  signOutBtn: {
    minHeight: 52,
    justifyContent: 'center',
    paddingVertical: Spacing.base + 2,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  signOutBusy: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  signOutText: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary },
  bottomPad: { height: Spacing['3xl'] },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  historyList: { flexGrow: 0, flexShrink: 1 },
  historyLoading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.base },
  historyLoadingText: { color: Colors.textSecondary, fontSize: Typography.sm },
  historyEmpty: { color: Colors.textSecondary, fontSize: Typography.sm, paddingVertical: Spacing.sm },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    paddingBottom: Spacing.md,
  },
  historyEmoji: { fontSize: 22, marginTop: 2 },
  historyText: { flex: 1 },
  historyKind: { fontSize: Typography.xs, color: Colors.primaryLight, fontWeight: '700', marginBottom: 2 },
  historyKindAi: { color: Colors.vataLight },
  historyMeta: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  closeBtn: {
    marginTop: Spacing.base,
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  closeText: { color: Colors.textPrimary, fontWeight: '700' },
});

export default ProfileScreen;
