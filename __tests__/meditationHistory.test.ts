import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import RNFS from 'react-native-fs';
import {
  CompletedMeditation,
  MEDITATION_HISTORY_LIMIT,
  addCompletedMeditation,
  createCompletedMeditation,
  fileMeditationHistoryStorage,
  parseMeditationHistory,
  summariseMeditationHistory,
} from '../src/services/meditationHistory';

const mockedFs = RNFS as unknown as {
  exists: jest.Mock<(path: string) => Promise<boolean>>;
  readFile: jest.Mock<(path: string, encoding: string) => Promise<string>>;
  writeFile: jest.Mock<(path: string, contents: string, encoding: string) => Promise<void>>;
};

const entry = (id: string, completedAt: string, durationSeconds = 600): CompletedMeditation => ({
  id,
  sessionId: 'pranayama_basic',
  completedAt,
  durationSeconds,
});

beforeEach(() => {
  mockedFs.exists.mockClear();
  mockedFs.readFile.mockReset();
  mockedFs.writeFile.mockClear();
});

describe('parseMeditationHistory', () => {
  it('keeps only well-formed entries, newest first', () => {
    const parsed = parseMeditationHistory({
      entries: [
        entry('old', '2026-10-01T10:00:00Z'),
        { id: 'bad-date', sessionId: 'x', completedAt: 'yesterday', durationSeconds: 600 },
        { id: 'bad-duration', sessionId: 'x', completedAt: '2026-10-02T10:00:00Z', durationSeconds: -5 },
        { id: '../escape', sessionId: 'x', completedAt: '2026-10-02T10:00:00Z', durationSeconds: 600 },
        'not an object',
        entry('new', '2026-10-03T10:00:00Z'),
      ],
    });
    expect(parsed.map(item => item.id)).toEqual(['new', 'old']);
  });

  it('returns an empty history for anything that is not a saved history file', () => {
    expect(parseMeditationHistory(null)).toEqual([]);
    expect(parseMeditationHistory({ entries: 'nope' })).toEqual([]);
    expect(parseMeditationHistory([entry('a', '2026-10-01T10:00:00Z')])).toEqual([]);
  });
});

describe('history updates', () => {
  it('adds the newest session first and keeps at most the history limit', () => {
    const existing = Array.from({ length: MEDITATION_HISTORY_LIMIT }, (_, i) =>
      entry(`e${i}`, new Date(Date.UTC(2026, 8, 1) - i * 60000).toISOString()),
    );
    const next = addCompletedMeditation(existing, entry('latest', '2026-10-12T10:00:00Z'));
    expect(next).toHaveLength(MEDITATION_HISTORY_LIMIT);
    expect(next[0].id).toBe('latest');
    expect(next[next.length - 1].id).toBe(`e${MEDITATION_HISTORY_LIMIT - 2}`);
  });

  it('creates an entry with the completion time and the full session duration', () => {
    const completedAt = new Date('2026-10-12T15:30:00Z');
    expect(createCompletedMeditation('body_scan', 900, completedAt)).toEqual({
      id: `${completedAt.getTime()}-body_scan`,
      sessionId: 'body_scan',
      completedAt: '2026-10-12T15:30:00.000Z',
      durationSeconds: 900,
    });
  });

  it('totals sessions and minutes', () => {
    expect(
      summariseMeditationHistory([entry('a', '2026-10-01T10:00:00Z', 600), entry('b', '2026-10-02T10:00:00Z', 420)]),
    ).toEqual({ sessions: 2, totalMinutes: 17 });
  });
});

describe('fileMeditationHistoryStorage', () => {
  it('keeps each account in its own file in the private documents folder', async () => {
    await fileMeditationHistoryStorage.save('user-7', [entry('a', '2026-10-01T10:00:00Z')]);
    await fileMeditationHistoryStorage.save('user/../8', []);
    expect(mockedFs.writeFile.mock.calls.map(call => call[0])).toEqual([
      '/mock/documents/meditation-history-user-7.json',
      '/mock/documents/meditation-history-user____8.json',
    ]);
    expect(JSON.parse(mockedFs.writeFile.mock.calls[0][1])).toEqual({
      version: 1,
      entries: [entry('a', '2026-10-01T10:00:00Z')],
    });
  });

  it('reads a saved file and treats a missing or damaged file as an empty history', async () => {
    mockedFs.exists.mockResolvedValueOnce(true);
    mockedFs.readFile.mockResolvedValueOnce(JSON.stringify({ version: 1, entries: [entry('a', '2026-10-01T10:00:00Z')] }));
    expect(await fileMeditationHistoryStorage.load('user-7')).toEqual([entry('a', '2026-10-01T10:00:00Z')]);

    mockedFs.exists.mockResolvedValueOnce(false);
    expect(await fileMeditationHistoryStorage.load('user-7')).toEqual([]);

    mockedFs.exists.mockResolvedValueOnce(true);
    mockedFs.readFile.mockResolvedValueOnce('{not json');
    expect(await fileMeditationHistoryStorage.load('user-7')).toEqual([]);
  });
});
