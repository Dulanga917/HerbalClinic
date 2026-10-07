/**
 * @format
 */

import 'react-native';
import React from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { afterEach, expect, it, jest } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import AyurvedicTreatmentScreen from '../src/screens/treatment/AyurvedicTreatmentScreen';
import { LanguageProvider, createMemoryLanguageStorage, setCurrentLanguage } from '../src/i18n';

const flatten = (root: renderer.ReactTestRenderer) =>
  root.root.findAllByType(Text).map(node => node.props.children).flat(Infinity);

const press = (root: renderer.ReactTestRenderer, label: string) => {
  const target = root.root.findAllByType(TouchableOpacity).find(node => {
    const value = node.props.accessibilityLabel;
    return value === label;
  });
  expect(target).toBeTruthy();
  act(() => {
    target?.props.onPress();
  });
};

const renderScreen = async (storage = createMemoryLanguageStorage()) => {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() } as never;
  let root!: renderer.ReactTestRenderer;
  await act(async () => {
    root = renderer.create(
      <LanguageProvider storage={storage}>
        <AyurvedicTreatmentScreen
          navigation={navigation}
          route={{ key: 'q', name: 'AyurvedicTreatment' } as never}
        />
      </LanguageProvider>,
    );
  });
  return { root, navigation, storage };
};

afterEach(() => {
  setCurrentLanguage('en');
});

it('opens in the language saved globally instead of a separate questionnaire setting', async () => {
  const storage = createMemoryLanguageStorage('si');
  const { root } = await renderScreen(storage);

  const labels = flatten(root);
  expect(labels).toContain('ආයුර්වේද ප්‍රතිකාර');
  expect(labels).toContain('ප්‍රශ්නය 1 / 5');
  expect(labels).not.toContain('Ayurvedic Treatment');
  expect(root.root.findByProps({ testID: 'language-option-si' }).props.accessibilityState.selected).toBe(
    true,
  );

  act(() => {
    root.unmount();
  });
});

it('renders the bilingual questionnaire and keeps answers when language changes', async () => {
  const { root, storage } = await renderScreen();

  let labels = flatten(root);
  expect(labels).toContain('HerbalClinic');
  expect(labels).toContain('Ayurvedic Treatment');
  expect(labels).toContain('Skin');
  expect(labels).toContain('Body');
  expect(labels).toContain('Hair');
  expect(labels).toContain("Women's Health");
  expect(labels).toContain('Mental Well-being');
  expect(labels).toContain('Question 1 of 5');
  expect(labels.some(item => String(item).includes('not a medical diagnosis'))).toBe(true);

  const next = root.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === 'Next');
  expect(next?.props.disabled).toBe(true);

  press(root, 'Dry or tight');
  press(root, 'සිංහල');
  labels = flatten(root);
  expect(labels).toContain('ආයුර්වේද ප්‍රතිකාර');
  expect(labels).toContain('සම');
  expect(labels).toContain('වියළි හෝ තදව ඇත');
  expect(storage.value()).toBe('si');

  press(root, 'English');
  expect(storage.value()).toBe('en');
  labels = flatten(root);
  expect(labels).toContain('Ayurvedic Treatment');
  expect(labels).toContain('Dry or tight');

  press(root, 'Next');
  labels = flatten(root);
  expect(labels).toContain('Question 2 of 5');

  press(root, 'Previous');
  labels = flatten(root);
  expect(labels).toContain('Question 1 of 5');
  expect(labels).toContain('Dry or tight');

  act(() => {
    root.unmount();
  });
});

it('does not finish when required questions were skipped via the category chips', async () => {
  const { root } = await renderScreen();

  press(root, 'Mental Well-being');
  expect(flatten(root)).toContain('Question 5 of 5');
  press(root, 'Restless or worried');
  press(root, 'See guidance');

  const labels = flatten(root);
  expect(labels).not.toContain('Questionnaire self-care guidance');
  expect(labels).toContain('Question 1 of 5');

  act(() => {
    root.unmount();
  });
});

it('header Back leaves the questionnaire while Previous steps back through questions', async () => {
  const { root, navigation } = await renderScreen();
  const goBack = (navigation as unknown as { goBack: jest.Mock }).goBack;

  press(root, 'Dry or tight');
  press(root, 'Next');
  expect(flatten(root)).toContain('Question 2 of 5');

  press(root, 'Previous');
  expect(flatten(root)).toContain('Question 1 of 5');
  expect(goBack).not.toHaveBeenCalled();

  press(root, 'Next');
  expect(flatten(root)).toContain('Question 2 of 5');
  press(root, 'Back');
  expect(goBack).toHaveBeenCalledTimes(1);
  expect(flatten(root)).toContain('Question 2 of 5');

  act(() => {
    root.unmount();
  });
});

it('scrolls back to the top when the question changes', async () => {
  const { root } = await renderScreen();
  const scrollTo = root.root.findByType(ScrollView).instance.scrollTo as jest.Mock;
  scrollTo.mockClear();

  press(root, 'Dry or tight');
  expect(scrollTo).not.toHaveBeenCalled();

  press(root, 'Next');
  expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });

  scrollTo.mockClear();
  press(root, 'Previous');
  expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });

  act(() => {
    root.unmount();
  });
});

it('allows the optional womens-health question to be skipped and shows questionnaire guidance', async () => {
  const { root } = await renderScreen();

  press(root, 'Dry or tight');
  press(root, 'Next');
  press(root, 'Light, cool, or easily unsettled');
  press(root, 'Next');
  press(root, 'Dry or frizzy');
  press(root, 'Next');
  press(root, 'Not applicable / skip');
  press(root, 'Next');
  press(root, 'Restless or worried');
  press(root, 'See guidance');

  const labels = flatten(root);
  expect(labels).toContain('Questionnaire self-care guidance');
  expect(labels.some(item => String(item).includes('questionnaire-based'))).toBe(true);
  expect(labels.some(item => String(item).includes('no model confidence score'))).toBe(true);
  expect(labels.some(item => String(item).includes('Vata-type self-care'))).toBe(true);

  act(() => {
    root.unmount();
  });
});
