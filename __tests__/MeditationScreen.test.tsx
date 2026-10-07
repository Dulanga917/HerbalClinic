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

it('stops at 00:00 and offers a restart', () => {
  let root!: renderer.ReactTestRenderer;
  act(() => {
    root = renderer.create(<MeditationScreen />);
  });
  press(root, `Open ${session.title}`);
  press(root, 'Start session timer');
  tick(minutes * 60 + 5);
  expect(texts(root)).toContain('00:00');
  expect(texts(root)).toContain('Session complete');
  expect(button(root, 'Restart session timer')).toBeTruthy();

  press(root, 'Close session');
  expect(texts(root)).not.toContain('00:00');
  act(() => root.unmount());
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
