const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validatePassword,
  validateEmail,
  validateName,
} = require('./passwordPolicy');

test('rejects short passwords without echoing the value', () => {
  const result = validatePassword('1234567');
  assert.equal(result.ok, false);
  assert.match(result.message, /at least 8 characters/i);
  assert.equal(JSON.stringify(result).includes('1234567'), false);
});

test('accepts passwords of 8 or more characters', () => {
  const result = validatePassword('abcdefgh');
  assert.equal(result.ok, true);
});

test('normalizes email addresses', () => {
  const result = validateEmail('  User@Example.COM ');
  assert.equal(result.ok, true);
  assert.equal(result.value, 'user@example.com');
});

test('requires a name', () => {
  const result = validateName(' ');
  assert.equal(result.ok, false);
});

test('rejects non-string values instead of coercing them', () => {
  assert.equal(validateName({ a: 1 }).ok, false);
  assert.equal(validateName(['Valid Name']).ok, false);
  assert.equal(validateEmail(['user@example.com']).ok, false);
  assert.equal(validateEmail({ toString: () => 'user@example.com' }).ok, false);
  assert.equal(validatePassword(['12345678']).ok, false);
  assert.equal(validatePassword(12345678).ok, false);
  assert.equal(validatePassword(undefined).ok, false);
});

test('enforces maximum lengths', () => {
  assert.equal(validatePassword('a'.repeat(129)).ok, false);
  assert.equal(validatePassword('a'.repeat(128)).ok, true);
  assert.equal(validateEmail(`${'a'.repeat(250)}@example.test`).ok, false);
  assert.equal(validateName('n'.repeat(81)).ok, false);
});
