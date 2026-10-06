/**
 * @format
 */

import 'react-native';
import React from 'react';
import { Linking, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { afterEach, expect, it, jest } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import AyurvedicHospitalsScreen from '../src/screens/hospitals/AyurvedicHospitalsScreen';
import { AYURVEDIC_HOSPITALS } from '../src/constants/ayurvedicHospitals';
import { Colors } from '../src/constants/theme';

const flatten = (root: renderer.ReactTestRenderer) =>
  root.root.findAllByType(Text).map(node => node.props.children).flat(Infinity).map(String);

const button = (root: renderer.ReactTestRenderer, label: string) =>
  root.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === label);

const renderScreen = async () => {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  let root!: renderer.ReactTestRenderer;
  await act(async () => {
    root = renderer.create(
      <AyurvedicHospitalsScreen
        navigation={navigation as never}
        route={{ key: 'h', name: 'AyurvedicHospitals' } as never}
      />,
    );
  });
  return { root, navigation };
};

afterEach(() => {
  jest.restoreAllMocks();
});

it('renders the hospital list with type badges, map buttons and the source note', async () => {
  const { root } = await renderScreen();
  const labels = flatten(root);

  expect(labels).toContain('Ayurvedic Hospitals');
  expect(labels).toContain('National Ayurvedic Teaching Hospital');
  expect(labels).toContain('Gampaha Wickramarachchi Ayurvedic Teaching Hospital');
  expect(labels).toContain('Bandaranaike Memorial Ayurvedic Research Institute');
  expect(labels).toContain('No. 325, Dr. N. M. Perera Mawatha, Colombo 08');
  expect(labels.filter(item => item === 'View on Map')).toHaveLength(AYURVEDIC_HOSPITALS.length);
  expect(labels).toContain('Government');
  expect(labels).toContain('Teaching');
  expect(labels.some(item => item.includes('Confirm services and opening hours directly'))).toBe(true);
  expect(root.root.findByType(TextInput).props.placeholder).toBe('Search hospitals or locations');

  act(() => root.unmount());
});

it('filters the list by search text and by type', async () => {
  const { root } = await renderScreen();

  act(() => {
    root.root.findByType(TextInput).props.onChangeText('Yakkala');
  });
  let labels = flatten(root);
  expect(labels).toContain('Gampaha Wickramarachchi Ayurvedic Teaching Hospital');
  expect(labels).not.toContain('National Ayurvedic Teaching Hospital');

  act(() => {
    root.root.findByType(TextInput).props.onChangeText('');
  });
  expect(flatten(root).filter(item => item === 'View on Map')).toHaveLength(AYURVEDIC_HOSPITALS.length);

  act(() => {
    button(root, 'Filter Research')?.props.onPress();
  });
  labels = flatten(root);
  expect(labels).toContain('Bandaranaike Memorial Ayurvedic Research Institute');
  expect(labels).not.toContain('National Ayurvedic Teaching Hospital');

  act(() => {
    button(root, 'Filter Provincial')?.props.onPress();
  });
  labels = flatten(root);
  expect(labels).toContain('Provincial Ayurveda Hospital - Pallekele');
  expect(labels).not.toContain('Bandaranaike Memorial Ayurvedic Research Institute');

  act(() => {
    root.root.findByType(TextInput).props.onChangeText('zzz');
  });
  expect(flatten(root)).toContain('No hospitals match that search and filter.');

  act(() => {
    root.root.findByType(TextInput).props.onChangeText('');
  });
  act(() => {
    button(root, 'Filter All')?.props.onPress();
  });
  expect(flatten(root).filter(item => item === 'View on Map')).toHaveLength(AYURVEDIC_HOSPITALS.length);

  act(() => root.unmount());
});

it('keeps Get Directions a readable secondary outline action', async () => {
  const { root } = await renderScreen();
  const directions = button(root, `Get directions to ${AYURVEDIC_HOSPITALS[0].name}`)!;
  const mapButton = button(root, `View ${AYURVEDIC_HOSPITALS[0].name} on Map`)!;
  const directionsStyle = StyleSheet.flatten(directions.props.style);
  const mapStyle = StyleSheet.flatten(mapButton.props.style);
  const label = directions.findByType(Text);

  expect(directionsStyle.backgroundColor).toBeUndefined();
  expect(mapStyle.backgroundColor).toBe(Colors.primaryDark);
  expect(directionsStyle.borderColor).toBe(Colors.primaryLight);
  expect(StyleSheet.flatten(label.props.style).color).toBe(Colors.primaryLight);

  act(() => root.unmount());
});

it('opens Google Maps for the selected hospital and goes Back to the previous screen', async () => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
  const { root, navigation } = await renderScreen();
  const national = AYURVEDIC_HOSPITALS[0];

  await act(async () => {
    await button(root, `View ${national.name} on Map`)?.props.onPress();
  });
  expect(openURL).toHaveBeenCalledTimes(1);
  const opened = String(openURL.mock.calls[0][0]);
  expect(opened).toContain('google.com/maps/search/?api=1&query=');
  expect(decodeURIComponent(opened)).toContain(national.mapQuery);

  await act(async () => {
    await button(root, `Get directions to ${national.name}`)?.props.onPress();
  });
  expect(String(openURL.mock.calls[1][0])).toContain('google.com/maps/dir/?api=1&destination=');

  act(() => {
    button(root, 'Back')?.props.onPress();
  });
  expect(navigation.goBack).toHaveBeenCalledTimes(1);

  act(() => root.unmount());
});
