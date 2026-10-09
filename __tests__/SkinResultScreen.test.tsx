/**
 * @format
 */

import 'react-native';
import React from 'react';
import { Text } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import RNFS from 'react-native-fs';
import SkinResultScreen from '../src/screens/skin/SkinResultScreen';
import { analyseDosha } from '../src/services/doshaModelService';
import { SKIN_GUIDANCE_DISCLAIMER } from '../src/utils/skinGuidance';
import {
  LanguageProvider,
  createMemoryLanguageStorage,
  setCurrentLanguage,
  translate,
  useLanguage,
} from '../src/i18n';

const mockRefreshUser = jest.fn(async () => undefined);

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ sessionToken: 'test-session', refreshUser: mockRefreshUser }),
}));

jest.mock('../src/services/sessionStorage', () => ({
  getSessionToken: jest.fn(async () => 'test-session'),
}));

jest.mock('../src/services/doshaModelService', () => ({
  analyseDosha: jest.fn(),
}));

type Reply = { status: number; body: unknown };
type FetchCall = { url: string; body: Record<string, unknown> | null };

let fetchCalls: FetchCall[] = [];

const mockServer = (skinIssueReply: Reply) => {
  fetchCalls = [];
  (global as { fetch: unknown }).fetch = jest.fn(async (url: string, init?: { body?: string }) => {
    fetchCalls.push({ url, body: init?.body ? JSON.parse(init.body) : null });
    const reply = url.endsWith('/api/v1/skin-issue')
      ? skinIssueReply
      : { status: 201, body: { user: { id: '1' } } };
    return {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      json: async () => reply.body,
    };
  });
};

const scanSaves = () => fetchCalls.filter(call => call.url.endsWith('/api/v1/scans'));

const flatten = (children: unknown): string =>
  Array.isArray(children) ? children.map(flatten).join('') : children == null ? '' : String(children);

const screenText = (root: ReactTestRenderer) =>
  root.root
    .findAllByType(Text)
    .map(node => flatten(node.props.children))
    .join('\n');

const renderScreen = async (analysisType: 'issue' | 'type', language?: 'si') => {
  let root!: ReactTestRenderer;
  const navigation = { goBack: jest.fn() } as never;
  const route = { params: { imageUri: 'file:///data/photo-1.jpg', analysisType } } as never;
  const screen = <SkinResultScreen navigation={navigation} route={route} />;
  await act(async () => {
    root = renderer.create(
      language ? (
        <LanguageProvider storage={createMemoryLanguageStorage(language)}>{screen}</LanguageProvider>
      ) : (
        screen
      ),
    );
  });
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await new Promise<void>(resolve => setImmediate(() => resolve()));
    });
  }
  return root;
};

const DIAGNOSTIC_WORDING =
  /Detected Condition|Severity|\bMild\b|\bModerate\b|\bSevere\b|model confidence|AI confidence|confidence|\d+\s*%/i;

describe('SkinResultScreen — AI skin guidance', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    (RNFS.readFile as jest.Mock<() => Promise<string>>).mockResolvedValue('AAAA');
    mockRefreshUser.mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('shows labelled offline guidance for a missing Gemini key and does not save it', async () => {
    mockServer({
      status: 503,
      body: { error: 'AI guidance is temporarily unavailable.', code: 'GEMINI_UNAVAILABLE' },
    });
    const root = await renderScreen('issue');
    const text = screenText(root);

    expect(text).toMatch(/Offline general guidance/);
    expect(text).toMatch(/photo was not analysed/i);
    expect(text).toContain(SKIN_GUIDANCE_DISCLAIMER);
    expect(text).not.toMatch(DIAGNOSTIC_WORDING);
    expect(text).not.toMatch(/undefined|Analysis Failed/);
    expect(scanSaves()).toHaveLength(0);
    expect(mockRefreshUser).not.toHaveBeenCalled();
  });

  it('shows live guidance without a confidence figure even if the model sent one', async () => {
    mockServer({
      status: 200,
      body: {
        analysis: {
          status: 'possible_concern',
          concern: 'Visible dryness',
          observations: 'The skin looks a little dry.',
          factors: ['Dry weather'],
          herbs: [{ name: 'Aloe Vera', emoji: '🌵', benefit: 'Soothing', usage: 'Apply gel' }],
          selfCare: ['Moisturise daily'],
          confidence: 97,
          severity: 'Severe',
          disclaimer: 'model-written disclaimer',
        },
      },
    });
    const root = await renderScreen('issue');
    const text = screenText(root);

    expect(text).toMatch(/AI Skin Guidance/);
    expect(text).toMatch(/Possible skin concern/);
    expect(text).toMatch(/Visible dryness/);
    expect(text).toMatch(/Self-care suggestions/);
    expect(text).toContain(SKIN_GUIDANCE_DISCLAIMER);
    expect(text).not.toMatch(DIAGNOSTIC_WORDING);
    expect(text).not.toMatch(/97|model-written disclaimer|Detect|diagnos(is|ed) of/i);
    expect(text).not.toMatch(/Offline general guidance/);

    const saves = scanSaves();
    expect(saves).toHaveLength(1);
    expect(saves[0].body).toEqual({ imageReference: 'photo-1.jpg' });
  });

  it('renders safely when lists and strings are missing from a live response', async () => {
    mockServer({ status: 200, body: { analysis: { status: 'unable_to_assess', observations: 'Blurry photo.' } } });
    const root = await renderScreen('issue');
    const text = screenText(root);

    expect(text).toMatch(/This photo could not be assessed/);
    expect(text).not.toMatch(/Possible contributing factors|Herbs used in Ayurvedic skincare/);
    expect(text).toContain(SKIN_GUIDANCE_DISCLAIMER);
    expect(text).not.toMatch(/undefined|null|NaN/);
  });

  it('falls back to offline guidance for a malformed response instead of crashing', async () => {
    mockServer({ status: 200, body: { analysis: { causes: 'x', herbs: 'y', lifestyle: 3 } } });
    const root = await renderScreen('issue');
    const text = screenText(root);

    expect(text).toMatch(/photo was not analysed/i);
    expect(text).toContain(SKIN_GUIDANCE_DISCLAIMER);
    expect(text).not.toMatch(/undefined/);
    expect(scanSaves()).toHaveLength(0);
  });

  it('asks Gemini for Sinhala guidance and shows the Sinhala offline fallback and disclaimer', async () => {
    mockServer({
      status: 503,
      body: { error: 'AI guidance is temporarily unavailable.', code: 'GEMINI_UNAVAILABLE' },
    });
    const root = await renderScreen('issue', 'si');
    const text = screenText(root);

    const request = fetchCalls.find(call => call.url.endsWith('/api/v1/skin-issue'));
    expect(request?.body).toMatchObject({ language: 'si' });
    expect(text).toContain(translate('si', 'result.offlineBanner'));
    expect(text).toContain(translate('si', 'result.disclaimer'));
    expect(text).not.toContain(SKIN_GUIDANCE_DISCLAIMER);
    expect(text).not.toMatch(/Offline general guidance|undefined/);
    expect(text).not.toMatch(DIAGNOSTIC_WORDING);
    expect(scanSaves()).toHaveLength(0);
    setCurrentLanguage('en');
  });

  const SINHALA_ANALYSIS = {
    status: 'possible_concern',
    concern: 'පෙනෙන වියළි බව',
    observations: 'සම මඳක් වියළි ලෙස පෙනේ.',
    factors: ['වියළි කාලගුණය'],
    herbs: [{ name: 'Aloe Vera', emoji: '🌵', benefit: 'සමට සිසිලසක් ලබා දෙයි', usage: 'ජෙල් ස්වල්පයක් ආලේප කරන්න' }],
    selfCare: ['දිනපතා සම තෙත් කරන්න'],
  };

  it('shows complete Sinhala live guidance with the verified Sinhala herb name', async () => {
    mockServer({ status: 200, body: { analysis: SINHALA_ANALYSIS } });
    const root = await renderScreen('issue', 'si');
    const text = screenText(root);

    expect(text).toContain(translate('si', 'result.possibleConcern'));
    expect(text).toContain('සම මඳක් වියළි ලෙස පෙනේ.');
    expect(text).toContain('වියළි කාලගුණය');
    expect(text).toContain('කෝමාරිකා');
    expect(text).toContain(translate('si', 'result.disclaimer'));
    expect(text).not.toContain('Aloe Vera');
    expect(text).not.toContain(translate('si', 'result.offlineBanner'));
    expect(scanSaves()).toHaveLength(1);
    setCurrentLanguage('en');
  });

  it('never shows English AI prose under Sinhala headings; it shows the Sinhala offline fallback', async () => {
    mockServer({
      status: 200,
      body: {
        analysis: {
          ...SINHALA_ANALYSIS,
          observations: 'The skin looks a little dry in this photo.',
          factors: ['Dry weather and low humidity'],
        },
      },
    });
    const root = await renderScreen('issue', 'si');
    const text = screenText(root);

    expect(text).toContain(translate('si', 'result.offlineBanner'));
    expect(text).not.toMatch(/looks a little dry|low humidity/);
    expect(text).toContain(translate('si', 'result.disclaimer'));
    expect(scanSaves()).toHaveLength(0);
    setCurrentLanguage('en');
  });

  it('hides live guidance after a language switch and re-analyses in the new language without a second scan', async () => {
    const replies: Reply[] = [
      { status: 200, body: { analysis: { status: 'no_clear_concern', observations: 'Even tone overall.' } } },
      { status: 200, body: { analysis: SINHALA_ANALYSIS } },
    ];
    fetchCalls = [];
    (global as { fetch: unknown }).fetch = jest.fn(async (url: string, init?: { body?: string }) => {
      fetchCalls.push({ url, body: init?.body ? JSON.parse(init.body) : null });
      const reply = url.endsWith('/api/v1/skin-issue') ? replies.shift()! : { status: 201, body: { user: { id: '1' } } };
      return { ok: reply.status < 300, status: reply.status, json: async () => reply.body };
    });

    let switchLanguage!: (language: 'en' | 'si') => void;
    const LanguageSwitch = () => {
      switchLanguage = useLanguage().setLanguage;
      return null;
    };
    const route = { params: { imageUri: 'file:///data/photo-1.jpg', analysisType: 'issue' } } as never;
    let root!: ReactTestRenderer;
    const settle = async () => {
      for (let i = 0; i < 5; i += 1) {
        await act(async () => {
          await new Promise<void>(resolve => setImmediate(() => resolve()));
        });
      }
    };
    await act(async () => {
      root = renderer.create(
        <LanguageProvider storage={createMemoryLanguageStorage('en')}>
          <LanguageSwitch />
          <SkinResultScreen navigation={{ goBack: jest.fn() } as never} route={route} />
        </LanguageProvider>,
      );
    });
    await settle();
    expect(screenText(root)).toContain('Even tone overall.');

    await act(async () => switchLanguage('si'));
    let text = screenText(root);
    expect(text).not.toContain('Even tone overall.');
    expect(text).toContain(translate('si', 'result.languageChanged'));

    const again = root.root.findAll(
      node => node.props.title === translate('si', 'result.analyseAgainInLanguage') && typeof node.props.onPress === 'function',
    )[0];
    await act(async () => again.props.onPress());
    await settle();
    text = screenText(root);

    const requests = fetchCalls.filter(call => call.url.endsWith('/api/v1/skin-issue'));
    expect(requests.map(call => call.body?.language)).toEqual(['en', 'si']);
    expect(text).toContain('සම මඳක් වියළි ලෙස පෙනේ.');
    expect(text).not.toContain(translate('si', 'result.languageChanged'));
    expect(scanSaves()).toHaveLength(1);
    setCurrentLanguage('en');
  });

  it('sends English as the guidance language by default', async () => {
    mockServer({ status: 200, body: { analysis: { status: 'no_clear_concern', observations: 'Even tone.' } } });
    await renderScreen('issue');
    const request = fetchCalls.find(call => call.url.endsWith('/api/v1/skin-issue'));
    expect(request?.body).toMatchObject({ language: 'en' });
  });

  it('shows a safe error state for an ordinary server failure', async () => {
    mockServer({ status: 500, body: { error: 'Something went wrong. Please try again.' } });
    const root = await renderScreen('issue');
    const text = screenText(root);

    expect(text).toMatch(/Analysis Failed/);
    expect(text).toMatch(/Something went wrong/);
    expect(text).not.toMatch(/undefined|stack|GEMINI/i);
    expect(scanSaves()).toHaveLength(0);
  });
});

describe('SkinResultScreen — TFLite Dosha classifier regression', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('still shows the on-device model confidence and saves the Dosha scan', async () => {
    (analyseDosha as jest.Mock<typeof analyseDosha>).mockResolvedValue({ dosha: 'Pitta', confidence: 83 });
    mockServer({ status: 500, body: {} });
    const root = await renderScreen('type');
    const text = screenText(root);

    expect(text).toMatch(/Dosha prediction/);
    expect(text).toMatch(/Pitta/);
    expect(text).toMatch(/83% model confidence/);
    expect(text).not.toMatch(/AI Skin Guidance|photo was not analysed/);
    expect(scanSaves()).toHaveLength(1);
    expect(scanSaves()[0].body).toEqual({ dosha: 'Pitta', confidence: 83, imageReference: 'photo-1.jpg' });
    expect(fetchCalls.some(call => call.url.endsWith('/api/v1/skin-issue'))).toBe(false);
  });

  it('shows the Dosha result in Sinhala without changing the model label or saved confidence', async () => {
    (analyseDosha as jest.Mock<typeof analyseDosha>).mockResolvedValue({ dosha: 'Pitta', confidence: 83 });
    mockServer({ status: 500, body: {} });
    const root = await renderScreen('type', 'si');
    const text = screenText(root);

    expect(text).toContain(translate('si', 'result.doshaPrediction'));
    expect(text).toContain('පිත (Pitta)');
    expect(text).toContain(translate('si', 'result.modelConfidence', { value: 83 }));
    expect(text).toContain(translate('si', 'result.doshaDisclaimer'));
    expect(text).not.toMatch(/Dosha prediction|model confidence/);
    expect(scanSaves()[0].body).toEqual({ dosha: 'Pitta', confidence: 83, imageReference: 'photo-1.jpg' });
    setCurrentLanguage('en');
  });

  it('explains an on-device model failure without exposing model internals', async () => {
    (analyseDosha as jest.Mock<typeof analyseDosha>).mockRejectedValue(
      new Error('The model returned an unexpected tensor shape.'),
    );
    mockServer({ status: 201, body: {} });
    const root = await renderScreen('type');
    const text = screenText(root);

    expect(text).toMatch(/Analysis Failed/);
    expect(text).toMatch(/could not classify this photo/);
    expect(text).toMatch(/Try Again/);
    expect(text).toMatch(/Choose Another Photo/);
    expect(text).not.toMatch(/tensor|undefined|model confidence/i);
    expect(scanSaves()).toHaveLength(0);
  });
});
