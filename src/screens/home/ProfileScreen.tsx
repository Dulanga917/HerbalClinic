import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

const menuItems = [
  { id: 'history', emoji: '📋', title: 'Scan History', description: 'View past skin analyses' },
  { id: 'treatments', emoji: '🌿', title: 'My Treatments', description: 'Saved herbal treatment plans' },
  { id: 'meditation', emoji: '🧘', title: 'Meditation History', description: 'Completed sessions log' },
  { id: 'settings', emoji: '⚙️', title: 'Settings', description: 'App preferences & notifications' },
  { id: 'about', emoji: 'ℹ️', title: 'About HerbalClinic', description: 'Version 1.0.0 — Final Year Project' },
];

const ProfileScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <LinearGradient colors={Colors.gradientDark} style={styles.header}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>🌿</Text>
          </View>
          <Text style={styles.userName}>Herbal User</Text>
          <Text style={styles.userEmail}>user@herbalclinic.com</Text>
          <View style={styles.doshaBadge}>
            <Text style={styles.doshaText}>Dosha: Vata-Pitta</Text>
          </View>
        </LinearGradient>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Scans', value: '0' },
            { label: 'Sessions', value: '0' },
            { label: 'Plans', value: '0' },
          ].map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map(item => (
            <TouchableOpacity key={item.id} style={styles.menuItem} activeOpacity={0.75}>
              <Text style={styles.menuEmoji}>{item.emoji}</Text>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDesc}>{item.description}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutWrapper}>
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
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    marginTop: -Spacing.lg,
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
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
});

export default ProfileScreen;
