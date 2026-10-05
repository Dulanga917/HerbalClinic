import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

describe('Android release hardening (static checks)', () => {
  const gradle = read('android', 'app', 'build.gradle');
  const manifest = read('android', 'app', 'src', 'main', 'AndroidManifest.xml');

  it('never signs the release build type with the debug keystore', () => {
    const releaseBlock = gradle.slice(gradle.indexOf('release {', gradle.indexOf('buildTypes')));
    expect(releaseBlock).not.toMatch(/signingConfigs\.debug/);
    expect(releaseBlock).toMatch(/signingConfigs\.release/);
  });

  it('reads release signing values from properties or environment, not source', () => {
    expect(gradle).toMatch(/HERBALCLINIC_RELEASE_STORE_FILE/);
    expect(gradle).toMatch(/System\.getenv\(name\)/);
    const literalPasswords = [...gradle.matchAll(/(?:storePassword|keyPassword)\s+'([^']*)'/g)].map(
      match => match[1],
    );
    expect(new Set(literalPasswords)).toEqual(new Set(['android']));
  });

  it('fails release packaging when signing is not configured', () => {
    expect(gradle).toMatch(/taskGraph\.whenReady/);
    expect(gradle).toMatch(/throw new GradleException/);
    expect(gradle).toMatch(/never signed with the debug keystore/i);
  });

  it('declares only the permissions the app needs', () => {
    const declared = [...manifest.matchAll(/<uses-permission\s+android:name="([^"]+)"([^>]*)>/g)]
      .filter(match => !/tools:node="remove"/.test(match[2]))
      .map(match => match[1])
      .sort();
    expect(declared).toEqual([
      'android.permission.CAMERA',
      'android.permission.INTERNET',
      'android.permission.READ_EXTERNAL_STORAGE',
    ]);
    expect(manifest).toMatch(/READ_EXTERNAL_STORAGE"\s+android:maxSdkVersion="32"/);
  });

  it('removes unused permissions contributed by libraries', () => {
    for (const permission of [
      'WRITE_EXTERNAL_STORAGE',
      'READ_PHONE_STATE',
      'USE_BIOMETRIC',
      'USE_FINGERPRINT',
      'READ_MEDIA_IMAGES',
    ]) {
      expect(manifest).toMatch(
        new RegExp(`android\\.permission\\.${permission}"\\s+tools:node="remove"`),
      );
    }
  });

  it('disables backups and blocks cleartext traffic outside debug builds', () => {
    expect(manifest).toMatch(/android:allowBackup="false"/);
    expect(manifest).toMatch(/android:networkSecurityConfig="@xml\/network_security_config"/);
    expect(manifest).not.toMatch(/usesCleartextTraffic="true"/);

    const mainConfig = read('android', 'app', 'src', 'main', 'res', 'xml', 'network_security_config.xml');
    expect(mainConfig).toMatch(/cleartextTrafficPermitted="false"/);
    expect(mainConfig).not.toMatch(/cleartextTrafficPermitted="true"/);

    const debugConfig = read('android', 'app', 'src', 'debug', 'res', 'xml', 'network_security_config.xml');
    expect(debugConfig).toMatch(/cleartextTrafficPermitted="true"/);
  });
});

describe('required runtime assets are present and tracked paths exist', () => {
  it('ships the TFLite model, labels, and server sources', () => {
    for (const parts of [
      ['src', 'assets', 'ayurvedic_model.tflite'],
      ['src', 'assets', 'dosha-labels.json'],
      ['server', 'package.json'],
      ['server', 'package-lock.json'],
      ['server', 'src', 'index.js'],
      ['server', 'src', 'db.js'],
    ]) {
      expect(fs.existsSync(path.join(root, ...parts))).toBe(true);
    }
    expect(fs.statSync(path.join(root, 'src', 'assets', 'ayurvedic_model.tflite')).size).toBeGreaterThan(1024);
  });

  it('keeps the label file consistent with the model service', () => {
    const labels = JSON.parse(read('src', 'assets', 'dosha-labels.json')).labels;
    expect(labels).toEqual(['Kapha', 'Pitta', 'Vata']);
  });
});
