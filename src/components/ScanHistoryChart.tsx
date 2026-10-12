import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/theme';
import { useLanguage } from '../i18n';
import { doshaLabel, doshaName } from '../i18n/content';
import type { ScanRecord } from '../services/apiClient';
import { summariseScanHistory } from '../utils/scanHistorySummary';

const DOSHA_COLORS: Record<string, string> = {
  vata: Colors.vata,
  pitta: Colors.pitta,
  kapha: Colors.kapha,
};

// Dual labels from older scans (e.g. "Vata-Pitta") use the colour of their first Dosha.
const doshaColor = (dosha: string) =>
  DOSHA_COLORS[dosha.split('-')[0].trim().toLowerCase()] ?? Colors.textSecondary;

const ScanHistoryChart: React.FC<{ scans: ScanRecord[] }> = ({ scans }) => {
  const { language, t } = useLanguage();
  const summary = summariseScanHistory(scans);
  const maxCount = Math.max(1, ...summary.doshaCounts.map(item => item.count));

  const stats = [
    { id: 'total', value: summary.total, label: t('scanChart.total') },
    { id: 'type', value: summary.skinTypeScans, label: t('scanChart.skinType') },
    { id: 'guidance', value: summary.guidanceScans, label: t('scanChart.guidance') },
  ];

  return (
    <View style={styles.container} testID="scan-history-chart">
      <View style={styles.statsRow}>
        {stats.map(stat => (
          <View
            key={stat.id}
            style={styles.statTile}
            accessible
            accessibilityLabel={`${stat.label}: ${stat.value}`}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>{t('scanChart.doshaTitle')}</Text>
      {summary.doshaCounts.length === 0 ? (
        <Text style={styles.emptyText}>{t('scanChart.noDoshaScans')}</Text>
      ) : (
        summary.doshaCounts.map(item => {
          const label = doshaLabel(item.dosha, language);
          return (
            <View
              key={item.dosha}
              style={styles.barRow}
              testID={`scan-chart-bar-${item.dosha}`}
              accessible
              accessibilityLabel={t('scanChart.barA11y', { dosha: label, count: item.count })}>
              <Text style={styles.barLabel} numberOfLines={1}>
                {label}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${(item.count / maxCount) * 100}%`, backgroundColor: doshaColor(item.dosha) },
                  ]}
                />
              </View>
              <Text style={styles.barCount}>{item.count}</Text>
            </View>
          );
        })
      )}

      {summary.timeline.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>{t('scanChart.timelineTitle')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} testID="scan-history-timeline">
            <View style={styles.timeline}>
              {summary.timeline.map((entry, index) => (
                <View
                  key={entry.id}
                  style={styles.timelineItem}
                  accessible
                  accessibilityLabel={`${entry.date}: ${doshaLabel(entry.dosha, language)}`}>
                  <Text style={styles.timelineDate}>{entry.date.slice(5)}</Text>
                  <View style={styles.timelineDotRow}>
                    <View style={[styles.timelineLine, index === 0 && styles.timelineLineHidden]} />
                    <View style={[styles.timelineDot, { backgroundColor: doshaColor(entry.dosha) }]} />
                    <View
                      style={[
                        styles.timelineLine,
                        index === summary.timeline.length - 1 && styles.timelineLineHidden,
                      ]}
                    />
                  </View>
                  <Text style={styles.timelineDosha} numberOfLines={1}>
                    {doshaName(entry.dosha, language)}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </>
      ) : null}

      <Text style={styles.note}>{t('scanChart.note')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.base,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.base },
  statTile: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statValue: { fontSize: Typography.xl, fontWeight: '800', color: Colors.primaryLight },
  statLabel: { fontSize: Typography.xs, color: Colors.textSecondary, textAlign: 'center', marginTop: 2 },
  sectionTitle: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  emptyText: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  barLabel: { width: 96, fontSize: Typography.sm, color: Colors.textSecondary },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: BorderRadius.full },
  barCount: { width: 28, textAlign: 'right', fontSize: Typography.sm, fontWeight: '700', color: Colors.textPrimary },
  timeline: { flexDirection: 'row', paddingVertical: Spacing.xs },
  timelineItem: { width: 64, alignItems: 'center' },
  timelineDate: { fontSize: Typography.xs, color: Colors.textSecondary, marginBottom: Spacing.xs },
  timelineDotRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  timelineLine: { flex: 1, height: 2, backgroundColor: Colors.cardBorder },
  timelineLineHidden: { backgroundColor: 'transparent' },
  timelineDot: { width: 14, height: 14, borderRadius: BorderRadius.full },
  timelineDosha: { fontSize: Typography.xs, color: Colors.textPrimary, marginTop: Spacing.xs, fontWeight: '600' },
  note: { fontSize: Typography.xs, lineHeight: 17, color: Colors.textSecondary, marginTop: Spacing.sm },
});

export default ScanHistoryChart;
