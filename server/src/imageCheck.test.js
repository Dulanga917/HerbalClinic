const test = require('node:test');
const assert = require('node:assert/strict');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GEMINI_UNAVAILABLE } = require('./aiGuidance');
const { imageCheckPrompt, normaliseImageCheck } = require('./imageCheck');
const gemini = require('./gemini');

const FAKE_KEY = 'test-placeholder-not-a-real-key';
const IMAGE = { imageBase64: 'AAAA', mimeType: 'image/jpeg' };

const FACE = {
  isValid: true,
  imageCategory: 'human_face',
  humanSkinVisible: true,
  faceCount: 1,
  quality: 'good',
  reason: 'ok',
};
const notSkin = imageCategory => ({
  isValid: false,
  imageCategory,
  humanSkinVisible: false,
  faceCount: 0,
  quality: 'good',
  reason: 'no_human_skin',
});
const ARM = { ...FACE, imageCategory: 'human_skin', faceCount: 0 };

const rejected = (reason, imageCategory) => ({ isValid: false, reason, imageCategory });

test('a clear, single, front-facing face is valid for Skin Type Assessment', () => {
  assert.deepEqual(normaliseImageCheck(FACE, 'face'), { isValid: true, reason: 'ok', imageCategory: 'human_face' });
  assert.deepEqual(normaliseImageCheck(FACE, 'skin'), { isValid: true, reason: 'ok', imageCategory: 'human_face' });
});

test('furniture, landscapes, animals, food, documents, screenshots, and objects are rejected', () => {
  for (const category of ['furniture', 'landscape', 'animal', 'food', 'document', 'screenshot', 'other_object']) {
    for (const purpose of ['face', 'skin']) {
      assert.deepEqual(normaliseImageCheck(notSkin(category), purpose), rejected('no_human_skin', category));
    }
  }
});

test('a photo with no visible human skin is rejected even if the model calls it valid', () => {
  const contradictory = { ...notSkin('furniture'), isValid: true, reason: 'ok' };
  assert.deepEqual(normaliseImageCheck(contradictory, 'face'), rejected('no_human_skin', 'furniture'));
  const faceCategoryNoSkin = { ...FACE, humanSkinVisible: false };
  assert.deepEqual(normaliseImageCheck(faceCategoryNoSkin, 'skin'), rejected('no_human_skin', 'human_face'));
});

test('Skin Type Assessment needs exactly one face; non-facial skin and group photos are rejected', () => {
  assert.deepEqual(normaliseImageCheck({ ...ARM, isValid: true }, 'face'), rejected('non_facial_skin', 'human_skin'));
  assert.deepEqual(normaliseImageCheck(ARM, 'skin'), { isValid: true, reason: 'ok', imageCategory: 'human_skin' });
  assert.deepEqual(normaliseImageCheck({ ...FACE, faceCount: 3 }, 'face'), rejected('multiple_faces', 'human_face'));
  assert.deepEqual(normaliseImageCheck({ ...FACE, faceCount: 0 }, 'face'), rejected('unclear', 'human_face'));
  assert.deepEqual(
    normaliseImageCheck({ ...FACE, imageCategory: 'human_skin', faceCount: 1 }, 'face'),
    rejected('unclear', 'human_skin'),
  );
});

test('dark, bright, blurry, filtered, or obstructed photos ask for a retake', () => {
  const expected = {
    too_dark: 'poor_lighting',
    too_bright: 'poor_lighting',
    blurry: 'blurry',
    heavily_filtered: 'heavily_filtered',
    obstructed: 'unclear',
  };
  for (const [quality, reason] of Object.entries(expected)) {
    assert.deepEqual(normaliseImageCheck({ ...FACE, quality }, 'face'), rejected(reason, 'human_face'));
  }
});

test('uncertain or self-contradictory answers fail safe as "unclear" rather than valid', () => {
  assert.deepEqual(normaliseImageCheck({ ...FACE, isValid: false, reason: 'ok' }, 'face'), rejected('unclear', 'human_face'));
  assert.deepEqual(normaliseImageCheck({ ...FACE, isValid: false, reason: 'unclear' }, 'face'), rejected('unclear', 'human_face'));
  assert.deepEqual(normaliseImageCheck({ ...FACE, reason: 'blurry' }, 'face'), rejected('blurry', 'human_face'));
  assert.deepEqual(
    normaliseImageCheck({ ...FACE, imageCategory: 'unclear', reason: 'unclear', isValid: false }, 'skin'),
    rejected('unclear', 'unclear'),
  );
  assert.deepEqual(
    normaliseImageCheck({ ...FACE, imageCategory: 'animal' }, 'skin'),
    rejected('unclear', 'animal'),
    'skin reported on an animal photo is not trusted',
  );
});

test('answers that do not match the schema return null (treated as unavailable)', () => {
  const malformed = [
    null,
    undefined,
    'valid',
    [],
    {},
    { isValid: true },
    { ...FACE, isValid: 'true' },
    { ...FACE, humanSkinVisible: 1 },
    { ...FACE, imageCategory: 'person' },
    { ...FACE, quality: 'excellent' },
    { ...FACE, reason: 'looks fine' },
    { ...FACE, faceCount: -1 },
    { ...FACE, faceCount: 1.5 },
    { ...FACE, faceCount: '1' },
    { ...FACE, faceCount: 1000 },
  ];
  for (const raw of malformed) {
    assert.equal(normaliseImageCheck(raw, 'face'), null, JSON.stringify(raw));
  }
  assert.equal(normaliseImageCheck(FACE, 'selfie'), null, 'unknown purpose');
});

test('the Skin Type check prompt asks only for the structured verdict, strictly', () => {
  const prompt = imageCheckPrompt('face');
  assert.match(prompt, /exactly one real human face/);
  assert.match(prompt, /If you are not sure, it is not valid/);
  assert.match(prompt, /Do not assess the skin and do not diagnose/);
  for (const field of ['"isValid"', '"imageCategory"', '"humanSkinVisible"', '"faceCount"', '"quality"', '"reason"']) {
    assert.ok(prompt.includes(field), field);
  }
  assert.doesNotMatch(prompt, /"severity"|"confidence"|"dosha"/i);
});

function withFakeModel(generateContent, run) {
  const original = GoogleGenerativeAI.prototype.getGenerativeModel;
  const originalKey = process.env.GEMINI_API_KEY;
  const originalPolicy = { ...gemini.RETRY_POLICY };
  const originalWarn = console.warn;
  const logs = [];
  process.env.GEMINI_API_KEY = FAKE_KEY;
  Object.assign(gemini.RETRY_POLICY, { attemptTimeoutMs: 50, retryDelayMs: 5 });
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

const reply = body => async () => ({
  response: { text: () => (typeof body === 'string' ? body : JSON.stringify(body)) },
});
const assertUnavailable = promise =>
  assert.rejects(promise, error => error.code === GEMINI_UNAVAILABLE && error.status === 503);

test('checkSkinImage sends the face-check prompt with the photo and returns the normalised verdict', async () => {
  let sent;
  await withFakeModel(
    async request => {
      sent = request;
      return { response: { text: () => '```json\n' + JSON.stringify(FACE) + '\n```' } };
    },
    async logs => {
      assert.deepEqual(await gemini.checkSkinImage(IMAGE), { isValid: true, reason: 'ok', imageCategory: 'human_face' });
      assert.equal(logs.length, 0);
    },
  );
  assert.equal(sent[0], imageCheckPrompt('face'));
  assert.deepEqual(sent[1], { inlineData: { mimeType: 'image/jpeg', data: 'AAAA' } });
});

test('checkSkinImage reports a furniture photo as invalid and logs metadata only', async () => {
  await withFakeModel(reply(notSkin('furniture')), async logs => {
    assert.deepEqual(await gemini.checkSkinImage(IMAGE), rejected('no_human_skin', 'furniture'));
    assert.equal(logs.length, 1);
    assert.match(logs[0], /purpose=face, reason=no_human_skin, category=furniture, modelSaidValid=false/);
    assert.doesNotMatch(logs[0], /AAAA|test-placeholder/);
  });
});

test('malformed or unparseable checks and provider failures surface as GEMINI_UNAVAILABLE', async () => {
  for (const body of ['not json', '{"isValid": true}', { ...FACE, isValid: 'yes' }, ['array']]) {
    await withFakeModel(reply(body), () => assertUnavailable(gemini.checkSkinImage(IMAGE)));
  }
  const outage = async () => {
    throw Object.assign(new Error('[503] busy'), { status: 503 });
  };
  await withFakeModel(outage, () => assertUnavailable(gemini.checkSkinImage(IMAGE)));
  const badKey = async () => {
    throw Object.assign(new Error('[400] API key not valid'), { status: 400 });
  };
  await withFakeModel(badKey, () => assertUnavailable(gemini.checkSkinImage(IMAGE)));
});

test('checkSkinImage without a configured key fails closed', async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    await assertUnavailable(gemini.checkSkinImage(IMAGE));
  } finally {
    if (originalKey !== undefined) {
      process.env.GEMINI_API_KEY = originalKey;
    }
  }
});
