import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import RNFS from 'react-native-fs';
import geminiService from '../src/services/geminiService';
import { analyseSkinIssueRemote, ApiError } from '../src/services/apiClient';

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
      mockFetch({ status: 200, body: { analysis } });
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

  it('returns validated live guidance without any confidence or severity field', async () => {
    mockFetch({
      status: 200,
      body: {
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
