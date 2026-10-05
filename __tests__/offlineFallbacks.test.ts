import { describe, expect, it } from '@jest/globals';
import {
  isGeminiUnavailable,
  offlineDailyTip,
  offlineHerbalRecommendations,
  offlineSkinIssue,
} from '../src/services/offlineFallbacks';

describe('offlineFallbacks', () => {
  it('returns labeled static skin guidance instead of a photo diagnosis', () => {
    const result = offlineSkinIssue();
    expect(result.confidence).toBe(0);
    expect(result.issue).toMatch(/guidance/i);
    expect(result.description).toMatch(/not an analysis/i);
    expect(result.herbs.length).toBeGreaterThan(0);
  });

  it('matches known skin conditions to library herbs', () => {
    const herbs = offlineHerbalRecommendations('acne', 'Pitta');
    expect(herbs.some(herb => /neem|turmeric|sandalwood/i.test(herb.name))).toBe(true);
  });

  it('uses dosha lifestyle text for a daily tip', () => {
    expect(offlineDailyTip('Vata')).toMatch(/sleep|warm/i);
  });

  it('detects Gemini and API outages', () => {
    expect(isGeminiUnavailable(new Error('Gemini is not configured on the server'))).toBe(true);
    expect(isGeminiUnavailable(new Error('Could not reach the HerbalClinic API'))).toBe(true);
    expect(isGeminiUnavailable(new Error('Please enter a valid email address.'))).toBe(false);
  });
});
