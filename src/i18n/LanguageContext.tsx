import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { fileLanguageStorage, LanguageStorage } from './languageStorage';
import { setCurrentLanguage, translate } from './translate';
import type { TranslationKey } from './translations/en';
import { DEFAULT_LANGUAGE, Language, TranslationParams } from './types';

export interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
}

// Screens rendered without a provider (unit tests, isolated previews) fall back to English.
const fallbackValue: LanguageContextValue = {
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key, params) => translate(DEFAULT_LANGUAGE, key, params),
};

const LanguageContext = createContext<LanguageContextValue>(fallbackValue);

// A stuck storage read must never leave the app blank.
const LOAD_TIMEOUT_MS = 1500;

type Props = {
  children: ReactNode;
  storage?: LanguageStorage;
};

export const LanguageProvider = ({ children, storage = fileLanguageStorage }: Props) => {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [ready, setReady] = useState(false);
  const chosenRef = useRef(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) {
        setReady(true);
      }
    }, LOAD_TIMEOUT_MS);

    storage
      .load()
      .catch(() => null)
      .then(saved => {
        if (!active) {
          return;
        }
        // A choice made while the saved value was still loading wins over the stored one.
        if (saved && !chosenRef.current) {
          setCurrentLanguage(saved);
          setLanguageState(saved);
        }
        setReady(true);
      });

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [storage]);

  const setLanguage = useCallback(
    (next: Language) => {
      chosenRef.current = true;
      setCurrentLanguage(next);
      setLanguageState(next);
      storage.save(next).catch(() => {});
    },
    [storage],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key, params) => translate(language, key, params),
    }),
    [language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>{ready ? children : null}</LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => useContext(LanguageContext);
