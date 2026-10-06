import { describe, expect, it } from '@jest/globals';
import { ApiError } from '../src/services/apiClient';
import {
  isGeminiUnavailable,
  offlineDailyTip,
  offlineHerbalRecommendations,
  offlineSkinGuidance,
} from '../src/services/offlineFallbacks';

describe('offlineFallbacks', () => {
  it('returns labelled general skin guidance that says the photo was not analysed', () => {
    const result = offlineSkinGuidance();
    expect(result.kind).toBe('offline');
    expect(result.summary).toMatch(/photo was not analysed/i);
    expect(result.summary).toMatch(/general/i);
    expect(result.tips.length).toBeGreaterThan(0);
    expect(result.herbs.length).toBeGreaterThan(0);
  });

  it('does not manufacture a condition, severity, or confidence for offline guidance', () => {
    const result = offlineSkinGuidance() as unknown as Record<string, unknown>;
    expect(result).not.toHaveProperty('issue');
    expect(result).not.toHaveProperty('severity');
    expect(result).not.toHaveProperty('confidence');
    const text = JSON.stringify(result);
    expect(text).not.toMatch(/Detected Condition|Severity|\bMild\b|\bModerate\b|\bSevere\b|confidence|\d+\s*%/i);
  });

  it('matches known skin conditions to library herbs', () => {
    const herbs = offlineHerbalRecommendations('acne', 'Pitta');
    expect(herbs.some(herb => /neem|turmeric|sandalwood/i.test(herb.name))).toBe(true);
  });

  it('uses dosha lifestyle text for a daily tip', () => {
    expect(offlineDailyTip('Vata')).toMatch(/sleep|warm/i);
    expect(offlineDailyTip()).toMatch(/not a Gemini response/i);
  });

  it('recognises the machine-readable unavailable and unreachable codes', () => {
    expect(isGeminiUnavailable(new ApiError('AI guidance is temporarily unavailable.', 503, 'GEMINI_UNAVAILABLE'))).toBe(true);
    expect(isGeminiUnavailable(new ApiError('Could not reach the HerbalClinic API.', null, 'API_UNREACHABLE'))).toBe(true);
  });

  it('does not rely on human-readable text to decide on a fallback', () => {
    expect(isGeminiUnavailable(new Error('Gemini is not configured on the server'))).toBe(false);
    expect(isGeminiUnavailable(new ApiError('Something went wrong. Please try again.', 500, null))).toBe(false);
    expect(isGeminiUnavailable(new ApiError('Please enter a valid email address.', 400, null))).toBe(false);
    expect(isGeminiUnavailable(null)).toBe(false);
    expect(isGeminiUnavailable('GEMINI_UNAVAILABLE')).toBe(false);
  });
});
