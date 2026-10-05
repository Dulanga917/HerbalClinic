import { it, expect } from '@jest/globals';
import { predictionFromScores, scoresToProbabilities } from '../src/utils/doshaScores';
import { validatePassword } from '../src/constants/passwordPolicy';

it('does not treat logits as percentages', () => {
  const result = predictionFromScores([2.0, 0.1, -1], ['Kapha', 'Pitta', 'Vata']);
  expect(result.dosha).toBe('Kapha');
  expect(result.confidence).toBeGreaterThanOrEqual(0);
  expect(result.confidence).toBeLessThanOrEqual(100);
  expect(result.confidence).not.toBe(200);
});

it('keeps a probability distribution without applying softmax twice', () => {
  const probabilities = scoresToProbabilities([0.1, 0.2, 0.7]);
  expect(probabilities[2]).toBeCloseTo(0.7, 3);
});

it('maps labels in dosha-labels.json order', () => {
  const result = predictionFromScores([0.05, 0.1, 0.85], ['Kapha', 'Pitta', 'Vata']);
  expect(result.dosha).toBe('Vata');
  expect(result.confidence).toBe(85);
});

it('fails safely on invalid model output instead of mapping the wrong Dosha', () => {
  expect(() => predictionFromScores([0.2, Number.NaN, 0.4], ['Kapha', 'Pitta', 'Vata'])).toThrow(
    /invalid class scores/,
  );
  expect(() => predictionFromScores([1, 2, 3, 4], ['Kapha', 'Pitta', 'Vata'])).toThrow(
    /3 labels are configured/,
  );
  expect(() =>
    predictionFromScores([0.25, 0.25, 0.25, 0.25], ['Balanced', 'Kapha', 'Pitta', 'Vata']),
  ).toThrow(/Balanced is not supported/);
});

it('rejects passwords shorter than 8 characters', () => {
  const result = validatePassword('1234567');
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.message).toMatch(/at least 8 characters/i);
  }
});
