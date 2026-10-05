const SHIPPED_DOSHA_LABELS = ['Kapha', 'Pitta', 'Vata'];
const SUPPORTED_LABELS = new Set(SHIPPED_DOSHA_LABELS);

function flattenClassScores(scores) {
  if (scores == null || typeof scores.length !== 'number') {
    throw new Error('The model returned an unexpected tensor shape.');
  }

  const values = Array.from(scores, Number);
  if (!values.length) {
    throw new Error('The model returned no class scores.');
  }
  if (values.length > 16) {
    throw new Error('The model returned an unexpected tensor shape.');
  }
  if (!values.every(Number.isFinite)) {
    throw new Error('The model returned invalid class scores.');
  }

  return values;
}

function assertCompatibleDoshaLabels(labels) {
  if (!labels.length) {
    throw new Error('No dosha labels are configured.');
  }

  const unique = new Set(labels);
  if (unique.size !== labels.length) {
    throw new Error('Dosha labels must be unique.');
  }

  if (labels.some(label => String(label).toLowerCase() === 'balanced')) {
    throw new Error('Balanced is not supported until a verified 4-class model is shipped.');
  }

  for (const label of labels) {
    if (!SUPPORTED_LABELS.has(label)) {
      throw new Error(
        `Unsupported dosha label "${label}". The shipped model only maps Kapha, Pitta, and Vata.`,
      );
    }
  }

  return labels;
}

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
  const values = flattenClassScores(scores);

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
  const compatibleLabels = assertCompatibleDoshaLabels(labels);
  const values = flattenClassScores(scores);

  if (values.length !== compatibleLabels.length) {
    throw new Error(
      `The model returned ${values.length} scores, but ${compatibleLabels.length} labels are configured.`,
    );
  }

  const probabilities = scoresToProbabilities(values);
  if (probabilities.length !== compatibleLabels.length) {
    throw new Error(
      `The model returned ${probabilities.length} scores, but ${compatibleLabels.length} labels are configured.`,
    );
  }

  let bestIndex = 0;
  for (let index = 1; index < probabilities.length; index += 1) {
    if (probabilities[index] > probabilities[bestIndex]) {
      bestIndex = index;
    }
  }

  const dosha = compatibleLabels[bestIndex];
  if (!dosha) {
    throw new Error('The model result could not be mapped to a Dosha label.');
  }

  return {
    dosha,
    confidence: Math.max(0, Math.min(100, Math.round(probabilities[bestIndex] * 100))),
    probabilities,
  };
}

module.exports = {
  SHIPPED_DOSHA_LABELS,
  flattenClassScores,
  assertCompatibleDoshaLabels,
  softmax,
  scoresToProbabilities,
  predictionFromScores,
};
