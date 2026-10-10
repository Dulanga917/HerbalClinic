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

const VALID_CHECK = { isValid: true, reason: 'ok', imageCategory: 'human_face' };
const VALID_CHECK_REPLY: Reply = { status: 200, body: { imageCheck: VALID_CHECK } };

const mockServer = (skinIssueReply: Reply, imageCheckReply: Reply = VALID_CHECK_REPLY) => {
  fetchCalls = [];
  (global as { fetch: unknown }).fetch = jest.fn(async (url: string, init?: { body?: string }) => {
    fetchCalls.push({ url, body: init?.body ? JSON.parse(init.body) : null });
    const reply = url.endsWith('/api/v1/skin-issue')
      ? skinIssueReply
      : url.endsWith('/api/v1/skin-image-check')
        ? imageCheckReply
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

const renderScreen = async (
  analysisType: 'issue' | 'type',
  language?: 'si',
  navigation: never = { goBack: jest.fn() } as never,
) => {
  let root!: ReactTestRenderer;
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
        imageCheck: VALID_CHECK,
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
    mockServer({
      status: 200,
      body: { imageCheck: VALID_CHECK, analysis: { status: 'unable_to_assess', observations: 'Blurry photo.' } },
    });
    const root = await renderScreen('issue');
    const text = screenText(root);

    expect(text).toMatch(/This photo could not be assessed/);
    expect(text).not.toMatch(/Possible contributing factors|Herbs used in Ayurvedic skincare/);
    expect(text).toContain(SKIN_GUIDANCE_DISCLAIMER);
    expect(text).not.toMatch(/undefined|null|NaN/);
    expect(scanSaves()).toHaveLength(0);
  });

  it('falls back to offline guidance for a malformed response instead of crashing', async () => {
    mockServer({
      status: 200,
      body: { imageCheck: VALID_CHECK, analysis: { causes: 'x', herbs: 'y', lifestyle: 3 } },
    });
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
    mockServer({ status: 200, body: { imageCheck: VALID_CHECK, analysis: SINHALA_ANALYSIS } });
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
        imageCheck: VALID_CHECK,
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
      {
        status: 200,
        body: { imageCheck: VALID_CHECK, analysis: { status: 'no_clear_concern', observations: 'Even tone overall.' } },
      },
      { status: 200, body: { imageCheck: VALID_CHECK, analysis: SINHALA_ANALYSIS } },
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
    mockServer({
      status: 200,
      body: { imageCheck: VALID_CHECK, analysis: { status: 'no_clear_concern', observations: 'Even tone.' } },
    });
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

  const expectRejectedWithoutResult = (text: string) => {
    expect(text).toMatch(/Please retake this photo/);
    expect(text).toMatch(/No result was created and nothing was saved/);
    expect(text).not.toMatch(/Possible skin concern|General observations|Offline general guidance|Self-care/);
    expect(text).not.toMatch(/Analysis Failed|undefined/);
    expect(scanSaves()).toHaveLength(0);
    expect(mockRefreshUser).not.toHaveBeenCalled();
  };

  it('shows a retake message, not guidance, when the server rejects a furniture photo (422)', async () => {
    mockServer({
      status: 422,
      body: {
        error: 'This photo cannot be assessed. Please retake it.',
        code: 'IMAGE_REJECTED',
        imageCheck: { isValid: false, reason: 'no_human_skin', imageCategory: 'furniture' },
      },
    });
    const root = await renderScreen('issue');
    const text = screenText(root);

    expectRejectedWithoutResult(text);
    expect(text).toMatch(/doesn't seem to show human skin/);
  });

  it('treats an unreadable 422 verdict as a rejection, never as a pass', async () => {
    mockServer({ status: 422, body: { error: 'This photo cannot be assessed. Please retake it.', code: 'IMAGE_REJECTED' } });
    const root = await renderScreen('issue');
    const text = screenText(root);

    expectRejectedWithoutResult(text);
    expect(text).toContain(translate('en', 'imageCheck.unclear'));
  });

  it('does not show live guidance when the returned image check says the photo is invalid', async () => {
    mockServer({
      status: 200,
      body: {
        imageCheck: { isValid: false, reason: 'blurry', imageCategory: 'human_skin' },
        analysis: { status: 'possible_concern', concern: 'Visible dryness', observations: 'Looks dry.' },
      },
    });
    const root = await renderScreen('issue');
    const text = screenText(root);

    expectRejectedWithoutResult(text);
    expect(text).toMatch(/The photo is blurry/);
    expect(text).not.toMatch(/Visible dryness|Looks dry/);
  });

  it('shows only labelled offline guidance when the response has no usable image check', async () => {
    for (const imageCheck of [undefined, { isValid: true }, { ...VALID_CHECK, imageCategory: 'furniture' }]) {
      mockServer({
        status: 200,
        body: { imageCheck, analysis: { status: 'possible_concern', concern: 'Visible dryness', observations: 'Dry.' } },
      });
      const root = await renderScreen('issue');
      const text = screenText(root);

      expect(text).toMatch(/photo was not analysed/i);
      expect(text).not.toMatch(/Visible dryness|Possible skin concern/);
      expect(scanSaves()).toHaveLength(0);
    }
  });

  it('shows the rejection message in Sinhala', async () => {
    mockServer({
      status: 422,
      body: {
        error: 'This photo cannot be assessed. Please retake it.',
        code: 'IMAGE_REJECTED',
        imageCheck: { isValid: false, reason: 'no_human_skin', imageCategory: 'animal' },
      },
    });
    const root = await renderScreen('issue', 'si');
    const text = screenText(root);

    expect(text).toContain(translate('si', 'imageCheck.title'));
    expect(text).toContain(translate('si', 'imageCheck.noHumanSkin'));
    expect(text).toContain(translate('si', 'imageCheck.noResult'));
    expect(text).not.toMatch(/retake|human skin/i);
    expect(scanSaves()).toHaveLength(0);
    setCurrentLanguage('en');
  });
});

describe('SkinResultScreen — Skin Type photo check', () => {
  const originalFetch = global.fetch;
  const mockAnalyseDosha = analyseDosha as jest.Mock<typeof analyseDosha>;

  beforeEach(() => {
    (RNFS.readFile as jest.Mock<() => Promise<string>>).mockResolvedValue('AAAA');
    mockAnalyseDosha.mockReset();
    mockAnalyseDosha.mockResolvedValue({ dosha: 'Pitta', confidence: 83 });
    mockRefreshUser.mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const checkRequests = () => fetchCalls.filter(call => call.url.endsWith('/api/v1/skin-image-check'));

  const expectNoSkinTypeResult = (text: string) => {
    expect(mockAnalyseDosha).not.toHaveBeenCalled();
    expect(text).not.toMatch(/Dosha prediction|Pitta|model confidence|Personalized skincare/);
    expect(scanSaves()).toHaveLength(0);
    expect(mockRefreshUser).not.toHaveBeenCalled();
  };

  it('checks a valid face photo on the server before classifying it on-device', async () => {
    mockServer({ status: 500, body: {} });
    const root = await renderScreen('type');
    const text = screenText(root);

    expect(checkRequests()).toHaveLength(1);
    expect(checkRequests()[0].body).toEqual({ imageBase64: 'AAAA', mimeType: 'image/jpeg' });
    expect(mockAnalyseDosha).toHaveBeenCalledTimes(1);
    expect(text).toMatch(/Pitta/);
    expect(scanSaves()).toHaveLength(1);
  });

  it.each([
    ['furniture', 'no_human_skin', /doesn't seem to show human skin/],
    ['landscape', 'no_human_skin', /doesn't seem to show human skin/],
    ['animal', 'no_human_skin', /doesn't seem to show human skin/],
    ['food', 'no_human_skin', /doesn't seem to show human skin/],
    ['document', 'no_human_skin', /doesn't seem to show human skin/],
    ['screenshot', 'no_human_skin', /doesn't seem to show human skin/],
    ['other_object', 'no_human_skin', /doesn't seem to show human skin/],
    ['human_skin', 'non_facial_skin', /needs a photo of your face/],
    ['human_face', 'multiple_faces', /more than one face/],
    ['human_face', 'face_not_visible', /couldn't see a face clearly/],
    ['human_face', 'poor_lighting', /too dark or too bright/],
    ['human_face', 'blurry', /The photo is blurry/],
    ['human_face', 'heavily_filtered', /filtered or edited/],
    ['unclear', 'unclear', /couldn't clearly check this photo/],
  ])('rejects a %s photo (%s) without classifying or saving it', async (imageCategory, reason, message) => {
    mockServer({ status: 500, body: {} }, { status: 200, body: { imageCheck: { isValid: false, reason, imageCategory } } });
    const root = await renderScreen('type');
    const text = screenText(root);

    expectNoSkinTypeResult(text);
    expect(text).toMatch(/Please retake this photo/);
    expect(text).toMatch(message);
    expect(text).toMatch(/No result was created and nothing was saved/);
    expect(text).not.toMatch(/Analysis Failed/);
  });

  it('the retake button returns to the camera screen', async () => {
    mockServer(
      { status: 500, body: {} },
      { status: 200, body: { imageCheck: { isValid: false, reason: 'no_human_skin', imageCategory: 'furniture' } } },
    );
    const goBack = jest.fn();
    const root = await renderScreen('type', undefined, { goBack } as never);
    const retake = root.root.findAll(
      node => node.props.title === 'Retake or Choose Another Photo' && typeof node.props.onPress === 'function',
    )[0];
    await act(async () => retake.props.onPress());
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('shows the Skin Type rejection in Sinhala', async () => {
    mockServer(
      { status: 500, body: {} },
      { status: 200, body: { imageCheck: { isValid: false, reason: 'non_facial_skin', imageCategory: 'human_skin' } } },
    );
    const root = await renderScreen('type', 'si');
    const text = screenText(root);

    expectNoSkinTypeResult(text);
    expect(text).toContain(translate('si', 'imageCheck.title'));
    expect(text).toContain(translate('si', 'imageCheck.nonFacialSkin'));
    expect(text).toContain(translate('si', 'imageCheck.retake'));
    setCurrentLanguage('en');
  });

  it.each([
    ['a malformed verdict', { imageCheck: { isValid: true } }],
    ['a contradictory verdict', { imageCheck: { isValid: true, reason: 'ok', imageCategory: 'furniture' } }],
    ['an unknown reason', { imageCheck: { isValid: false, reason: 'maybe', imageCategory: 'human_face' } }],
    ['a missing verdict', {}],
    ['a non-object verdict', { imageCheck: 'valid' }],
  ])('fails safe on %s: no classification, no save, retry offered', async (_label, body) => {
    mockServer({ status: 500, body: {} }, { status: 200, body });
    const root = await renderScreen('type');
    const text = screenText(root);

    expectNoSkinTypeResult(text);
    expect(text).toContain(translate('en', 'imageCheck.unavailable'));
    expect(text).toMatch(/Try Again/);
  });

  it('fails safe when Gemini is unavailable for the check', async () => {
    mockServer(
      { status: 500, body: {} },
      { status: 503, body: { error: 'AI guidance is temporarily unavailable.', code: 'GEMINI_UNAVAILABLE' } },
    );
    const root = await renderScreen('type');
    const text = screenText(root);

    expectNoSkinTypeResult(text);
    expect(text).toContain(translate('en', 'imageCheck.unavailable'));
    expect(text).not.toMatch(/Offline general guidance|GEMINI|undefined/);
  });

  it('fails safe in Sinhala when the check cannot be completed', async () => {
    mockServer(
      { status: 500, body: {} },
      { status: 503, body: { error: 'AI guidance is temporarily unavailable.', code: 'GEMINI_UNAVAILABLE' } },
    );
    const root = await renderScreen('type', 'si');
    const text = screenText(root);

    expectNoSkinTypeResult(text);
    expect(text).toContain(translate('si', 'imageCheck.unavailable'));
    setCurrentLanguage('en');
  });

  it('does not classify when the API cannot be reached', async () => {
    fetchCalls = [];
    (global as { fetch: unknown }).fetch = jest.fn(async (url: string) => {
      fetchCalls.push({ url, body: null });
      throw new TypeError('Network request failed');
    });
    const root = await renderScreen('type');
    const text = screenText(root);

    expectNoSkinTypeResult(text);
    expect(text).toMatch(/Analysis Failed/);
    expect(text).not.toMatch(/Network request failed/);
  });

  it('Try Again re-runs the check and classifies once the check succeeds', async () => {
    const replies: Reply[] = [
      { status: 503, body: { error: 'AI guidance is temporarily unavailable.', code: 'GEMINI_UNAVAILABLE' } },
      VALID_CHECK_REPLY,
    ];
    fetchCalls = [];
    (global as { fetch: unknown }).fetch = jest.fn(async (url: string, init?: { body?: string }) => {
      fetchCalls.push({ url, body: init?.body ? JSON.parse(init.body) : null });
      const reply = url.endsWith('/api/v1/skin-image-check') ? replies.shift()! : { status: 201, body: { user: { id: '1' } } };
      return { ok: reply.status < 300, status: reply.status, json: async () => reply.body };
    });
    const root = await renderScreen('type');
    expect(mockAnalyseDosha).not.toHaveBeenCalled();

    const tryAgain = root.root.findAll(
      node => node.props.title === 'Try Again' && typeof node.props.onPress === 'function',
    )[0];
    await act(async () => tryAgain.props.onPress());
    for (let i = 0; i < 5; i += 1) {
      await act(async () => {
        await new Promise<void>(resolve => setImmediate(() => resolve()));
      });
    }

    expect(mockAnalyseDosha).toHaveBeenCalledTimes(1);
    expect(screenText(root)).toMatch(/Pitta/);
    expect(scanSaves()).toHaveLength(1);
  });
});

describe('SkinResultScreen — TFLite Dosha classifier regression', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    (RNFS.readFile as jest.Mock<() => Promise<string>>).mockResolvedValue('AAAA');
  });

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
