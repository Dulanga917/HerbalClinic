/**
 * @format
 */

import 'react-native';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import MeditationScreen from '../src/screens/meditation/MeditationScreen';
import { MEDITATION_SESSIONS } from '../src/constants/ayurveda';
import { LanguageProvider, createMemoryLanguageStorage, setCurrentLanguage, translate } from '../src/i18n';
import { localizeMeditation } from '../src/i18n/content';
import {
  CompletedMeditation,
  MeditationHistoryStorage,
  createMemoryMeditationHistoryStorage,
} from '../src/services/meditationHistory';
import { formatLocalDate } from '../src/utils/localDate';

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: '7', name: 'Ada', email: 'ada@example.com', dosha: null } }),
}));

const texts = (root: renderer.ReactTestRenderer) =>
  root.root.findAllByType(Text).map(node => node.props.children).flat(Infinity).map(String);

const button = (root: renderer.ReactTestRenderer, label: string) => {
  const node = root.root.findAllByType(TouchableOpacity).find(item => item.props.accessibilityLabel === label);
  expect(node).toBeTruthy();
  return node!;
};

const press = (root: renderer.ReactTestRenderer, label: string) => {
  act(() => {
    button(root, label).props.onPress();
  });
};

const tick = (seconds: number) => {
  act(() => {
    jest.advanceTimersByTime(seconds * 1000);
  });
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const session = MEDITATION_SESSIONS[0];
const minutes = Number.parseInt(session.duration, 10);
const startClock = `${String(minutes).padStart(2, '0')}:00`;

it('starts, pauses, resumes and resets the session timer', () => {
  let root!: renderer.ReactTestRenderer;
  act(() => {
    root = renderer.create(<MeditationScreen />);
  });
  press(root, `Open ${session.title}`);
  expect(texts(root)).toContain(startClock);
  expect(texts(root)).toContain('Ready to begin');
  expect(button(root, 'Reset session timer').props.disabled).toBe(true);

  press(root, 'Start session timer');
  tick(3);
  expect(texts(root)).toContain(`${String(minutes - 1).padStart(2, '0')}:57`);
  expect(texts(root)).toContain('In progress');

  press(root, 'Pause session timer');
  tick(5);
  expect(texts(root)).toContain(`${String(minutes - 1).padStart(2, '0')}:57`);
  expect(texts(root)).toContain('Paused');

  press(root, 'Resume session timer');
  tick(1);
  expect(texts(root)).toContain(`${String(minutes - 1).padStart(2, '0')}:56`);

  press(root, 'Reset session timer');
  expect(texts(root)).toContain(startClock);
  expect(texts(root)).toContain('Ready to begin');
  act(() => root.unmount());
});

it('keeps a single interval while running instead of recreating it every second', () => {
  const setIntervalSpy = jest.spyOn(global, 'setInterval');
  let root!: renderer.ReactTestRenderer;
  act(() => {
    root = renderer.create(<MeditationScreen />);
  });
  press(root, `Open ${session.title}`);
  setIntervalSpy.mockClear();
  press(root, 'Start session timer');
  tick(10);
  expect(setIntervalSpy).toHaveBeenCalledTimes(1);
  act(() => root.unmount());
});

it('stops at 00:00 and offers a restart', async () => {
  let root!: renderer.ReactTestRenderer;
  act(() => {
    root = renderer.create(<MeditationScreen historyStorage={createMemoryMeditationHistoryStorage()} />);
  });
  press(root, `Open ${session.title}`);
  press(root, 'Start session timer');
  tick(minutes * 60 + 5);
  await act(async () => {});
  expect(texts(root)).toContain('00:00');
  expect(texts(root)).toContain('Session complete');
  expect(button(root, 'Restart session timer')).toBeTruthy();

  press(root, 'Close session');
  expect(texts(root)).not.toContain('00:00');
  act(() => root.unmount());
});

const renderWithHistory = async (storage: MeditationHistoryStorage) => {
  let root!: renderer.ReactTestRenderer;
  await act(async () => {
    root = renderer.create(<MeditationScreen historyStorage={storage} />);
  });
  return root;
};

const historyTexts = (root: renderer.ReactTestRenderer) =>
  root.root
    .findByProps({ testID: 'meditation-history' })
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity)
    .map(String);

const entry = (id: string, sessionId: string, completedAt: string, durationSeconds: number): CompletedMeditation => ({
  id,
  sessionId,
  completedAt,
  durationSeconds,
});

it('records a session only when its timer reaches 00:00 and shows it under Completed Sessions', async () => {
  const storage = createMemoryMeditationHistoryStorage();
  const root = await renderWithHistory(storage);
  expect(historyTexts(root)).toContain(
    'No completed sessions yet. A session is saved here when its timer reaches 00:00.',
  );

  press(root, `Open ${session.title}`);
  press(root, 'Start session timer');
  tick(minutes * 60);
  await act(async () => {});

  expect(texts(root)).toContain('Saved to Completed Sessions');
  const saved = storage.value('user-7');
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ sessionId: session.id, durationSeconds: minutes * 60 });

  press(root, 'Close session');
  const rows = root.root.findAllByProps({ testID: 'meditation-history-entry' }, { deep: false });
  expect(rows).toHaveLength(1);
  expect(rows[0].props.accessibilityLabel).toContain(session.title);
  expect(rows[0].props.accessibilityLabel).toContain(formatLocalDate(saved[0].completedAt));
  expect(rows[0].props.accessibilityLabel).toContain(`${minutes} min`);
  expect(historyTexts(root)).toEqual(expect.arrayContaining(['1', 'Sessions completed', String(minutes)]));
  act(() => root.unmount());
});

it('does not record a session that is reset or closed before 00:00', async () => {
  const storage = createMemoryMeditationHistoryStorage();
  const root = await renderWithHistory(storage);

  press(root, `Open ${session.title}`);
  press(root, 'Start session timer');
  tick(minutes * 60 - 1);
  press(root, 'Reset session timer');
  press(root, 'Start session timer');
  tick(30);
  press(root, 'Close session');
  await act(async () => {});

  expect(storage.value('user-7')).toHaveLength(0);
  expect(root.root.findAllByProps({ testID: 'meditation-history-entry' }, { deep: false })).toHaveLength(0);
  act(() => root.unmount());
});

it("loads only the signed-in account's history, newest first, with totals", async () => {
  const other = MEDITATION_SESSIONS[1];
  const storage = createMemoryMeditationHistoryStorage({
    'user-7': [
      entry('b', other.id, '2026-10-12T10:00:00Z', 900),
      entry('a', session.id, '2026-10-11T10:00:00Z', 600),
    ],
    'user-8': [entry('c', session.id, '2026-10-10T10:00:00Z', 600)],
  });
  const root = await renderWithHistory(storage);

  const rows = root.root.findAllByProps({ testID: 'meditation-history-entry' }, { deep: false });
  expect(rows.map(row => row.props.accessibilityLabel.split(',')[0])).toEqual([other.title, session.title]);
  expect(historyTexts(root)).toEqual(expect.arrayContaining(['2', 'Sessions completed', '25', 'Minutes practised']));
  act(() => root.unmount());
});

it('shows the 10 most recent sessions and says how many exist in total', async () => {
  const entries = Array.from({ length: 12 }, (_, i) =>
    entry(`e${i}`, session.id, `2026-10-${String(12 - i).padStart(2, '0')}T10:00:00Z`, 600),
  );
  const root = await renderWithHistory(createMemoryMeditationHistoryStorage({ 'user-7': entries }));
  expect(root.root.findAllByProps({ testID: 'meditation-history-entry' }, { deep: false })).toHaveLength(10);
  expect(historyTexts(root)).toContain('Showing the 10 most recent of 12 sessions.');
  expect(historyTexts(root)).toContain('120');
  act(() => root.unmount());
});

it('states that the history does not measure stress', async () => {
  const root = await renderWithHistory(createMemoryMeditationHistoryStorage());
  const note = historyTexts(root).join('\n');
  expect(note).toContain('It does not measure stress and does not show that a session reduced stress.');
  expect(note).not.toMatch(/reduced your stress|stress level|improv/i);
  act(() => root.unmount());
});

it('describes meditation sessions without unverified medical claims in either language', () => {
  for (const raw of MEDITATION_SESSIONS) {
    const english = [raw.subtitle, raw.description, ...raw.benefits].join('\n');
    expect(english).not.toMatch(
      /cortisol|hormon|stress reduction|reduces? (stress|anxiety|inflammation|redness)|circulation|heal|hydrat|inflammation/i,
    );
    const sinhala = localizeMeditation(raw, 'si');
    expect(sinhala.benefits).toHaveLength(raw.benefits.length);
    expect([sinhala.subtitle, sinhala.description, ...sinhala.benefits].join('\n')).not.toMatch(
      /කෝටිසෝල්|හෝමෝන|ආතතිය අඩු|කනස්සල්ල අඩු|ඉදිමුම|රතු පැහැය|සුව වී|සුව කර|සංසරණ|තෙතමනය වැඩි/,
    );
  }
});

it('tells the user when a completed session could not be saved', async () => {
  const storage: MeditationHistoryStorage = {
    load: async () => [],
    save: async () => {
      throw new Error('disk full');
    },
  };
  const root = await renderWithHistory(storage);
  press(root, `Open ${session.title}`);
  press(root, 'Start session timer');
  tick(minutes * 60);
  await act(async () => {});
  expect(texts(root)).toContain('This session could not be saved on this phone.');
  act(() => root.unmount());
});

it('shows Completed Sessions in Sinhala', async () => {
  const sinhala = localizeMeditation(session, 'si');
  let root!: renderer.ReactTestRenderer;
  await act(async () => {
    root = renderer.create(
      <LanguageProvider storage={createMemoryLanguageStorage('si')}>
        <MeditationScreen
          historyStorage={createMemoryMeditationHistoryStorage({
            'user-7': [entry('a', session.id, '2026-10-11T10:00:00Z', minutes * 60)],
          })}
        />
      </LanguageProvider>,
    );
  });
  expect(texts(root)).toContain(translate('si', 'meditation.historyTitle'));
  expect(historyTexts(root)).toContain(sinhala.title);
  expect(historyTexts(root)).toContain(translate('si', 'meditation.historyNote'));
  const row = root.root.findByProps({ testID: 'meditation-history-entry' });
  expect(row.props.accessibilityLabel).toContain(translate('si', 'meditation.historyDuration', { minutes }));
  act(() => root.unmount());
  setCurrentLanguage('en');
});

it('shows sessions and timer controls in Sinhala while keeping the same timer length', async () => {
  const sinhala = localizeMeditation(session, 'si');
  let root!: renderer.ReactTestRenderer;
  await act(async () => {
    root = renderer.create(
      <LanguageProvider storage={createMemoryLanguageStorage('si')}>
        <MeditationScreen />
      </LanguageProvider>,
    );
  });
  expect(texts(root)).toContain(translate('si', 'meditation.guided'));
  expect(texts(root)).toContain(sinhala.title);
  expect(texts(root)).not.toContain(session.title);

  press(root, translate('si', 'common.open', { title: sinhala.title }));
  expect(texts(root)).toContain(startClock);
  expect(texts(root)).toContain('ආරම්භ කිරීමට සූදානම්');

  press(root, translate('si', 'meditation.primaryA11y', { label: translate('si', 'meditation.start') }));
  tick(3);
  expect(texts(root)).toContain(`${String(minutes - 1).padStart(2, '0')}:57`);
  expect(texts(root)).toContain(translate('si', 'meditation.statusRunning'));
  act(() => root.unmount());
  setCurrentLanguage('en');
});
