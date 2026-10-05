import { describe, it, expect } from '@jest/globals';
import { resolveApiBaseUrl } from '../src/utils/apiUrl';

describe('resolveApiBaseUrl', () => {
  it('uses local HTTP endpoints only in development builds', () => {
    expect(resolveApiBaseUrl({ isDev: true, platform: 'android', productionUrl: '' })).toBe(
      'http://10.0.2.2:3001',
    );
    expect(resolveApiBaseUrl({ isDev: true, platform: 'ios', productionUrl: '' })).toBe(
      'http://localhost:3001',
    );
  });

  it('accepts a valid https URL in release builds and trims trailing slashes', () => {
    expect(
      resolveApiBaseUrl({
        isDev: false,
        platform: 'android',
        productionUrl: ' https://api.example.test/ ',
      }),
    ).toBe('https://api.example.test');
    expect(
      resolveApiBaseUrl({
        isDev: false,
        platform: 'ios',
        productionUrl: 'https://api.example.test:8443/herbal/v1',
      }),
    ).toBe('https://api.example.test:8443/herbal/v1');
  });

  it('fails closed in release builds when the URL is missing or not HTTPS', () => {
    const invalid = [
      '',
      '   ',
      'http://api.example.test',
      'ftp://api.example.test',
      'api.example.test',
      'https://',
      'https://user:secret@api.example.test',
      'https://api.example.test?token=abc',
      'https://api.example.test/#frag',
      'https://api.example.test/ path',
      'https://-bad-.example.test',
      'http://10.0.2.2:3001',
      'http://localhost:3001',
    ];
    for (const productionUrl of invalid) {
      expect(resolveApiBaseUrl({ isDev: false, platform: 'android', productionUrl })).toBe('');
    }
  });

  it('never returns a plain HTTP URL for release builds', () => {
    const result = resolveApiBaseUrl({
      isDev: false,
      platform: 'android',
      productionUrl: 'http://api.example.test',
    });
    expect(result.startsWith('http://')).toBe(false);
  });
});
