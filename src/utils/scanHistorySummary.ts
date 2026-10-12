import type { ScanRecord } from '../services/apiClient';
import { formatLocalDate } from './localDate';

export const SCAN_TIMELINE_LIMIT = 8;

const CORE_DOSHA_ORDER = ['Vata', 'Pitta', 'Kapha'];

export interface DoshaCount {
  dosha: string;
  count: number;
}

export interface ScanTimelineEntry {
  id: number;
  dosha: string;
  date: string;
}

export interface ScanHistorySummary {
  total: number;
  skinTypeScans: number;
  guidanceScans: number;
  doshaCounts: DoshaCount[];
  timeline: ScanTimelineEntry[];
}

const timeOf = (scan: ScanRecord) => {
  const value = new Date(scan.createdAt).getTime();
  return Number.isNaN(value) ? 0 : value;
};

const doshaOrder = (dosha: string) => {
  const index = CORE_DOSHA_ORDER.indexOf(dosha);
  return index === -1 ? CORE_DOSHA_ORDER.length : index;
};

/**
 * Counts and a dated sequence of saved predictions. It describes what was recorded, not whether
 * anything got better or worse.
 */
export const summariseScanHistory = (scans: ScanRecord[]): ScanHistorySummary => {
  const counts = new Map<string, number>();
  const doshaScans: ScanRecord[] = [];

  for (const scan of scans) {
    if (scan.dosha) {
      counts.set(scan.dosha, (counts.get(scan.dosha) ?? 0) + 1);
      doshaScans.push(scan);
    }
  }

  const doshaCounts = [...counts.entries()]
    .map(([dosha, count]) => ({ dosha, count }))
    .sort((a, b) => doshaOrder(a.dosha) - doshaOrder(b.dosha) || a.dosha.localeCompare(b.dosha));

  const timeline = doshaScans
    .slice()
    .sort((a, b) => timeOf(a) - timeOf(b) || a.id - b.id)
    .slice(-SCAN_TIMELINE_LIMIT)
    .map(scan => ({ id: scan.id, dosha: scan.dosha as string, date: formatLocalDate(scan.createdAt) }));

  return {
    total: scans.length,
    skinTypeScans: doshaScans.length,
    guidanceScans: scans.length - doshaScans.length,
    doshaCounts,
    timeline,
  };
};
