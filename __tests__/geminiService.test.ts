import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import RNFS from 'react-native-fs';
import geminiService from '../src/services/geminiService';
import { analyseSkinIssueRemote, ApiError } from '../src/services/apiClient';
import { ImageCheckUnavailableError, ImageRejectedError } from '../src/utils/imageCheck';

jest.mock('../src/services/sessionStorage', () => ({
  getSessionToken: jest.fn(async () => 'test-session'),
}));

type FetchResult = { status: number; body: unknown } | Error;

const mockFetch = (result: FetchResult) => {
  (global as { fetch: unknown }).fetch = jest.fn(async () => {
    if (result instanceof Error) {
      throw result;
    }
    return {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      json: async () => result.body,
    };
  });
};

const UNAVAILABLE = {
  status: 503,
  body: { error: 'AI guidance is temporarily unavailable.', code: 'GEMINI_UNAVAILABLE' },
};

const VALID_CHECK = { isValid: true, reason: 'ok', imageCategory: 'human_face' };

describe('geminiService skin guidance', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    (RNFS.readFile as jest.Mock<() => Promise<string>>).mockResolvedValue('AAAA');
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('carries the GEMINI_UNAVAILABLE code on the thrown API error', async () => {
    mockFetch(UNAVAILABLE);
    const error = await analyseSkinIssueRemote('t', 'AAAA').catch(e => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('GEMINI_UNAVAILABLE');
    expect(error.status).toBe(503);
  });

  it('falls back to offline guidance when the server reports a missing Gemini key', async () => {
    mockFetch(UNAVAILABLE);
    const result = await geminiService.analyseSkinIssue('file:///photo.jpg');
    expect(result.kind).toBe('offline');
    if (result.kind === 'offline') {
      expect(result.summary).toMatch(/photo was not analysed/i);
    }
  });

  it('falls back to offline guidance when the API cannot be reached', async () => {
    mockFetch(new TypeError('Network request failed'));
    const result = await geminiService.analyseSkinIssue('file:///photo.jpg');
    expect(result.kind).toBe('offline');
  });

  it('falls back to offline guidance when the response is malformed', async () => {
    for (const analysis of [undefined, 'text', [], { issue: 'Eczema', severity: 'Severe', confidence: 99 }]) {
      mockFetch({ status: 200, body: { imageCheck: VALID_CHECK, analysis } });
      const result = await geminiService.analyseSkinIssue('file:///photo.jpg');
      expect(result.kind).toBe('offline');
    }
  });

  it('does not treat an ordinary server error as "unavailable"', async () => {
    mockFetch({ status: 500, body: { error: 'Something went wrong. Please try again.' } });
    await expect(geminiService.analyseSkinIssue('file:///photo.jpg')).rejects.toThrow(
      'Something went wrong. Please try again.',
    );
  });

  const sinhalaAnalysis = {
    status: 'possible_concern',
    concern: 'පෙනෙන වියළි බව',
    observations: 'සම මඳක් වියළි ලෙස පෙනේ.',
    factors: ['වියළි කාලගුණය'],
    herbs: [{ name: 'Aloe Vera', emoji: '🌵', benefit: 'සමට සිසිලසක් ලබා දෙයි', usage: 'ජෙල් ස්වල්පයක් ආලේප කරන්න' }],
    selfCare: ['දිනපතා සම තෙත් කරන්න'],
  };

  it('returns complete Sinhala guidance as live, tagged with its language and verified herb names', async () => {
    mockFetch({ status: 200, body: { imageCheck: VALID_CHECK, analysis: sinhalaAnalysis } });
    const result = await geminiService.analyseSkinIssue('file:///photo.jpg', 'si');
    expect(result.kind).toBe('live');
    if (result.kind === 'live') {
      expect(result.language).toBe('si');
      expect(result.observations).toBe('සම මඳක් වියළි ලෙස පෙනේ.');
      expect(result.herbs[0].name).toBe('කෝමාරිකා');
    }
  });

  it('uses the Sinhala offline fallback when Sinhala guidance comes back in English', async () => {
    mockFetch({
      status: 200,
      body: {
        imageCheck: VALID_CHECK,
        analysis: { status: 'no_clear_concern', observations: 'The skin tone looks even.', factors: ['Dry weather'] },
      },
    });
    const result = await geminiService.analyseSkinIssue('file:///photo.jpg', 'si');
    expect(result.kind).toBe('offline');
    if (result.kind === 'offline') {
      expect(result.summary).toMatch(/[\u0D80-\u0DFF]/);
      expect(result.summary).not.toMatch(/even/);
    }
  });

  it('uses the offline fallback when one nested Sinhala field is still English', async () => {
    mockFetch({
      status: 200,
      body: {
        imageCheck: VALID_CHECK,
        analysis: {
          ...sinhalaAnalysis,
          herbs: [{ ...sinhalaAnalysis.herbs[0], usage: 'Apply a little fresh gel to the dry area' }],
        },
      },
    });
    expect((await geminiService.analyseSkinIssue('file:///photo.jpg', 'si')).kind).toBe('offline');
  });

  it('tags English live guidance with English', async () => {
    mockFetch({
      status: 200,
      body: { imageCheck: VALID_CHECK, analysis: { status: 'no_clear_concern', observations: 'Even tone.' } },
    });
    const result = await geminiService.analyseSkinIssue('file:///photo.jpg', 'en');
    expect(result.kind === 'live' && result.language).toBe('en');
  });

  it('returns validated live guidance without any confidence or severity field', async () => {
    mockFetch({
      status: 200,
      body: {
        imageCheck: VALID_CHECK,
        analysis: {
          status: 'possible_concern',
          concern: 'Visible dryness',
          observations: 'Looks dry.',
          confidence: 97,
          severity: 'Severe',
        },
      },
    });
    const result = await geminiService.analyseSkinIssue('file:///photo.jpg');
    expect(result.kind).toBe('live');
    expect(result).not.toHaveProperty('confidence');
    expect(result).not.toHaveProperty('severity');
    expect(result).not.toHaveProperty('imageCheck');
  });

  it('throws ImageRejectedError for a 422 rejection instead of returning any guidance', async () => {
    const rejectedCheck = { isValid: false, reason: 'no_human_skin', imageCategory: 'furniture' };
    mockFetch({
      status: 422,
      body: { error: 'This photo cannot be assessed. Please retake it.', code: 'IMAGE_REJECTED', imageCheck: rejectedCheck },
    });
    const error = await geminiService.analyseSkinIssue('file:///photo.jpg').catch(e => e);
    expect(error).toBeInstanceOf(ImageRejectedError);
    expect(error.imageCheck).toEqual(rejectedCheck);
  });

  it('throws ImageRejectedError when a 200 response carries an invalid image check', async () => {
    mockFetch({
      status: 200,
      body: {
        imageCheck: { isValid: false, reason: 'poor_lighting', imageCategory: 'human_face' },
        analysis: { status: 'no_clear_concern', observations: 'Even tone.' },
      },
    });
    const error = await geminiService.analyseSkinIssue('file:///photo.jpg').catch(e => e);
    expect(error).toBeInstanceOf(ImageRejectedError);
    expect(error.imageCheck.reason).toBe('poor_lighting');
  });

  it('never shows live guidance without a well-formed passing image check', async () => {
    for (const imageCheck of [
      undefined,
      null,
      'ok',
      { isValid: true },
      { isValid: 'true', reason: 'ok', imageCategory: 'human_face' },
      { isValid: true, reason: 'ok', imageCategory: 'animal' },
      { isValid: true, reason: 'blurry', imageCategory: 'human_face' },
    ]) {
      mockFetch({ status: 200, body: { imageCheck, analysis: { status: 'no_clear_concern', observations: 'Even tone.' } } });
      expect((await geminiService.analyseSkinIssue('file:///photo.jpg')).kind).toBe('offline');
    }
  });
});

describe('geminiService Skin Type photo check', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    (RNFS.readFile as jest.Mock<() => Promise<string>>).mockResolvedValue('AAAA');
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('resolves only for a valid single-face verdict', async () => {
    mockFetch({ status: 200, body: { imageCheck: VALID_CHECK } });
    await expect(geminiService.checkSkinTypePhoto('file:///photo.jpg')).resolves.toEqual(VALID_CHECK);
  });

  it.each(['furniture', 'animal', 'document', 'landscape', 'food', 'screenshot', 'other_object'])(
    'rejects a %s photo',
    async imageCategory => {
      mockFetch({ status: 200, body: { imageCheck: { isValid: false, reason: 'no_human_skin', imageCategory } } });
      const error = await geminiService.checkSkinTypePhoto('file:///photo.jpg').catch(e => e);
      expect(error).toBeInstanceOf(ImageRejectedError);
      expect(error.imageCheck).toEqual({ isValid: false, reason: 'no_human_skin', imageCategory });
    },
  );

  it('rejects poor-quality and non-facial photos with their reason', async () => {
    for (const [reason, imageCategory] of [
      ['poor_lighting', 'human_face'],
      ['blurry', 'human_face'],
      ['heavily_filtered', 'human_face'],
      ['non_facial_skin', 'human_skin'],
      ['multiple_faces', 'human_face'],
    ]) {
      mockFetch({ status: 200, body: { imageCheck: { isValid: false, reason, imageCategory } } });
      const error = await geminiService.checkSkinTypePhoto('file:///photo.jpg').catch(e => e);
      expect(error).toBeInstanceOf(ImageRejectedError);
      expect(error.imageCheck.reason).toBe(reason);
    }
  });

  it('treats malformed, contradictory, or missing verdicts as unavailable, never as valid', async () => {
    for (const body of [
      {},
      { imageCheck: null },
      { imageCheck: { isValid: true } },
      { imageCheck: { isValid: true, reason: 'ok', imageCategory: 'furniture' } },
      { imageCheck: { isValid: true, reason: 'blurry', imageCategory: 'human_face' } },
      { imageCheck: { isValid: false, reason: 'ok', imageCategory: 'human_face' } },
      { imageCheck: { isValid: false, reason: 'no_human_skin', imageCategory: 'chair' } },
    ]) {
      mockFetch({ status: 200, body });
      const error = await geminiService.checkSkinTypePhoto('file:///photo.jpg').catch(e => e);
      expect(error).toBeInstanceOf(ImageCheckUnavailableError);
    }
  });

  it('turns a Gemini outage or unreachable API into ImageCheckUnavailableError', async () => {
    mockFetch(UNAVAILABLE);
    await expect(geminiService.checkSkinTypePhoto('file:///photo.jpg')).rejects.toBeInstanceOf(
      ImageCheckUnavailableError,
    );
    mockFetch(new TypeError('Network request failed'));
    await expect(geminiService.checkSkinTypePhoto('file:///photo.jpg')).rejects.toBeInstanceOf(
      ImageCheckUnavailableError,
    );
  });

  it('passes other server errors through unchanged', async () => {
    mockFetch({ status: 429, body: { error: 'Too many analysis requests. Please wait a minute and try again.' } });
    const error = await geminiService.checkSkinTypePhoto('file:///photo.jpg').catch(e => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(429);
  });
});

describe('geminiService herb and tip validation', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('uses offline herbs when the herb list is not an array of herb objects', async () => {
    mockFetch({ status: 200, body: { herbs: 'oops' } });
    const result = await geminiService.getHerbalRecommendations('acne');
    expect(result.offline).toBe(true);
    expect(result.herbs.length).toBeGreaterThan(0);
  });

  it('uses the offline tip when the tip is not a string', async () => {
    mockFetch({ status: 200, body: { tip: 5 } });
    const result = await geminiService.getDailyTip('Vata');
    expect(result.offline).toBe(true);
    expect(typeof result.tip).toBe('string');
  });

  it('uses offline herbs and tip for the GEMINI_UNAVAILABLE contract', async () => {
    mockFetch(UNAVAILABLE);
    expect((await geminiService.getHerbalRecommendations('acne')).offline).toBe(true);
    expect((await geminiService.getDailyTip()).offline).toBe(true);
  });
});
