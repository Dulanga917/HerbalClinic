const test = require('node:test');
const assert = require('node:assert/strict');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GEMINI_UNAVAILABLE, normaliseSkinGuidance } = require('./aiGuidance');
const gemini = require('./gemini');

const IMAGE = { imageBase64: 'AAAA', mimeType: 'image/jpeg' };

function withFakeModel(generateContent, run) {
  const original = GoogleGenerativeAI.prototype.getGenerativeModel;
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-placeholder-not-a-real-key';
  GoogleGenerativeAI.prototype.getGenerativeModel = () => ({ generateContent });
  return Promise.resolve()
    .then(run)
    .finally(() => {
      GoogleGenerativeAI.prototype.getGenerativeModel = original;
      if (originalKey === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = originalKey;
      }
    });
}

test('normaliseSkinGuidance drops severity, confidence, and model disclaimers', () => {
  const result = normaliseSkinGuidance({
    status: 'possible_concern',
    concern: '  Visible   dryness ',
    observations: 'Looks dry.',
    factors: ['Weather', 42, '', null],
    herbs: [{ name: 'Neem', emoji: '🌿', benefit: 'Cleansing', usage: 'Paste' }, 'bad', { emoji: '🌵' }],
    selfCare: ['Moisturise'],
    severity: 'Severe',
    confidence: 95,
    disclaimer: 'model text',
  });
  assert.deepEqual(result, {
    status: 'possible_concern',
    concern: 'Visible dryness',
    observations: 'Looks dry.',
    factors: ['Weather'],
    herbs: [{ name: 'Neem', emoji: '🌿', benefit: 'Cleansing', usage: 'Paste' }],
    selfCare: ['Moisturise'],
  });
});

test('normaliseSkinGuidance allows "unable to assess" and "no clear concern" without a condition', () => {
  const unclear = normaliseSkinGuidance({
    status: 'unable_to_assess',
    concern: 'Should be ignored',
    observations: 'The photo is blurry.',
  });
  assert.equal(unclear.status, 'unable_to_assess');
  assert.equal(unclear.concern, null);

  const clear = normaliseSkinGuidance({ status: 'no_clear_concern', selfCare: ['Keep hydrated'] });
  assert.equal(clear.status, 'no_clear_concern');
  assert.equal(clear.concern, null);
});

test('normaliseSkinGuidance handles missing or wrongly typed fields safely', () => {
  const result = normaliseSkinGuidance({
    status: 'diagnosed',
    observations: 'Some text.',
    factors: 'not-an-array',
    herbs: { name: 'Neem' },
    selfCare: undefined,
  });
  assert.deepEqual(result, {
    status: 'unable_to_assess',
    concern: null,
    observations: 'Some text.',
    factors: [],
    herbs: [],
    selfCare: [],
  });
  for (const raw of [null, undefined, 'text', 7, [], {}, { status: 'possible_concern' }]) {
    assert.equal(normaliseSkinGuidance(raw), null, `expected null for ${JSON.stringify(raw)}`);
  }
});

test('prompt no longer forces a condition, severity, confidence, or dermatologist persona', () => {
  const prompt = gemini.SKIN_ISSUE_PROMPT;
  assert.doesNotMatch(prompt, /"severity"|"confidence"|Mild\|Moderate\|Severe|expert .*dermatolog/i);
  assert.match(prompt, /unable_to_assess/);
  assert.match(prompt, /no_clear_concern/);
  assert.match(prompt, /must not diagnose/i);
});

test('English prompts are unchanged and Sinhala only appends a language instruction', () => {
  assert.equal(gemini.withLanguage(gemini.SKIN_ISSUE_PROMPT, 'en'), gemini.SKIN_ISSUE_PROMPT);
  assert.equal(gemini.withLanguage(gemini.SKIN_ISSUE_PROMPT, undefined), gemini.SKIN_ISSUE_PROMPT);

  const sinhala = gemini.withLanguage(gemini.SKIN_ISSUE_PROMPT, 'si');
  assert.ok(sinhala.startsWith(gemini.SKIN_ISSUE_PROMPT), 'every English safety rule is kept first');
  assert.match(sinhala, /Sinhala/);
  assert.match(sinhala, /Keep all JSON keys, the "status" values/);
  assert.match(sinhala, /no diagnosis/i);
  assert.match(sinhala, /confidence scores/i);
  assert.match(sinhala, /only when you are certain/i);
  assert.doesNotMatch(sinhala, /"severity"|"confidence"/);

  const herbsEn = gemini.herbalRecommendationsPrompt('Acne', 'Pitta');
  assert.doesNotMatch(herbsEn, /Sinhala/);
  assert.match(gemini.herbalRecommendationsPrompt('Acne', 'Pitta', 'si'), /Sinhala/);
  assert.doesNotMatch(gemini.dailyTipPrompt(null, 'en'), /Sinhala/);
  assert.match(gemini.dailyTipPrompt('Vata', 'si'), /for Vata dosha[\s\S]*Sinhala/);
});

test('the Sinhala skin prompt is what reaches the provider and keeps the same response handling', async () => {
  let sent;
  const body = { status: 'no_clear_concern', observations: 'සම සමබරව පෙනේ.' };
  await withFakeModel(
    async request => {
      sent = request;
      return { response: { text: () => JSON.stringify(body) } };
    },
    async () => {
      assert.deepEqual(await gemini.analyseSkinIssue({ ...IMAGE, language: 'si' }), body);
    },
  );
  assert.ok(sent[0].startsWith(gemini.SKIN_ISSUE_PROMPT));
  assert.match(sent[0], /Sinhala/);
  assert.equal(sent[1].inlineData.mimeType, 'image/jpeg');
});

test('missing or placeholder key throws GEMINI_UNAVAILABLE without key details', async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  try {
    for (const value of [undefined, '', 'your_gemini_api_key_here']) {
      if (value === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = value;
      }
      await assert.rejects(gemini.analyseSkinIssue(IMAGE), error => {
        assert.equal(error.code, GEMINI_UNAVAILABLE);
        assert.equal(error.status, 503);
        assert.doesNotMatch(error.message, /GEMINI_API_KEY|key/i);
        return true;
      });
    }
  } finally {
    if (originalKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalKey;
    }
  }
});

test('invalid key, provider outage, and unparseable output all map to GEMINI_UNAVAILABLE', async () => {
  const failures = [
    async () => {
      throw Object.assign(new Error('[400 Bad Request] API key not valid. [API_KEY_INVALID]'), { status: 400 });
    },
    async () => {
      throw Object.assign(new Error('[503 Service Unavailable] The model is overloaded.'), { status: 503 });
    },
    async () => {
      throw new Error('Error fetching from https://generativelanguage.googleapis.com: fetch failed');
    },
    async () => ({ response: { text: () => 'this is not json' } }),
  ];
  for (const generateContent of failures) {
    await withFakeModel(generateContent, () =>
      assert.rejects(gemini.analyseSkinIssue(IMAGE), error => {
        assert.equal(error.code, GEMINI_UNAVAILABLE);
        assert.equal(error.message, 'AI guidance is temporarily unavailable.');
        return true;
      }),
    );
  }
});

test('a parseable provider response is returned for the route to normalise', async () => {
  const body = { status: 'no_clear_concern', observations: 'Even tone.' };
  await withFakeModel(
    async () => ({ response: { text: () => `\`\`\`json\n${JSON.stringify(body)}\n\`\`\`` } }),
    async () => {
      assert.deepEqual(await gemini.analyseSkinIssue(IMAGE), body);
    },
  );
});
