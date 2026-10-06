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
import { friendlyErrorMessage } from '../../utils/userMessages';
import { useTopInset } from '../../components/ScreenHeader';

type Props = BottomTabScreenProps<HomeTabParamList, 'Profile'>;

const menuItems = [
  { id: 'history', emoji: '📋', title: 'Scan History', description: 'Saved assessments for this account' },
  { id: 'treatments', emoji: '🌿', title: 'Herb Library', description: 'Open Ayurvedic herb recommendations' },
  { id: 'meditation', emoji: '🧘', title: 'Meditation Sessions', description: 'Open guided meditation sessions' },
  { id: 'settings', emoji: '⚙️', title: 'Settings', description: 'Account and API details for this build' },
  { id: 'about', emoji: 'ℹ️', title: 'About HerbalClinic', description: 'Version 1.0.0 — Final Year Project' },
];

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout, sessionToken } = useAuth();
  const displayName = user?.name?.trim() || 'HerbalClinic member';
  const displayEmail = user?.email?.trim() || 'No email on file';
  const doshaLabel = user?.dosha ? `Dosha: ${user.dosha}` : 'Dosha: Not analyzed yet';
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
      Alert.alert('Sign out failed', 'Could not sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  const handleSignOut = () => {
    if (signingOut) {
      return;
    }
    Alert.alert('Sign out?', 'You will need to sign in again to use HerbalClinic.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const openScanHistory = async () => {
    if (!sessionToken) {
      Alert.alert('Sign in required', 'Please sign in again to view scan history.');
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
        'Scan History',
        friendlyErrorMessage(error, 'Could not load scan history. Please try again.'),
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
          'Settings',
          `Signed in as ${displayEmail}.\nAPI: ${Config.API_BASE_URL || 'not configured'}\nNotifications are not available in this build.`,
        );
        break;
      case 'about':
        Alert.alert(
          'About HerbalClinic',
          `${Config.APP_NAME} ${Config.VERSION}. Informational Ayurvedic self-care only — not a medical diagnosis. Gemini keys stay on the API server.`,
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
            <Text style={styles.statLabel}>Saved scans</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          {menuItems.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              activeOpacity={0.75}
              onPress={() => handleMenuPress(item.id)}
              accessibilityRole="button"
              accessibilityLabel={item.title}>
              <Text style={styles.menuEmoji}>{item.emoji}</Text>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDesc}>{item.description}</Text>
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
          accessibilityLabel="Sign Out"
          accessibilityState={{ disabled: signingOut, busy: signingOut }}>
          <LinearGradient
            colors={['#7A2010', '#FA5252']}
            style={styles.signOutBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}>
            {signingOut ? (
              <View style={styles.signOutBusy}>
                <ActivityIndicator size="small" color={Colors.textPrimary} />
                <Text style={styles.signOutText}>Signing out…</Text>
              </View>
            ) : (
              <Text style={styles.signOutText}>🚪  Sign Out</Text>
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
            <Text style={styles.modalTitle}>Scan History</Text>
            {historyLoading ? (
              <View style={styles.historyLoading} accessibilityLiveRegion="polite">
                <ActivityIndicator color={Colors.primaryLight} />
                <Text style={styles.historyLoadingText}>Loading history…</Text>
              </View>
            ) : scans.length === 0 ? (
              <Text style={styles.historyEmpty}>No saved scans for this account yet.</Text>
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
                        {scan.dosha ? 'Skin Type Assessment · on-device' : 'Gemini-assisted guidance'}
                      </Text>
                      <Text style={styles.menuTitle}>
                        {scan.dosha ? `Dosha: ${scan.dosha}` : 'AI skin guidance'}
                      </Text>
                      <Text style={styles.historyMeta}>
                        {!scan.dosha
                          ? 'General guidance, no confidence score'
                          : scan.confidence != null
                            ? `${scan.confidence}% model confidence`
                            : 'No confidence stored'}
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
              accessibilityLabel="Close Scan History">
              <Text style={styles.closeText}>Close</Text>
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
  doshaText: { fontSize: Typography.sm, color: Colors.primaryLight, fontWeight: '600' },
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
  menuSection: { padding: Spacing.xl, paddingTop: Spacing['2xl'], gap: Spacing.sm },
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
  menuDesc: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
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
