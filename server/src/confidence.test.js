const test = require('node:test');
const assert = require('node:assert/strict');
const { scoresToProbabilities, predictionFromScores } = require('./confidence');

test('does not apply softmax twice to a probability distribution', () => {
  const probabilities = scoresToProbabilities([0.1, 0.2, 0.7]);
  assert.ok(Math.abs(probabilities[2] - 0.7) < 0.001);
});

test('applies stable softmax to logits', () => {
  const probabilities = scoresToProbabilities([10, 0, 0]);
  assert.ok(probabilities[0] > 0.99);
  assert.ok(probabilities.every(value => value >= 0 && value <= 1));
  assert.ok(Math.abs(probabilities.reduce((sum, value) => sum + value, 0) - 1) < 1e-6);
});

test('maps the highest probability to the correct dosha label', () => {
  const result = predictionFromScores([0.05, 0.15, 0.8], ['Kapha', 'Pitta', 'Vata']);
  assert.equal(result.dosha, 'Vata');
  assert.equal(result.confidence, 80);
  assert.ok(result.confidence >= 0 && result.confidence <= 100);
});

test('rejects NaN, Infinity, empty, and mismatched class counts', () => {
  assert.throws(() => predictionFromScores([0.2, Number.NaN, 0.3], ['Kapha', 'Pitta', 'Vata']), /invalid class scores/);
  assert.throws(() => predictionFromScores([0.2, Infinity, 0.3], ['Kapha', 'Pitta', 'Vata']), /invalid class scores/);
  assert.throws(() => predictionFromScores([], ['Kapha', 'Pitta', 'Vata']), /no class scores|unexpected tensor/);
  assert.throws(
    () => predictionFromScores([0.1, 0.2, 0.3, 0.4], ['Kapha', 'Pitta', 'Vata']),
    /3 labels are configured/,
  );
});

test('refuses Balanced and unknown dosha labels', () => {
  assert.throws(
    () => predictionFromScores([0.1, 0.2, 0.3, 0.4], ['Balanced', 'Kapha', 'Pitta', 'Vata']),
    /Balanced is not supported/,
  );
  assert.throws(
    () => predictionFromScores([0.2, 0.8], ['Kapha', 'Unknown']),
    /Unsupported dosha label/,
  );
});
