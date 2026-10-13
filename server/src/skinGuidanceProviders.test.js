const test = require('node:test');
const assert = require('node:assert/strict');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const gemini = require('./gemini');
const { GEMINI_UNAVAILABLE, QUOTA_EXCEEDED } = require('./aiGuidance');
const { GEMINI_BEFORE_BACKUP_POLICY, analyseSkinGuidance } = require('./skinGuidanceProviders');

const VALID_CHECK = {
  isValid: true,
  imageCategory: 'human_skin',
  humanSkinVisible: true,
  faceCount: 0,
  quality: 'good',
  reason: 'ok',
};
const ENGLISH = {
  imageCheck: VALID_CHECK,
  status: 'possible_concern',
  concern: 'Visible dryness',
  observations: 'The skin looks a little dry.',
  factors: ['Dry weather'],
  herbs: [{ name: 'Aloe Vera', emoji: '🌵', benefit: 'Soothing', usage: 'Apply a little gel' }],
  selfCare: ['Moisturise daily'],
};
const SINHALA = {
  imageCheck: VALID_CHECK,
  status: 'no_clear_concern',
  observations: 'සම සමබරව පෙනේ.',
  selfCare: ['දිනපතා සම තෙත් කරන්න'],
};
const REJECTED = {
  ...ENGLISH,
  imageCheck: { isValid: false, imageCategory: 'screenshot', humanSkinVisible: true, faceCount: 3, quality: 'obstructed', reason: 'unclear' },
};
const INPUT = { imageBase64: 'AAAA', mimeType: 'image/jpeg', language: 'en' };

const unavailable = (reason) =>
  Object.assign(new Error('AI guidance is temporarily unavailable.'), {
    status: 503,
    code: GEMINI_UNAVAILABLE,
    ...(reason ? { reason } : {}),
  });

// Plays the given outputs in order (an Error is thrown) and records every call.
function fakeProvider(outputs, { configured = true } = {}) {
  const calls = [];
  return {
    calls,
    isConfigured: () => configured,
    analyseSkinIssue: async (input, options) => {
      calls.push({ input, options });
      const output = outputs[Math.min(calls.length, outputs.length) - 1];
      if (output instanceof Error) {
        throw output;
      }
      return output;
    },
  };
}

function quietly(run) {
  const original = console.warn;
  const logs = [];
  console.warn = (...args) => logs.push(args.join(' '));
  return Promise.resolve()
    .then(() => run(logs))
    .finally(() => {
      console.warn = original;
    });
}

// Runs the real gemini module against a fake Google model, with a short timeout for the test.
function withRealGemini(generateContent, run) {
  const original = GoogleGenerativeAI.prototype.getGenerativeModel;
  const originalKey = process.env.GEMINI_API_KEY;
  const originalTimeout = GEMINI_BEFORE_BACKUP_POLICY.attemptTimeoutMs;
  const calls = [];
  process.env.GEMINI_API_KEY = 'test-placeholder-not-a-real-key';
  GEMINI_BEFORE_BACKUP_POLICY.attemptTimeoutMs = 50;
  GoogleGenerativeAI.prototype.getGenerativeModel = () => ({
    generateContent: async (request, options) => {
      calls.push(options);
      return generateContent(options);
    },
  });
  return quietly(logs => run({ calls, logs })).finally(() => {
    GoogleGenerativeAI.prototype.getGenerativeModel = original;
    GEMINI_BEFORE_BACKUP_POLICY.attemptTimeoutMs = originalTimeout;
    if (originalKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });
}

const httpError = status => Object.assign(new Error(`[${status}] provider said no`), { status });

test('production policy: one 5 s Gemini attempt before switching to the backup', () => {
  assert.deepEqual(GEMINI_BEFORE_BACKUP_POLICY, { maxAttempts: 1, attemptTimeoutMs: 5000 });
});

test('Gemini success with consent: Gemini answers under the short policy and Groq is not called', async () => {
  const primary = fakeProvider([ENGLISH]);
  const backup = fakeProvider([ENGLISH]);
  const result = await analyseSkinGuidance({ gemini: primary, backup }, INPUT, { allowBackupProvider: true });
  assert.equal(result.provider, 'gemini');
  assert.equal(result.backup, 'not_needed');
  assert.equal(result.guidance.concern, 'Visible dryness');
  assert.deepEqual(primary.calls[0].options, { maxAttempts: 1, attemptTimeoutMs: 5000 });
  assert.equal(backup.calls.length, 0);
});

test('without consent Gemini keeps its existing retry policy and Groq is never called', async () => {
  const primary = fakeProvider([ENGLISH]);
  const backup = fakeProvider([ENGLISH]);
  const result = await analyseSkinGuidance({ gemini: primary, backup }, INPUT);
  assert.equal(result.provider, 'gemini');
  assert.equal(result.backup, 'not_allowed');
  assert.equal(primary.calls[0].options, undefined);

  const failing = fakeProvider([unavailable()]);
  await assert.rejects(analyseSkinGuidance({ gemini: failing, backup }, INPUT, { allowBackupProvider: false }), error => {
    assert.equal(error.code, GEMINI_UNAVAILABLE);
    assert.equal(error.backup, 'not_allowed');
    return true;
  });
  assert.equal(backup.calls.length, 0, 'no photo is sent to Groq without consent');
});

test('consent without a configured Groq key behaves like no backup', async () => {
  const backup = fakeProvider([ENGLISH], { configured: false });
  const primary = fakeProvider([unavailable()]);
  await assert.rejects(analyseSkinGuidance({ gemini: primary, backup }, INPUT, { allowBackupProvider: true }), error => {
    assert.equal(error.backup, 'not_configured');
    return true;
  });
  assert.equal(primary.calls[0].options, undefined, 'Gemini keeps its normal policy when there is nothing to switch to');
  assert.equal(backup.calls.length, 0);
});

for (const [label, step] of [
  ['HTTP 503', () => { throw httpError(503); }],
  ['HTTP 429 (quota)', () => { throw httpError(429); }],
  ['HTTP 500', () => { throw httpError(500); }],
  ['a network error', () => { throw new Error('[GoogleGenerativeAI Error]: Error fetching: fetch failed'); }],
  ['a timeout', () => new Promise(() => {})],
  ['unparseable output', () => ({ response: { text: () => 'not json' } })],
]) {
  test(`Gemini ${label} switches to Groq after a single attempt`, async () => {
    const backup = fakeProvider([ENGLISH]);
    await withRealGemini(step, async ({ calls, logs }) => {
      const startedAt = Date.now();
      const result = await analyseSkinGuidance({ gemini, backup }, INPUT, { allowBackupProvider: true });
      assert.equal(result.provider, 'groq');
      assert.equal(result.backup, 'used');
      assert.equal(result.guidance.concern, 'Visible dryness');
      assert.equal(calls.length, 1, 'Gemini is not retried before switching');
      assert.ok(Date.now() - startedAt < 1000);
      assert.equal(backup.calls.length, 1);
      assert.deepEqual(backup.calls[0].input, INPUT, 'Groq gets the same validated photo and language');
      assert.match(logs[0], /attempt=1\/1|category=unusable_response/);
    });
  });
}

test('a Gemini timeout cancels the Gemini request before Groq is asked', async () => {
  const backup = fakeProvider([ENGLISH]);
  await withRealGemini(
    () => new Promise(() => {}),
    async ({ calls, logs }) => {
      await analyseSkinGuidance({ gemini, backup }, INPUT, { allowBackupProvider: true });
      assert.equal(calls[0].signal.aborted, true);
      assert.match(logs[0], /category=timeout/);
    },
  );
});

test('unusable Gemini guidance (no valid image check) switches to Groq', async () => {
  const { imageCheck, ...noCheck } = ENGLISH;
  assert.ok(imageCheck);
  const primary = fakeProvider([noCheck]);
  const backup = fakeProvider([ENGLISH]);
  const result = await analyseSkinGuidance({ gemini: primary, backup }, INPUT, { allowBackupProvider: true });
  assert.equal(result.provider, 'groq');
});

test('Gemini Sinhala that stays in English (after its one regeneration) switches to Groq', async () => {
  const primary = fakeProvider([ENGLISH, ENGLISH]);
  const backup = fakeProvider([SINHALA]);
  await quietly(async () => {
    const result = await analyseSkinGuidance({ gemini: primary, backup }, { ...INPUT, language: 'si' }, { allowBackupProvider: true });
    assert.equal(result.provider, 'groq');
    assert.equal(result.guidance.observations, 'සම සමබරව පෙනේ.');
  });
  assert.equal(primary.calls.length, 2);
  assert.deepEqual(primary.calls[1].options, { maxAttempts: 1, attemptTimeoutMs: 5000 });
});

test('a Gemini image rejection is final: no Groq call and the retake verdict is kept', async () => {
  const primary = fakeProvider([REJECTED]);
  const backup = fakeProvider([ENGLISH]);
  await quietly(() =>
    assert.rejects(analyseSkinGuidance({ gemini: primary, backup }, INPUT, { allowBackupProvider: true }), error => {
      assert.equal(error.code, 'IMAGE_REJECTED');
      assert.equal(error.backup, 'not_needed');
      return true;
    }),
  );
  assert.equal(backup.calls.length, 0);
});

test('Groq guidance goes through the same normaliser: severity and confidence are dropped', async () => {
  const primary = fakeProvider([unavailable()]);
  const backup = fakeProvider([{ ...ENGLISH, severity: 'Severe', confidence: 97, diagnosis: 'Eczema' }]);
  const result = await analyseSkinGuidance({ gemini: primary, backup }, INPUT, { allowBackupProvider: true });
  assert.deepEqual(Object.keys(result.guidance).sort(), ['concern', 'factors', 'herbs', 'observations', 'selfCare', 'status']);
  assert.doesNotMatch(JSON.stringify(result), /Severe|97|Eczema/);
});

test('a Groq rejection is not trusted as a verdict: it ends as unavailable, never as a retake', async () => {
  const primary = fakeProvider([unavailable()]);
  const backup = fakeProvider([REJECTED]);
  await quietly(() =>
    assert.rejects(analyseSkinGuidance({ gemini: primary, backup }, INPUT, { allowBackupProvider: true }), error => {
      assert.equal(error.code, GEMINI_UNAVAILABLE);
      assert.equal(error.stage, 'backup_rejected_photo');
      assert.equal(error.backup, 'failed');
      assert.equal(error.imageCheck, undefined);
      return true;
    }),
  );
});

test('both providers failing ends as GEMINI_UNAVAILABLE and keeps the Gemini quota reason', async () => {
  const primary = fakeProvider([unavailable(QUOTA_EXCEEDED)]);
  const backup = fakeProvider([unavailable()]);
  await assert.rejects(analyseSkinGuidance({ gemini: primary, backup }, INPUT, { allowBackupProvider: true }), error => {
    assert.equal(error.code, GEMINI_UNAVAILABLE);
    assert.equal(error.reason, QUOTA_EXCEEDED);
    assert.equal(error.stage, 'backup');
    assert.equal(error.backup, 'failed');
    return true;
  });
  assert.equal(backup.calls.length, 1, 'Groq is tried exactly once');
});

test('unusable or wrong-language Groq guidance also ends as unavailable', async () => {
  const primary = fakeProvider([unavailable()]);
  const unusable = fakeProvider([{ issue: 'Eczema' }]);
  await assert.rejects(analyseSkinGuidance({ gemini: primary, backup: unusable }, INPUT, { allowBackupProvider: true }), error => {
    assert.equal(error.stage, 'backup_unusable_guidance');
    return true;
  });

  const english = fakeProvider([ENGLISH, ENGLISH]);
  await quietly(() =>
    assert.rejects(
      analyseSkinGuidance({ gemini: fakeProvider([unavailable()]), backup: english }, { ...INPUT, language: 'si' }, { allowBackupProvider: true }),
      error => error.stage === 'backup_unusable_guidance',
    ),
  );
  assert.equal(english.calls.length, 2, 'Groq gets the same single strict-language regeneration');
  assert.equal(english.calls[1].input.strictLanguage, true);
});

test('allowBackupProvider must be exactly true', async () => {
  for (const value of [undefined, false, 'true', 1, {}]) {
    const backup = fakeProvider([ENGLISH]);
    await assert.rejects(
      analyseSkinGuidance({ gemini: fakeProvider([unavailable()]), backup }, INPUT, { allowBackupProvider: value }),
    );
    assert.equal(backup.calls.length, 0, `value ${JSON.stringify(value)} is not consent`);
  }
});
