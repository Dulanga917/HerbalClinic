import { en, TranslationKey } from './translations/en';
import { si } from './translations/si';
import { DEFAULT_LANGUAGE, Language, TranslationParams } from './types';

const DICTIONARIES: Record<Language, Record<TranslationKey, string>> = { en, si };

const interpolate = (template: string, params?: TranslationParams): string =>
  params
    ? template.replace(/\{(\w+)\}/g, (match, name: string) =>
        params[name] === undefined ? match : String(params[name]),
      )
    : template;

export const translate = (
  language: Language,
  key: TranslationKey,
  params?: TranslationParams,
): string => interpolate(DICTIONARIES[language][key] ?? en[key], params);

// Non-React helpers (alerts raised from utilities) read the language the provider last applied.
let currentLanguage: Language = DEFAULT_LANGUAGE;

export const getCurrentLanguage = (): Language => currentLanguage;

export const setCurrentLanguage = (language: Language): void => {
  currentLanguage = language;
};

export const translateCurrent = (key: TranslationKey, params?: TranslationParams): string =>
  translate(currentLanguage, key, params);
