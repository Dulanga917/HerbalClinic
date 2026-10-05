import { describe, expect, it } from '@jest/globals';
import { homeDoshaState } from '../src/utils/homeDashboard';

describe('homeDoshaState', () => {
  it('shows the saved Dosha for an assessed user', () => {
    const state = homeDoshaState({ name: 'Ada Lovelace', dosha: 'Vata' });
    expect(state.greeting).toBe('Welcome, Ada');
    expect(state.hasDosha).toBe(true);
    expect(state.doshaLabel).toBe('VATA');
    expect(state.subtitle).toMatch(/latest assessment/i);
  });

  it('prompts for an assessment when no Dosha is saved', () => {
    const state = homeDoshaState({ name: 'Ada', dosha: null });
    expect(state.hasDosha).toBe(false);
    expect(state.doshaLabel).toBe('Not assessed yet');
    expect(state.subtitle).toMatch(/Skin Type Assessment/i);
  });
});
