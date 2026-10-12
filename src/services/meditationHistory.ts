import RNFS from 'react-native-fs';

export const MEDITATION_HISTORY_LIMIT = 100;

export interface CompletedMeditation {
  id: string;
  sessionId: string;
  completedAt: string;
  durationSeconds: number;
}

export interface MeditationHistoryStorage {
  load: (owner: string) => Promise<CompletedMeditation[]>;
  save: (owner: string, entries: CompletedMeditation[]) => Promise<void>;
}

const SAFE_ID = /^[\w-]{1,80}$/;

const ownerFileKey = (owner: string) => {
  const key = owner.replace(/[^\w-]/g, '_').slice(0, 64);
  return key || 'guest';
};

// Completed sessions are a personal, non-secret record, so like the language preference they live
// in the app's private files directory. Each account gets its own file so a shared phone keeps them apart.
const historyPath = (owner: string) =>
  `${RNFS.DocumentDirectoryPath}/meditation-history-${ownerFileKey(owner)}.json`;

const isCompletedMeditation = (value: unknown): value is CompletedMeditation => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === 'string' &&
    SAFE_ID.test(entry.id) &&
    typeof entry.sessionId === 'string' &&
    SAFE_ID.test(entry.sessionId) &&
    typeof entry.completedAt === 'string' &&
    !Number.isNaN(new Date(entry.completedAt).getTime()) &&
    typeof entry.durationSeconds === 'number' &&
    Number.isFinite(entry.durationSeconds) &&
    entry.durationSeconds > 0
  );
};

/** Keeps only well-formed entries, newest first, so a damaged file never breaks the screen. */
export const parseMeditationHistory = (raw: unknown): CompletedMeditation[] => {
  const entries = (raw as { entries?: unknown } | null)?.entries;
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries
    .filter(isCompletedMeditation)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, MEDITATION_HISTORY_LIMIT);
};

export const addCompletedMeditation = (
  entries: CompletedMeditation[],
  entry: CompletedMeditation,
): CompletedMeditation[] => [entry, ...entries.filter(item => item.id !== entry.id)].slice(0, MEDITATION_HISTORY_LIMIT);

export const createCompletedMeditation = (
  sessionId: string,
  durationSeconds: number,
  completedAt: Date = new Date(),
): CompletedMeditation => ({
  id: `${completedAt.getTime()}-${sessionId}`.slice(0, 80),
  sessionId,
  completedAt: completedAt.toISOString(),
  durationSeconds,
});

export const summariseMeditationHistory = (entries: CompletedMeditation[]) => ({
  sessions: entries.length,
  totalMinutes: Math.round(entries.reduce((sum, entry) => sum + entry.durationSeconds, 0) / 60),
});

export const fileMeditationHistoryStorage: MeditationHistoryStorage = {
  load: async owner => {
    const path = historyPath(owner);
    if (!(await RNFS.exists(path))) {
      return [];
    }
    try {
      return parseMeditationHistory(JSON.parse(await RNFS.readFile(path, 'utf8')));
    } catch {
      return [];
    }
  },
  save: async (owner, entries) => {
    await RNFS.writeFile(historyPath(owner), JSON.stringify({ version: 1, entries }), 'utf8');
  },
};

export const createMemoryMeditationHistoryStorage = (
  initial: Record<string, CompletedMeditation[]> = {},
): MeditationHistoryStorage & { value: (owner: string) => CompletedMeditation[] } => {
  const stored: Record<string, CompletedMeditation[]> = { ...initial };
  return {
    load: async owner => [...(stored[owner] ?? [])],
    save: async (owner, entries) => {
      stored[owner] = [...entries];
    },
    value: owner => stored[owner] ?? [],
  };
};
