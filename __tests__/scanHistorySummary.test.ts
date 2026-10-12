import { describe, expect, it } from '@jest/globals';
import type { ScanRecord } from '../src/services/apiClient';
import { formatLocalDate, formatLocalTime } from '../src/utils/localDate';
import { SCAN_TIMELINE_LIMIT, summariseScanHistory } from '../src/utils/scanHistorySummary';

const scan = (id: number, dosha: string | null, createdAt: string): ScanRecord => ({
  id,
  dosha,
  confidence: dosha ? 80 : null,
  imageReference: `scan-${id}.jpg`,
  createdAt,
});

describe('summariseScanHistory', () => {
  it('counts every saved scan and separates Skin Type results from AI guidance', () => {
    const summary = summariseScanHistory([
      scan(5, 'Pitta', '2026-10-05T10:00:00Z'),
      scan(4, null, '2026-10-04T10:00:00Z'),
      scan(3, 'Vata', '2026-10-03T10:00:00Z'),
      scan(2, 'Pitta', '2026-10-02T10:00:00Z'),
      scan(1, null, '2026-10-01T10:00:00Z'),
    ]);
    expect(summary.total).toBe(5);
    expect(summary.skinTypeScans).toBe(3);
    expect(summary.guidanceScans).toBe(2);
  });

  it('orders Dosha counts as Vata, Pitta, Kapha and keeps older dual labels after them', () => {
    const summary = summariseScanHistory([
      scan(4, 'Vata-Pitta', '2026-10-04T10:00:00Z'),
      scan(3, 'Kapha', '2026-10-03T10:00:00Z'),
      scan(2, 'Pitta', '2026-10-02T10:00:00Z'),
      scan(1, 'Kapha', '2026-10-01T10:00:00Z'),
    ]);
    expect(summary.doshaCounts).toEqual([
      { dosha: 'Pitta', count: 1 },
      { dosha: 'Kapha', count: 2 },
      { dosha: 'Vata-Pitta', count: 1 },
    ]);
  });

  it('builds an oldest-to-newest timeline of the most recent Dosha results only', () => {
    const scans = Array.from({ length: SCAN_TIMELINE_LIMIT + 3 }, (_, i) =>
      scan(i + 1, i % 2 === 0 ? 'Vata' : 'Kapha', `2026-09-${String(i + 1).padStart(2, '0')}T10:00:00Z`),
    ).reverse();
    scans.push(scan(99, null, '2026-09-30T10:00:00Z'));

    const { timeline } = summariseScanHistory(scans);
    expect(timeline).toHaveLength(SCAN_TIMELINE_LIMIT);
    expect(timeline.map(entry => entry.id)).toEqual(
      Array.from({ length: SCAN_TIMELINE_LIMIT }, (_, i) => i + 4),
    );
    expect(timeline[0]).toEqual({ id: 4, dosha: 'Kapha', date: formatLocalDate('2026-09-04T10:00:00Z') });
  });

  it('returns an empty summary for an account with no scans', () => {
    expect(summariseScanHistory([])).toEqual({
      total: 0,
      skinTypeScans: 0,
      guidanceScans: 0,
      doshaCounts: [],
      timeline: [],
    });
  });
});

describe('local date formatting', () => {
  const pad = (value: number) => String(value).padStart(2, '0');

  it('formats a timestamp as a local calendar date and clock time', () => {
    const iso = '2026-10-11T06:16:53Z';
    const local = new Date(iso);
    expect(formatLocalDate(iso)).toBe(
      `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`,
    );
    expect(formatLocalTime(iso)).toBe(`${pad(local.getHours())}:${pad(local.getMinutes())}`);
  });

  it('falls back safely when the timestamp cannot be read', () => {
    expect(formatLocalDate('not-a-date')).toBe('not-a-date');
    expect(formatLocalTime('not-a-date')).toBe('');
  });
});
