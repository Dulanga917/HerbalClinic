const test = require('node:test');
const assert = require('node:assert/strict');
const groq = require('./groq');
const gemini = require('./gemini');
const { GEMINI_UNAVAILABLE } = require('./aiGuidance');

const FAKE_KEY = 'gsk_test-placeholder-not-a-real-key';
const IMAGE = { imageBase64: 'UNIQUEIMAGEDATA0', mimeType: 'image/jpeg', language: 'en' };
const GUIDANCE = { status: 'no_clear_concern', observations: 'Even tone.' };

const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const completion = (content, finishReason = 'stop') =>
  jsonResponse(200, { choices: [{ finish_reason: finishReason, message: { content } }] });

// Swaps in a fake transport and key, shortens the timeout, and collects console.warn lines.
function withFakeGroq(respond, run, { key = FAKE_KEY, timeoutMs = 50 } = {}) {
  const originalFetch = groq.transport.fetch;
  const originalPolicy = { ...groq.GROQ_POLICY };
  const originalKey = process.env.GROQ_API_KEY;
  const originalWarn = console.warn;
  const calls = [];
  const logs = [];
  if (key === undefined) {
    delete process.env.GROQ_API_KEY;
  } else {
    process.env.GROQ_API_KEY = key;
  }
  groq.GROQ_POLICY.attemptTimeoutMs = timeoutMs;
  groq.transport.fetch = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return respond(init, calls.length);
  };
  console.warn = (...args) => logs.push(args.join(' '));
  return Promise.resolve()
    .then(() => run({ calls, logs }))
    .finally(() => {
      groq.transport.fetch = originalFetch;
      Object.assign(groq.GROQ_POLICY, originalPolicy);
      console.warn = originalWarn;
      if (originalKey === undefined) {
        delete process.env.GROQ_API_KEY;
      } else {
        process.env.GROQ_API_KEY = originalKey;
      }
    });
}

const assertUnavailable = promise =>
  assert.rejects(promise, error => {
    assert.equal(error.code, GEMINI_UNAVAILABLE);
    assert.equal(error.status, 503);
    assert.equal(error.message, 'AI guidance is temporarily unavailable.');
    return true;
  });

test('production Groq settings: tested vision model, one bounded 20 s attempt', () => {
  assert.equal(groq.MODEL_NAME, 'qwen/qwen3.8-27b');
  assert.equal(groq.GROQ_POLICY.attemptTimeoutMs, 20000);
});

test('sends the shared skin prompt, the photo as a data URL, JSON mode, and the key only as a bearer header', async () => {
  await withFakeGroq(
    () => completion(`\`\`\`json\n${JSON.stringify(GUIDANCE)}\n\`\`\``),
    async ({ calls }) => {
      assert.deepEqual(await groq.analyseSkinIssue({ ...IMAGE, language: 'si', strictLanguage: true }), GUIDANCE);
      assert.equal(calls.length, 1);
      const [{ url, init, body }] = calls;
      assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
      assert.equal(init.method, 'POST');
      assert.equal(init.headers.Authorization, `Bearer ${FAKE_KEY}`);
      assert.ok(init.signal instanceof AbortSignal);
      assert.ok(!init.body.includes(FAKE_KEY), 'the key never goes in the body');
      assert.equal(body.model, 'qwen/qwen3.8-27b');
      assert.deepEqual(body.response_format, { type: 'json_object' });
      assert.equal(body.reasoning_format, 'hidden');
      const [text, image] = body.messages[0].content;
      assert.equal(text.text, gemini.skinIssuePrompt({ language: 'si', strictLanguage: true }));
      assert.equal(image.image_url.url, 'data:image/jpeg;base64,UNIQUEIMAGEDATA0');
    },
  );
});

test('the English prompt is exactly the existing Gemini skin prompt', async () => {
  await withFakeGroq(
    () => completion(JSON.stringify(GUIDANCE)),
    async ({ calls }) => {
      await groq.analyseSkinIssue(IMAGE);
      assert.equal(calls[0].body.messages[0].content[0].text, gemini.SKIN_ISSUE_PROMPT);
    },
  );
});

test('HTTP errors are not retried and become GEMINI_UNAVAILABLE with a metadata-only log', async () => {
  for (const status of [400, 401, 413, 429, 500, 503]) {
    await withFakeGroq(
      () => jsonResponse(status, { error: { message: `secret provider text for ${FAKE_KEY}` } }),
      async ({ calls, logs }) => {
        await assertUnavailable(groq.analyseSkinIssue(IMAGE));
        assert.equal(calls.length, 1, `HTTP ${status} must not be retried`);
        assert.equal(logs.length, 1);
        assert.match(logs[0], new RegExp(`model=qwen/qwen3\\.8-27b, category=http_${status}, httpStatus=${status}, elapsedMs=\\d+`));
      },
    );
  }
});

test('a stalled request is aborted at the timeout', async () => {
  await withFakeGroq(
    init =>
      new Promise((_, reject) => {
        init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      }),
    async ({ calls, logs }) => {
      const startedAt = Date.now();
      await assertUnavailable(groq.analyseSkinIssue(IMAGE));
      assert.ok(Date.now() - startedAt < 1000);
      assert.equal(calls[0].init.signal.aborted, true);
      assert.match(logs[0], /category=timeout, httpStatus=none/);
    },
  );
});

test('a network failure becomes GEMINI_UNAVAILABLE', async () => {
  await withFakeGroq(
    () => {
      throw new TypeError('fetch failed');
    },
    async ({ logs }) => {
      await assertUnavailable(groq.analyseSkinIssue(IMAGE));
      assert.match(logs[0], /category=network, httpStatus=none/);
    },
  );
});

test('cut-off, empty, or unparseable answers are unusable', async () => {
  const answers = [
    completion(JSON.stringify(GUIDANCE), 'length'),
    jsonResponse(200, { choices: [] }),
    jsonResponse(200, {}),
    completion('this is not json'),
    completion(''),
  ];
  for (const answer of answers) {
    await withFakeGroq(
      () => answer,
      async ({ logs }) => {
        await assertUnavailable(groq.analyseSkinIssue(IMAGE));
        assert.match(logs[0], /Groq response was unusable \(model=qwen\/qwen3\.8-27b, category=unusable_response\)/);
      },
    );
  }
});

test('a missing key means not configured and no request is sent', async () => {
  for (const key of [undefined, '', '   ']) {
    await withFakeGroq(
      () => completion(JSON.stringify(GUIDANCE)),
      async ({ calls }) => {
        assert.equal(groq.isConfigured(), false);
        await assert.rejects(groq.analyseSkinIssue(IMAGE), error => {
          assert.equal(error.code, GEMINI_UNAVAILABLE);
          assert.doesNotMatch(error.message, /GROQ_API_KEY|key/i);
          return true;
        });
        assert.equal(calls.length, 0);
      },
      { key },
    );
  }
  await withFakeGroq(() => completion('{}'), async () => assert.equal(groq.isConfigured(), true));
});

test('failure logs never contain the key, image data, prompt, or provider message', async () => {
  await withFakeGroq(
    () => jsonResponse(503, { error: { message: `overloaded for ${FAKE_KEY} UNIQUEIMAGEDATA0` } }),
    async ({ logs }) => {
      await assertUnavailable(groq.analyseSkinIssue({ ...IMAGE, language: 'si' }));
      for (const line of logs) {
        assert.ok(!line.includes(FAKE_KEY));
        assert.ok(!line.includes('UNIQUEIMAGEDATA0'));
        assert.doesNotMatch(line, /overloaded|Sinhala|Ayurvedic|Bearer/i);
      }
    },
  );
});
