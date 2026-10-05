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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { HomeTabParamList } from '../../navigation/types';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import Config from '../../constants/config';
import { fetchScanHistory, ScanRecord } from '../../services/apiClient';

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

  const handleSignOut = async () => {
    try {
      await logout();
    } catch {
      Alert.alert('Sign out failed', 'Could not sign out. Please try again.');
    }
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
      const message = error instanceof Error ? error.message : 'Could not load scan history.';
      Alert.alert('Scan History', message);
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
        <LinearGradient colors={Colors.gradientDark} style={styles.header}>
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

        <TouchableOpacity style={styles.signOutWrapper} onPress={handleSignOut}>
          <LinearGradient
            colors={['#7A2010', '#FA5252']}
            style={styles.signOutBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}>
            <Text style={styles.signOutText}>🚪  Sign Out</Text>
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
              <ActivityIndicator color={Colors.primaryLight} />
            ) : scans.length === 0 ? (
              <Text style={styles.menuDesc}>No saved scans for this account yet.</Text>
            ) : (
              scans.map(scan => (
                <View key={scan.id} style={styles.historyRow}>
                  <Text style={styles.menuTitle}>{scan.dosha || 'AI skin guidance'}</Text>
                  <Text style={styles.menuDesc}>
                    {!scan.dosha
                      ? 'General guidance, no confidence score'
                      : scan.confidence != null
                        ? `${scan.confidence}% model confidence`
                        : 'No confidence stored'}
                    {scan.createdAt ? ` · ${scan.createdAt.slice(0, 10)}` : ''}
                  </Text>
                </View>
              ))
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setHistoryVisible(false)}>
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
    paddingTop: 60,
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
  menuDesc: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  menuArrow: { fontSize: 24, color: Colors.textMuted },
  signOutWrapper: { marginHorizontal: Spacing.xl, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  signOutBtn: { paddingVertical: Spacing.base + 2, alignItems: 'center', borderRadius: BorderRadius.lg },
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
  historyRow: {
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    paddingBottom: Spacing.sm,
  },
  closeBtn: {
    marginTop: Spacing.base,
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  closeText: { color: Colors.textPrimary, fontWeight: '700' },
});

export default ProfileScreen;
