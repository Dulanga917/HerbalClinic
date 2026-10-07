const test = require('node:test');
const assert = require('node:assert/strict');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GEMINI_UNAVAILABLE, normaliseSkinGuidance } = require('./aiGuidance');
const gemini = require('./gemini');

const IMAGE = { imageBase64: 'AAAA', mimeType: 'image/jpeg' };
const FAKE_KEY = 'test-placeholder-not-a-real-key';
const TEST_POLICY = { attemptTimeoutMs: 50, retryDelayMs: 5 };

const ok = body => ({ response: { text: () => JSON.stringify(body) } });
const providerError = status => Object.assign(new Error(`[${status}] provider said no`), { status });
const hang = () => new Promise(() => {});

// Swaps in a fake model, shortens the retry waits, and collects console.warn lines for the run.
function withFakeModel(generateContent, run, policy = TEST_POLICY) {
  const original = GoogleGenerativeAI.prototype.getGenerativeModel;
  const originalKey = process.env.GEMINI_API_KEY;
  const originalPolicy = { ...gemini.RETRY_POLICY };
  const originalWarn = console.warn;
  const logs = [];
  process.env.GEMINI_API_KEY = FAKE_KEY;
  Object.assign(gemini.RETRY_POLICY, policy);
  console.warn = (...args) => logs.push(args.join(' '));
  GoogleGenerativeAI.prototype.getGenerativeModel = () => ({ generateContent });
  return Promise.resolve()
    .then(() => run(logs))
    .finally(() => {
      GoogleGenerativeAI.prototype.getGenerativeModel = original;
      Object.assign(gemini.RETRY_POLICY, originalPolicy);
      console.warn = originalWarn;
      if (originalKey === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = originalKey;
      }
    });
}

// Returns a generateContent fake that plays the given steps in order and records each call.
function scripted(...steps) {
  const calls = [];
  const generateContent = async (request, options) => {
    calls.push({ request, options, at: Date.now() });
    const step = steps[Math.min(calls.length, steps.length) - 1];
    return step(options);
  };
  return { calls, generateContent };
}

const assertUnavailable = promise =>
  assert.rejects(promise, error => {
    assert.equal(error.code, GEMINI_UNAVAILABLE);
    assert.equal(error.status, 503);
    assert.equal(error.message, 'AI guidance is temporarily unavailable.');
    return true;
  });

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

test('production retry policy: 45 s per attempt, 2 attempts, short backoff', () => {
  assert.equal(gemini.RETRY_POLICY.attemptTimeoutMs, 45000);
  assert.equal(gemini.RETRY_POLICY.maxAttempts, 2);
  assert.ok(gemini.RETRY_POLICY.retryDelayMs >= 1000 && gemini.RETRY_POLICY.retryDelayMs <= 2000);
});

test('a successful first attempt makes one call, passes an abort signal, and logs nothing', async () => {
  const body = { status: 'no_clear_concern', observations: 'Even tone.' };
  const fake = scripted(() => ok(body));
  await withFakeModel(fake.generateContent, async logs => {
    assert.deepEqual(await gemini.analyseSkinIssue(IMAGE), body);
    assert.equal(fake.calls.length, 1);
    assert.ok(fake.calls[0].options.signal instanceof AbortSignal);
    assert.deepEqual(logs, []);
  });
});

test('a 503 on the first attempt is retried once after a backoff and the second result is used', async () => {
  const body = { status: 'no_clear_concern', observations: 'Even tone.' };
  const fake = scripted(
    () => {
      throw providerError(503);
    },
    () => ok(body),
  );
  await withFakeModel(
    fake.generateContent,
    async logs => {
      assert.deepEqual(await gemini.analyseSkinIssue(IMAGE), body);
      assert.equal(fake.calls.length, 2);
      assert.ok(fake.calls[1].at - fake.calls[0].at >= 30, 'waits for the backoff before retrying');
      assert.equal(logs.length, 1);
      assert.match(logs[0], /model=gemini-3\.8-flash, attempt=1\/2, category=provider_unavailable, httpStatus=503, elapsedMs=\d+, willRetry=true/);
    },
    { ...TEST_POLICY, retryDelayMs: 30 },
  );
});

test('a timed-out first attempt is aborted and retried, and the second result is used', async () => {
  const body = { status: 'unable_to_assess', observations: 'Blurry photo.' };
  const fake = scripted(hang, () => ok(body));
  await withFakeModel(fake.generateContent, async logs => {
    assert.deepEqual(await gemini.analyseSkinIssue(IMAGE), body);
    assert.equal(fake.calls.length, 2);
    assert.equal(fake.calls[0].options.signal.aborted, true, 'the stalled provider request is cancelled');
    assert.equal(fake.calls[1].options.signal.aborted, false);
    assert.equal(logs.length, 1);
    assert.match(logs[0], /attempt=1\/2, category=timeout, httpStatus=none, elapsedMs=\d+, willRetry=true/);
  });
});

test('repeated 503 responses stop after 2 attempts with GEMINI_UNAVAILABLE', async () => {
  const fake = scripted(() => {
    throw providerError(503);
  });
  await withFakeModel(fake.generateContent, async logs => {
    await assertUnavailable(gemini.analyseSkinIssue(IMAGE));
    assert.equal(fake.calls.length, 2);
    assert.match(logs[0], /attempt=1\/2, category=provider_unavailable, .*willRetry=true/);
    assert.match(logs[1], /attempt=2\/2, category=provider_unavailable, .*willRetry=false/);
  });
});

test('repeated timeouts stop after 2 attempts with GEMINI_UNAVAILABLE', async () => {
  const fake = scripted(hang);
  await withFakeModel(fake.generateContent, async logs => {
    const startedAt = Date.now();
    await assertUnavailable(gemini.analyseSkinIssue(IMAGE));
    assert.equal(fake.calls.length, 2);
    assert.ok(Date.now() - startedAt < 1000, 'gives up after the per-attempt timeouts, not the provider');
    assert.ok(fake.calls.every(call => call.options.signal.aborted));
    assert.match(logs[1], /attempt=2\/2, category=timeout, .*willRetry=false/);
  });
});

test('a transient network failure is retried once', async () => {
  const body = { status: 'no_clear_concern', observations: 'Even tone.' };
  const fake = scripted(
    () => {
      throw new Error('[GoogleGenerativeAI Error]: Error fetching from https://example.test: fetch failed');
    },
    () => ok(body),
  );
  await withFakeModel(fake.generateContent, async logs => {
    assert.deepEqual(await gemini.analyseSkinIssue(IMAGE), body);
    assert.equal(fake.calls.length, 2);
    assert.match(logs[0], /category=network, httpStatus=none, .*willRetry=true/);
  });
});

test('permanent failures are not retried', async () => {
  const blocked = () => ({
    response: {
      text: () => {
        throw new Error('[GoogleGenerativeAI Error]: Candidate was blocked due to SAFETY');
      },
    },
  });
  const cases = [
    ['invalid key', () => { throw providerError(400); }, /category=http_400, httpStatus=400, .*willRetry=false/],
    ['forbidden', () => { throw providerError(403); }, /category=http_403, httpStatus=403, .*willRetry=false/],
    ['unknown model', () => { throw providerError(404); }, /category=http_404, httpStatus=404, .*willRetry=false/],
    ['quota', () => { throw providerError(429); }, /category=http_429, httpStatus=429, .*willRetry=false/],
    ['server error', () => { throw providerError(500); }, /category=http_500, httpStatus=500, .*willRetry=false/],
    ['unknown error', () => { throw new Error('something unexpected'); }, /category=provider_error, .*willRetry=false/],
    ['safety block', blocked, /category=unusable_response/],
    ['unparseable output', () => ({ response: { text: () => 'not json' } }), /category=unusable_response/],
  ];
  for (const [label, step, logPattern] of cases) {
    const fake = scripted(step);
    await withFakeModel(fake.generateContent, async logs => {
      await assertUnavailable(gemini.analyseSkinIssue(IMAGE));
      assert.equal(fake.calls.length, 1, `${label} must not be retried`);
      assert.equal(logs.length, 1, label);
      assert.match(logs[0], logPattern, label);
    });
  }
});

test('failure logs carry metadata only, never the key, image data, prompt, or provider message', async () => {
  const image = { imageBase64: 'UNIQUEIMAGEDATA0', mimeType: 'image/jpeg', language: 'si' };
  const fake = scripted(() => {
    throw Object.assign(new Error(`[503] overloaded for key ${FAKE_KEY} with image UNIQUEIMAGEDATA0`), { status: 503 });
  });
  await withFakeModel(fake.generateContent, async logs => {
    await assertUnavailable(gemini.analyseSkinIssue(image));
    assert.equal(logs.length, 2);
    for (const line of logs) {
      assert.ok(!line.includes(FAKE_KEY), 'no API key');
      assert.ok(!line.includes('UNIQUEIMAGEDATA0'), 'no image data');
      assert.doesNotMatch(line, /overloaded|Sinhala|Ayurvedic|Bearer|token/i);
    }
  });
});

test('a retried Sinhala request sends the same Sinhala prompt and image on both attempts', async () => {
  const body = { status: 'no_clear_concern', observations: 'සම සමබරව පෙනේ.' };
  const fake = scripted(
    () => {
      throw providerError(503);
    },
    () => ok(body),
  );
  await withFakeModel(fake.generateContent, async () => {
    assert.deepEqual(await gemini.analyseSkinIssue({ ...IMAGE, language: 'si' }), body);
  });
  assert.equal(fake.calls.length, 2);
  for (const { request } of fake.calls) {
    assert.equal(request[0], gemini.withLanguage(gemini.SKIN_ISSUE_PROMPT, 'si'));
    assert.deepEqual(request[1], { inlineData: { mimeType: 'image/jpeg', data: 'AAAA' } });
  }

  const english = scripted(() => ok(body));
  await withFakeModel(english.generateContent, () => gemini.analyseSkinIssue(IMAGE));
  assert.equal(english.calls[0].request[0], gemini.SKIN_ISSUE_PROMPT);
});
