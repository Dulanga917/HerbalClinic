import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import doshaLabels from '../src/assets/dosha-labels.json';
import { SHIPPED_DOSHA_LABELS, SHIPPED_PIXEL_SCALE } from '../src/utils/doshaScores';

const modelPath = path.join(__dirname, '../src/assets/ayurvedic_model.tflite');

describe('shipped TFLite file', () => {
  it('is a TFLite buffer with unverified 3-class labels', () => {
    const bytes = fs.readFileSync(modelPath);
    const ascii = bytes.toString('latin1');

    expect(bytes.length).toBeGreaterThan(100_000);
    expect(ascii).toContain('TFL3');
    expect(doshaLabels.labels).toEqual([...SHIPPED_DOSHA_LABELS]);
    expect(doshaLabels.labels).toHaveLength(3);
    expect(doshaLabels.labels).not.toContain('Balanced');
    expect(SHIPPED_PIXEL_SCALE).toBe('unit-interval-unproven');
  });

  it('does not prove MobileNetV2 [-1,1] preprocessing for this file', () => {
    const bytes = fs.readFileSync(modelPath);
    const ascii = bytes.toString('latin1');
    expect(ascii.includes('preprocess_input')).toBe(false);
    expect(doshaLabels.provenance).toBe('unverified');
  });
});
