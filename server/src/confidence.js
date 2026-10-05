function softmax(values) {
  const max = Math.max(...values);
  const exps = values.map(value => Math.exp(value - max));
  const sum = exps.reduce((total, value) => total + value, 0);
  if (!Number.isFinite(sum) || sum <= 0) {
    throw new Error('Could not normalize model scores.');
  }
  return exps.map(value => value / sum);
}

function scoresToProbabilities(scores) {
  const values = Array.from(scores, Number);
  if (!values.length || !values.every(Number.isFinite)) {
    throw new Error('The model returned invalid class scores.');
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const sum = values.reduce((total, value) => total + value, 0);
  const looksLikeProbabilities = min >= 0 && max <= 1.0001 && Math.abs(sum - 1) < 0.05;

  if (looksLikeProbabilities) {
    return values.map(value => value / sum);
  }

  if (min >= 0 && max <= 1.0001 && sum > 0) {
    return values.map(value => value / sum);
  }

  return softmax(values);
}

function predictionFromScores(scores, labels) {
  const probabilities = scoresToProbabilities(scores);
  if (probabilities.length !== labels.length) {
    throw new Error(
      `The model returned ${probabilities.length} scores, but ${labels.length} labels are configured.`,
    );
  }

  let bestIndex = 0;
  for (let index = 1; index < probabilities.length; index += 1) {
    if (probabilities[index] > probabilities[bestIndex]) {
      bestIndex = index;
    }
  }

  return {
    dosha: labels[bestIndex],
    confidence: Math.max(0, Math.min(100, Math.round(probabilities[bestIndex] * 100))),
    probabilities,
  };
}

module.exports = {
  softmax,
  scoresToProbabilities,
  predictionFromScores,
};
