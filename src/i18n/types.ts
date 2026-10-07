export type Language = 'en' | 'si';

export const SUPPORTED_LANGUAGES: readonly Language[] = ['en', 'si'];

export const DEFAULT_LANGUAGE: Language = 'en';

export const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);

export type TranslationParams = Record<string, string | number>;
