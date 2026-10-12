/**
 * @format
 */

import 'react-native';
import React from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { it, expect, jest } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import ProfileScreen from '../src/screens/home/ProfileScreen';
import { ApiError, fetchScanHistory, ScanRecord } from '../src/services/apiClient';
import { LanguageProvider, createMemoryLanguageStorage, setCurrentLanguage, translate } from '../src/i18n';

const mockLogout = jest.fn(async () => undefined);

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      dosha: 'Vata',
      doshaConfidence: 82,
      scanCount: 3,
    },
    sessionToken: 'test-session',
    logout: mockLogout,
  }),
}));

jest.mock('../src/services/apiClient', () => ({
  ...jest.requireActual<typeof import('../src/services/apiClient')>('../src/services/apiClient'),
  fetchScanHistory: jest.fn(async () => ({ scans: [] })),
}));

const mockedHistory = fetchScanHistory as jest.Mock<typeof fetchScanHistory>;

const openHistory = async () => {
  const navigation = { navigate: jest.fn() } as never;
  let root!: renderer.ReactTestRenderer;
  await act(async () => {
    root = renderer.create(<ProfileScreen navigation={navigation} route={{} as never} />);
  });
  const historyButton = root.root
    .findAllByType(TouchableOpacity)
    .find(node => node.props.accessibilityLabel === 'Scan History');
  await act(async () => {
    historyButton!.props.onPress();
  });
  return root;
};

it('renders the authenticated user name and email', () => {
  const navigation = { navigate: jest.fn() } as never;
  const root = renderer.create(<ProfileScreen navigation={navigation} route={{} as never} />);
  const labels = root.root.findAllByType(Text).map(node => node.props.children);
  expect(labels).toContain('Ada Lovelace');
  expect(labels).toContain('ada@example.com');
  expect(labels).not.toContain('Herbal User');
  expect(labels).not.toContain('user@herbalclinic.com');
  expect(labels).not.toContain('Sessions');
  expect(labels).not.toContain('Plans');
  expect(labels).toContain('Meditation Sessions');
  expect(labels).not.toContain('Meditation History');
});

it('changes the app language from Profile immediately, including Scan History', async () => {
  mockedHistory.mockResolvedValueOnce({
    scans: [
      { id: 2, dosha: null, confidence: null, imageReference: 'b.jpg', createdAt: '2026-09-30T10:00:00Z' },
      { id: 1, dosha: 'Vata', confidence: 82, imageReference: 'c.jpg', createdAt: '2026-09-29T10:00:00Z' },
    ],
  });
  const storage = createMemoryLanguageStorage();
  let root!: renderer.ReactTestRenderer;
  await act(async () => {
    root = renderer.create(
      <LanguageProvider storage={storage}>
        <ProfileScreen navigation={{ navigate: jest.fn() } as never} route={{} as never} />
      </LanguageProvider>,
    );
  });
  const flatten = (children: unknown): string =>
    Array.isArray(children) ? children.map(flatten).join('') : children == null ? '' : String(children);
  const text = () => root.root.findAllByType(Text).map(node => flatten(node.props.children)).join('\n');

  expect(text()).toContain('Language');
  expect(text()).toContain('Meditation Sessions');

  act(() => root.root.findByProps({ testID: 'language-option-si' }).props.onPress());
  expect(storage.value()).toBe('si');
  expect(text()).toContain(translate('si', 'language.label'));
  expect(text()).toContain('දෝෂය: වාත (Vata)');
  expect(text()).toContain('Ada Lovelace');
  expect(text()).not.toContain('Meditation Sessions');
  expect(text()).toContain(translate('si', 'profile.signOut'));

  const history = root.root
    .findAllByType(TouchableOpacity)
    .find(node => node.props.accessibilityLabel === translate('si', 'profile.menu.history'))!;
  await act(async () => {
    history.props.onPress();
  });
  expect(text()).toContain(translate('si', 'result.modelConfidence', { value: 82 }));
  expect(text()).toContain(translate('si', 'profile.historyAiTitle'));
  expect(text()).toContain(translate('si', 'profile.historyAiMeta'));
  act(() => root.unmount());
  setCurrentLanguage('en');
});

it('shows model confidence only for Dosha scans in Scan History', async () => {
  (fetchScanHistory as jest.Mock<typeof fetchScanHistory>).mockResolvedValueOnce({
    scans: [
      { id: 3, dosha: null, confidence: 0, imageReference: 'a.jpg', createdAt: '2026-10-01T10:00:00Z' },
      { id: 2, dosha: null, confidence: 88, imageReference: 'b.jpg', createdAt: '2026-09-30T10:00:00Z' },
      { id: 1, dosha: 'Vata', confidence: 82, imageReference: 'c.jpg', createdAt: '2026-09-29T10:00:00Z' },
    ],
  });
  const navigation = { navigate: jest.fn() } as never;
  let root!: renderer.ReactTestRenderer;
  await act(async () => {
    root = renderer.create(<ProfileScreen navigation={navigation} route={{} as never} />);
  });
  const historyButton = root.root
    .findAllByType(TouchableOpacity)
    .find(node => node.props.accessibilityLabel === 'Scan History');
  await act(async () => {
    historyButton!.props.onPress();
  });

  const flatten = (children: unknown): string =>
    Array.isArray(children) ? children.map(flatten).join('') : children == null ? '' : String(children);
  const text = root.root.findAllByType(Text).map(node => flatten(node.props.children)).join('\n');

  expect(text).toContain('82% model confidence');
  expect(text).not.toContain('0% model confidence');
  expect(text).not.toContain('88% model confidence');
  expect(text).not.toMatch(/\b88\b|Skin-issue scan|Detected|Severity/);
  expect(text.match(/AI skin guidance/g)).toHaveLength(2);
  expect(text.match(/General guidance, no confidence score/g)).toHaveLength(2);
});

it('renders a long Scan History in a scrollable list that shrinks to fit the modal', async () => {
  const scans: ScanRecord[] = Array.from({ length: 40 }, (_, i) => ({
    id: 40 - i,
    dosha: i % 2 === 0 ? 'Pitta' : null,
    confidence: i % 2 === 0 ? 60 + (i % 30) : null,
    imageReference: `scan-${i}.jpg`,
    createdAt: '2026-10-01T10:00:00Z',
  }));
  mockedHistory.mockResolvedValueOnce({ scans });
  const root = await openHistory();

  const list = root.root.findByProps({ testID: 'scan-history-list' });
  expect(list.type).toBe(FlatList);
  expect(list.props.data).toHaveLength(40);
  expect(list.props.scrollEnabled).not.toBe(false);
  expect(StyleSheet.flatten(list.props.style)).toMatchObject({ flexGrow: 0, flexShrink: 1 });
  expect(root.root.findByType(FlatList).findByType(ScrollView)).toBeTruthy();

  const flatten = (children: unknown): string =>
    Array.isArray(children) ? children.map(flatten).join('') : children == null ? '' : String(children);
  const text = root.root.findAllByType(Text).map(node => flatten(node.props.children)).join('\n');
  expect(text).toContain('60% model confidence');
  expect(text).toContain('General guidance, no confidence score');
  expect(text).toContain('Close');
});

it('shows scan counts, a Dosha chart and a dated timeline above the Scan History list', async () => {
  mockedHistory.mockResolvedValueOnce({
    scans: [
      { id: 4, dosha: 'Pitta', confidence: 91, imageReference: 'd.jpg', createdAt: '2026-10-04T10:00:00Z' },
      { id: 3, dosha: null, confidence: null, imageReference: 'c.jpg', createdAt: '2026-10-03T10:00:00Z' },
      { id: 2, dosha: 'Vata', confidence: 70, imageReference: 'b.jpg', createdAt: '2026-10-02T10:00:00Z' },
      { id: 1, dosha: 'Pitta', confidence: 85, imageReference: 'a.jpg', createdAt: '2026-10-01T10:00:00Z' },
    ],
  });
  const root = await openHistory();
  const list = root.root.findByProps({ testID: 'scan-history-list' });
  const chart = list.findByProps({ testID: 'scan-history-chart' });

  const flatten = (children: unknown): string =>
    Array.isArray(children) ? children.map(flatten).join('') : children == null ? '' : String(children);
  const chartText = chart.findAllByType(Text).map(node => flatten(node.props.children));

  expect(chartText).toEqual(expect.arrayContaining(['4', 'All scans', '3', 'Skin Type', '1', 'AI guidance']));
  expect(chart.findByProps({ testID: 'scan-chart-bar-Pitta' }).props.accessibilityLabel).toBe('Pitta: 2 scans');
  expect(chart.findByProps({ testID: 'scan-chart-bar-Vata' }).props.accessibilityLabel).toBe('Vata: 1 scans');
  expect(chart.findAllByProps({ testID: 'scan-chart-bar-Kapha' })).toHaveLength(0);

  const timeline = chart.findByProps({ testID: 'scan-history-timeline' });
  const timelineText = timeline.findAllByType(Text).map(node => flatten(node.props.children));
  expect(timelineText).toEqual(['10-01', 'Pitta', '10-02', 'Vata', '10-04', 'Pitta']);

  expect(chartText.join('\n')).toContain('not a sign of medical improvement or worsening');
  expect(chartText.join('\n')).not.toMatch(/improved|getting better|progress/i);
  expect(list.props.data).toHaveLength(4);
});

it('shows the Scan History chart in Sinhala', async () => {
  mockedHistory.mockResolvedValueOnce({
    scans: [{ id: 1, dosha: 'Vata', confidence: 82, imageReference: 'a.jpg', createdAt: '2026-10-01T10:00:00Z' }],
  });
  let root!: renderer.ReactTestRenderer;
  await act(async () => {
    root = renderer.create(
      <LanguageProvider storage={createMemoryLanguageStorage('si')}>
        <ProfileScreen navigation={{ navigate: jest.fn() } as never} route={{} as never} />
      </LanguageProvider>,
    );
  });
  const history = root.root
    .findAllByType(TouchableOpacity)
    .find(node => node.props.accessibilityLabel === translate('si', 'profile.menu.history'))!;
  await act(async () => {
    history.props.onPress();
  });
  const chart = root.root.findByProps({ testID: 'scan-history-chart' });
  const chartText = chart.findAllByType(Text).map(node => node.props.children);
  expect(chartText).toContain(translate('si', 'scanChart.doshaTitle'));
  expect(chartText).toContain(translate('si', 'scanChart.note'));
  expect(chartText).toContain('වාත (Vata)');
  expect(chart.findByProps({ testID: 'scan-chart-bar-Vata' }).props.accessibilityLabel).toBe(
    translate('si', 'scanChart.barA11y', { dosha: 'වාත (Vata)', count: 1 }),
  );
  act(() => root.unmount());
  setCurrentLanguage('en');
});

it('keeps the empty state when there are no saved scans', async () => {
  mockedHistory.mockResolvedValueOnce({ scans: [] });
  const root = await openHistory();
  const labels = root.root.findAllByType(Text).map(node => node.props.children);
  expect(labels).toContain('No saved scans for this account yet.');
  expect(root.root.findAllByProps({ testID: 'scan-history-list' })).toHaveLength(0);
});

it('leaves an expired session to the central handler instead of showing another alert', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  mockedHistory.mockRejectedValueOnce(new ApiError('Please sign in again.', 401, 'SESSION_INVALID'));
  await openHistory();
  expect(alertSpy).not.toHaveBeenCalled();
  alertSpy.mockRestore();
});

it('still reports other Scan History errors', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  mockedHistory.mockRejectedValueOnce(new ApiError('Something went wrong. Please try again.', 500, null));
  await openHistory();
  expect(alertSpy).toHaveBeenCalledWith('Scan History', 'Something went wrong. Please try again.');
  expect(mockLogout).not.toHaveBeenCalled();
  alertSpy.mockRestore();
});
