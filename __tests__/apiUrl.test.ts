import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { resolveApiBaseUrl } from '../src/utils/apiUrl';

const root = path.join(__dirname, '..');
const LOCAL_HOSTS = /localhost|127\.0\.0\.1|10\.0\.2\.2|0\.0\.0\.0/;

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(full);
    }
    return /\.(ts|tsx|js|jsx|json)$/.test(entry.name) ? [full] : [];
  });
}

describe('resolveApiBaseUrl', () => {
  it('uses local HTTP endpoints only in development builds', () => {
    expect(resolveApiBaseUrl({ isDev: true, platform: 'android', productionUrl: '' })).toBe(
      'http://127.0.0.1:3001',
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

  it('accepts a hosted HTTPS API address such as a Render service URL', () => {
    expect(
      resolveApiBaseUrl({
        isDev: false,
        platform: 'android',
        productionUrl: 'https://herbalclinic-api.onrender.com/',
      }),
    ).toBe('https://herbalclinic-api.onrender.com');
  });

  it('never resolves a release build to a local address, even over https', () => {
    for (const productionUrl of [
      'https://localhost:3001',
      'https://api.localhost',
      'https://127.0.0.1:3001',
      'https://10.0.2.2:3001',
      'https://0.0.0.0',
      'https://192.168.1.20:3001',
      'https://172.20.0.5/api',
    ]) {
      const result = resolveApiBaseUrl({ isDev: false, platform: 'android', productionUrl });
      expect(result).toBe('');
    }
    expect(
      resolveApiBaseUrl({ isDev: false, platform: 'android', productionUrl: 'https://172.15.0.5' }),
    ).toBe('https://172.15.0.5');
  });
});

describe('committed production API configuration', () => {
  const configSource = fs.readFileSync(path.join(root, 'src', 'constants', 'config.ts'), 'utf8');
  const committed = configSource.match(/const PRODUCTION_API_BASE_URL = '([^']*)';/)?.[1];

  it('is a single literal that release builds resolve to HTTPS or to nothing', () => {
    expect(committed).toBeDefined();
    const resolved = resolveApiBaseUrl({
      isDev: false,
      platform: 'android',
      productionUrl: committed ?? '',
    });
    expect(resolved === '' || resolved.startsWith('https://')).toBe(true);
    expect(resolved).not.toMatch(LOCAL_HOSTS);
    expect(committed).not.toMatch(LOCAL_HOSTS);
  });

  it('only uses the local development API when __DEV__ is true', () => {
    expect(configSource).toMatch(/isDev: __DEV__/);
  });
});

describe('the mobile app never talks to the database directly', () => {
  it('has no database URLs, Supabase or PostgreSQL references in app source', () => {
    const files = [
      ...sourceFiles(path.join(root, 'src')),
      path.join(root, 'App.tsx'),
      path.join(root, 'index.js'),
    ].filter(file => fs.existsSync(file));
    expect(files.length).toBeGreaterThan(10);
    const offenders = files.filter(file =>
      /supabase|DATABASE_URL|postgres(ql)?:\/\/|\bfrom ['"]pg['"]|require\(['"]pg['"]\)/i.test(
        fs.readFileSync(file, 'utf8'),
      ),
    );
    expect(offenders).toEqual([]);
  });

  it('does not bundle a database client in the app dependencies', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(deps.filter(name => /^(pg|postgres|@supabase\/.*|@electric-sql\/.*)$/.test(name))).toEqual([]);
  });
});
