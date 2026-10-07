/**
 * @format
 */

import 'react-native';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import RNFS from 'react-native-fs';
import LanguageSelector from '../src/components/LanguageSelector';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import * as apiClient from '../src/services/apiClient';
import * as sessionStorage from '../src/services/sessionStorage';
import {
  Language,
  LanguageProvider,
  LanguageStorage,
  createMemoryLanguageStorage,
  fileLanguageStorage,
  getCurrentLanguage,
  setCurrentLanguage,
  translate,
  translateCurrent,
  useLanguage,
} from '../src/i18n';
import { en } from '../src/i18n/translations/en';
import { si } from '../src/i18n/translations/si';

jest.mock('../src/services/apiClient', () => ({
  ...jest.requireActual<typeof import('../src/services/apiClient')>('../src/services/apiClient'),
  logoutAccount: jest.fn(async () => undefined),
  fetchCurrentUser: jest.fn(),
}));

jest.mock('../src/services/sessionStorage', () => ({
  saveSessionToken: jest.fn(async () => undefined),
  getSessionToken: jest.fn(async () => null),
  clearSessionToken: jest.fn(async () => undefined),
}));

const Probe = () => {
  const { language, t } = useLanguage();
  return <Text testID="probe">{`${language}|${t('auth.signIn')}`}</Text>;
};

const mount = async (storage: LanguageStorage, extra?: React.ReactNode) => {
  let root!: renderer.ReactTestRenderer;
  await act(async () => {
    root = renderer.create(
      <LanguageProvider storage={storage}>
        <LanguageSelector />
        <Probe />
        {extra}
      </LanguageProvider>,
    );
  });
  return root;
};

const probe = (root: renderer.ReactTestRenderer) => root.root.findByProps({ testID: 'probe' }).props.children;

const option = (root: renderer.ReactTestRenderer, language: Language) =>
  root.root.findByProps({ testID: `language-option-${language}` });

const choose = (root: renderer.ReactTestRenderer, language: Language) =>
  act(() => {
    option(root, language).props.onPress();
  });

afterEach(() => {
  setCurrentLanguage('en');
});

describe('LanguageProvider', () => {
  it('defaults to English on first launch and does not write a preference by itself', async () => {
    const storage = createMemoryLanguageStorage();
    const root = await mount(storage);
    expect(probe(root)).toBe('en|Sign In');
    expect(option(root, 'en').props.accessibilityState).toMatchObject({ selected: true });
    expect(storage.value()).toBeNull();
    expect(getCurrentLanguage()).toBe('en');
    act(() => root.unmount());
  });

  it('switches English ↔ Sinhala immediately and saves each choice', async () => {
    const storage = createMemoryLanguageStorage();
    const root = await mount(storage);

    choose(root, 'si');
    expect(probe(root)).toBe('si|පිවිසෙන්න');
    expect(option(root, 'si').props.accessibilityState).toMatchObject({ selected: true });
    expect(storage.value()).toBe('si');
    expect(getCurrentLanguage()).toBe('si');
    expect(translateCurrent('permission.neededTitle')).toBe(si['permission.neededTitle']);

    choose(root, 'en');
    expect(probe(root)).toBe('en|Sign In');
    expect(storage.value()).toBe('en');
    expect(translateCurrent('permission.neededTitle')).toBe('Permission needed');
    act(() => root.unmount());
  });

  it('restores Sinhala after the app is closed and reopened', async () => {
    const storage = createMemoryLanguageStorage();
    const first = await mount(storage);
    choose(first, 'si');
    act(() => first.unmount());
    setCurrentLanguage('en');

    const reopened = await mount(storage);
    expect(probe(reopened)).toBe('si|පිවිසෙන්න');
    expect(getCurrentLanguage()).toBe('si');
    act(() => reopened.unmount());
  });

  it('keeps a choice made while the saved preference is still loading', async () => {
    let release!: (value: Language | null) => void;
    const storage: LanguageStorage = {
      load: () => new Promise(resolve => { release = resolve; }),
      save: jest.fn(async () => undefined),
    };
    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(
        <LanguageProvider storage={storage}>
          <Probe />
        </LanguageProvider>,
      );
    });
    expect(root.toJSON()).toBeNull();
    await act(async () => {
      release('si');
    });
    expect(probe(root)).toBe('si|පිවිසෙන්න');
    act(() => root.unmount());
  });

  it('falls back to English when the saved preference cannot be read', async () => {
    const storage: LanguageStorage = {
      load: async () => {
        throw new Error('disk unavailable');
      },
      save: async () => {
        throw new Error('disk unavailable');
      },
    };
    const root = await mount(storage);
    expect(probe(root)).toBe('en|Sign In');
    choose(root, 'si');
    expect(probe(root)).toBe('si|පිවිසෙන්න');
    act(() => root.unmount());
  });

  it('keeps the selected language when the user signs out', async () => {
    (sessionStorage.getSessionToken as jest.Mock<() => Promise<string | null>>).mockResolvedValue('token');
    (apiClient.fetchCurrentUser as unknown as jest.Mock<() => Promise<unknown>>).mockResolvedValue({
      user: { id: '1', name: 'Ada', email: 'ada@example.com', dosha: null, doshaConfidence: null, scanCount: 0 },
    });

    const SignOut = () => {
      const { user, logout } = useAuth();
      return (
        <TouchableOpacity testID="sign-out" onPress={() => logout()}>
          <Text testID="user">{user ? user.email : 'signed-out'}</Text>
        </TouchableOpacity>
      );
    };

    const storage = createMemoryLanguageStorage('si');
    let root!: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(
        <LanguageProvider storage={storage}>
          <AuthProvider>
            <Probe />
            <SignOut />
          </AuthProvider>
        </LanguageProvider>,
      );
    });
    expect(root.root.findByProps({ testID: 'user' }).props.children).toBe('ada@example.com');
    expect(probe(root)).toBe('si|පිවිසෙන්න');

    await act(async () => {
      await root.root.findByProps({ testID: 'sign-out' }).props.onPress();
    });
    expect(sessionStorage.clearSessionToken).toHaveBeenCalled();
    expect(root.root.findByProps({ testID: 'user' }).props.children).toBe('signed-out');
    expect(probe(root)).toBe('si|පිවිසෙන්න');
    expect(storage.value()).toBe('si');
    act(() => root.unmount());
  });
});

describe('fileLanguageStorage', () => {
  const fs = RNFS as unknown as {
    exists: jest.Mock<(path: string) => Promise<boolean>>;
    readFile: jest.Mock<(path: string, encoding: string) => Promise<string>>;
    writeFile: jest.Mock<(path: string, contents: string, encoding: string) => Promise<void>>;
  };

  beforeEach(() => {
    fs.exists.mockReset();
    fs.readFile.mockReset();
    fs.writeFile.mockReset();
    fs.writeFile.mockResolvedValue(undefined);
  });

  it('returns nothing on first launch so the app defaults to English', async () => {
    fs.exists.mockResolvedValue(false);
    expect(await fileLanguageStorage.load()).toBeNull();
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('saves and reads the preference from the app documents folder', async () => {
    await fileLanguageStorage.save('si');
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/mock/documents/language-preference.json',
      JSON.stringify({ language: 'si' }),
      'utf8',
    );
    fs.exists.mockResolvedValue(true);
    fs.readFile.mockResolvedValue(JSON.stringify({ language: 'si' }));
    expect(await fileLanguageStorage.load()).toBe('si');
  });

  it('ignores a corrupt or unsupported saved value', async () => {
    fs.exists.mockResolvedValue(true);
    fs.readFile.mockResolvedValue('{not json');
    expect(await fileLanguageStorage.load()).toBeNull();
    fs.readFile.mockResolvedValue(JSON.stringify({ language: 'fr' }));
    expect(await fileLanguageStorage.load()).toBeNull();
  });
});

describe('translations', () => {
  const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

  it('has a non-empty Sinhala string with the same placeholders for every English key', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(typeof si[key]).toBe('string');
      expect(si[key].trim().length).toBeGreaterThan(0);
      expect({ key, placeholders: placeholders(si[key]) }).toEqual({ key, placeholders: placeholders(en[key]) });
    }
  });

  it('contains no Devanagari text and interpolates parameters', () => {
    expect(JSON.stringify(si)).not.toMatch(/[\u0900-\u097F]/);
    expect(translate('en', 'hospitals.countOther', { count: 3 })).toBe('3 hospitals');
    expect(translate('si', 'hospitals.countOther', { count: 3 })).toBe('රෝහල් 3');
  });
});
