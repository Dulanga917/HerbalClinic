import RNFS from 'react-native-fs';
import { isLanguage, Language } from './types';

export interface LanguageStorage {
  load: () => Promise<Language | null>;
  save: (language: Language) => Promise<void>;
}

// The language is a non-secret UI preference, so it lives in the app's private files
// directory rather than the Keychain. It is kept on sign-out and removed only on uninstall.
const preferencePath = () => `${RNFS.DocumentDirectoryPath}/language-preference.json`;

export const fileLanguageStorage: LanguageStorage = {
  load: async () => {
    const path = preferencePath();
    if (!(await RNFS.exists(path))) {
      return null;
    }
    try {
      const parsed = JSON.parse(await RNFS.readFile(path, 'utf8'));
      return isLanguage(parsed?.language) ? parsed.language : null;
    } catch {
      return null;
    }
  },
  save: async language => {
    await RNFS.writeFile(preferencePath(), JSON.stringify({ language }), 'utf8');
  },
};

export const createMemoryLanguageStorage = (initial: Language | null = null): LanguageStorage & {
  value: () => Language | null;
} => {
  let stored = initial;
  return {
    load: async () => stored,
    save: async language => {
      stored = language;
    },
    value: () => stored,
  };
};
