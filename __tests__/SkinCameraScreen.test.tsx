/**
 * @format
 */

import 'react-native';
import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity } from 'react-native';
import { beforeEach, expect, it, jest } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import SkinCameraScreen from '../src/screens/skin/SkinCameraScreen';
import { openGallery } from '../src/utils/imageUtils';

jest.mock('../src/utils/imageUtils', () => ({
  openCamera: jest.fn(async () => null),
  openGallery: jest.fn(async () => ({
    uri: 'file:///data/test-photo.jpg',
    fileName: 'test-photo.jpg',
    fileSize: 1024,
    width: 640,
    height: 480,
  })),
}));

const texts = (root: renderer.ReactTestRenderer) =>
  root.root.findAllByType(Text).map(node => node.props.children).flat(Infinity).map(String);

const button = (root: renderer.ReactTestRenderer, label: string) =>
  root.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === label);

const renderScreen = (analysisType: 'type' | 'issue') => {
  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    addListener: jest.fn((_event: string, _callback: () => void) => () => undefined),
  };
  let root!: renderer.ReactTestRenderer;
  act(() => {
    root = renderer.create(
      <SkinCameraScreen navigation={navigation as never} route={{ params: { analysisType } } as never} />,
    );
  });
  return { root, navigation };
};

beforeEach(() => {
  (openGallery as jest.Mock).mockClear();
});

it('keeps the primary action disabled until a photo is chosen', () => {
  const { root, navigation } = renderScreen('type');
  expect(texts(root)).toContain('Skin Type Assessment');
  const classify = button(root, 'Classify on Device');
  expect(classify?.props.disabled).toBe(true);
  expect(texts(root)).toContain('Add a photo first to continue.');
  act(() => classify?.props.onPress());
  expect(navigation.navigate).not.toHaveBeenCalled();
  act(() => root.unmount());
});

it('previews the chosen photo, offers Change Photo and opens the result once', async () => {
  const { root, navigation } = renderScreen('issue');
  await act(async () => {
    await button(root, 'Choose photo from gallery')?.props.onPress();
  });

  expect(root.root.findByType(Image).props.source).toEqual({ uri: 'file:///data/test-photo.jpg' });
  expect(texts(root)).toContain('Change Photo');
  expect(button(root, 'Change photo from gallery')).toBeTruthy();

  const guidance = button(root, 'Get AI Skin Guidance');
  expect(guidance?.props.disabled).toBe(false);
  act(() => {
    guidance?.props.onPress();
    guidance?.props.onPress();
  });
  expect(navigation.navigate).toHaveBeenCalledTimes(1);
  expect(navigation.navigate).toHaveBeenCalledWith('SkinResult', {
    imageUri: 'file:///data/test-photo.jpg',
    analysisType: 'issue',
  });
  act(() => root.unmount());
});

it('returns to the top of the photo screen when it regains focus after Scan Again', async () => {
  const { root, navigation } = renderScreen('issue');
  await act(async () => {
    await button(root, 'Choose photo from gallery')?.props.onPress();
  });
  act(() => button(root, 'Get AI Skin Guidance')?.props.onPress());
  expect(navigation.navigate).toHaveBeenCalledTimes(1);

  const focusCall = (navigation.addListener.mock.calls as unknown as [string, () => void][]).find(
    ([event]) => event === 'focus',
  );
  expect(focusCall).toBeTruthy();
  const scrollTo = root.root.findByType(ScrollView).instance.scrollTo as jest.Mock;
  scrollTo.mockClear();
  act(() => focusCall![1]());
  expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });

  act(() => button(root, 'Get AI Skin Guidance')?.props.onPress());
  expect(navigation.navigate).toHaveBeenCalledTimes(2);
  act(() => root.unmount());
});

const consentBox = (root: renderer.ReactTestRenderer) =>
  root.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityRole === 'checkbox');

it('offers an unticked Groq backup consent for AI Skin Guidance and sends the flag only when ticked', async () => {
  const { root, navigation } = renderScreen('issue');
  expect(consentBox(root)).toBeUndefined();
  await act(async () => {
    await button(root, 'Choose photo from gallery')?.props.onPress();
  });

  const box = consentBox(root);
  expect(box?.props.accessibilityLabel).toMatch(/Groq \(a backup AI service\)/);
  expect(box?.props.accessibilityState).toEqual({ checked: false });
  expect(texts(root).join(' ')).toMatch(/sent to Groq only if you tick/);

  act(() => consentBox(root)?.props.onPress());
  expect(consentBox(root)?.props.accessibilityState).toEqual({ checked: true });
  act(() => button(root, 'Get AI Skin Guidance')?.props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith('SkinResult', {
    imageUri: 'file:///data/test-photo.jpg',
    analysisType: 'issue',
    allowBackupProvider: true,
  });
  act(() => root.unmount());
});

it('resets the backup consent when a new photo is chosen', async () => {
  const { root, navigation } = renderScreen('issue');
  await act(async () => {
    await button(root, 'Choose photo from gallery')?.props.onPress();
  });
  act(() => consentBox(root)?.props.onPress());
  expect(consentBox(root)?.props.accessibilityState).toEqual({ checked: true });

  await act(async () => {
    await button(root, 'Change photo from gallery')?.props.onPress();
  });
  expect(consentBox(root)?.props.accessibilityState).toEqual({ checked: false });
  act(() => button(root, 'Get AI Skin Guidance')?.props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith('SkinResult', {
    imageUri: 'file:///data/test-photo.jpg',
    analysisType: 'issue',
  });
  act(() => root.unmount());
});

it('never offers the backup consent for the on-device Skin Type Assessment', async () => {
  const { root } = renderScreen('type');
  await act(async () => {
    await button(root, 'Choose photo from gallery')?.props.onPress();
  });
  expect(consentBox(root)).toBeUndefined();
  expect(texts(root).join(' ')).not.toMatch(/Groq/);
  act(() => root.unmount());
});

it('ignores a second picker tap while the first picker is still open', async () => {
  let resolvePick!: (value: null) => void;
  (openGallery as jest.Mock).mockImplementationOnce(
    () => new Promise(resolve => { resolvePick = resolve as (value: null) => void; }),
  );
  const { root } = renderScreen('type');
  const gallery = button(root, 'Choose photo from gallery');
  act(() => {
    gallery?.props.onPress();
    gallery?.props.onPress();
  });
  expect(openGallery).toHaveBeenCalledTimes(1);
  await act(async () => {
    resolvePick(null);
  });
  act(() => root.unmount());
});
