/**
 * @format
 */

import 'react-native';
import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity } from 'react-native';
import { expect, it, jest } from '@jest/globals';
import renderer, { act, ReactTestInstance } from 'react-test-renderer';
import HerbalTreatmentScreen from '../src/screens/herbal/HerbalTreatmentScreen';

const mockGetHerbalRecommendations = jest.fn(async () => ({
  offline: true,
  herbs: Array.from({ length: 6 }, (_, i) => ({
    name: `Herb ${i + 1}`,
    emoji: '🌿',
    benefit: 'Soothing',
    usage: 'Apply a thin layer and rinse after 15 minutes.',
  })),
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: '1', dosha: 'Vata' } }),
}));

jest.mock('../src/services/geminiService', () => ({
  __esModule: true,
  default: { getHerbalRecommendations: (...args: unknown[]) => mockGetHerbalRecommendations(...(args as [])) },
}));

const planModal = (root: renderer.ReactTestRenderer) => {
  const modals = root.root.findAllByType(Modal);
  expect(modals).toHaveLength(2);
  return modals[1];
};

const hasAncestor = (node: ReactTestInstance, type: unknown) => {
  let current = node.parent;
  while (current) {
    if (current.type === type) {
      return true;
    }
    current = current.parent;
  }
  return false;
};

it('pins the herbal plan Close control outside the scrolling plan content', async () => {
  let root!: renderer.ReactTestRenderer;
  await act(async () => {
    root = renderer.create(<HerbalTreatmentScreen />);
  });
  expect(planModal(root).props.visible).toBe(false);

  const open = root.root
    .findAllByType(TouchableOpacity)
    .find(node => node.props.accessibilityLabel === 'Get AI herbal recommendation')!;
  await act(async () => {
    await open.props.onPress();
  });
  expect(mockGetHerbalRecommendations).toHaveBeenCalledWith('Vata dosha skin wellness', 'Vata');

  const modal = planModal(root);
  expect(modal.props.visible).toBe(true);
  const labels = modal.findAllByType(Text).map(node => node.props.children).flat(Infinity);
  expect(labels).toContain('Herbal plan');
  expect(labels).toContain('Herb 6');
  expect(labels).toContain('Offline library guidance — not a live Gemini response');
  expect(labels).toContain(
    'Static herb-library guidance while Gemini is unavailable. Not a medical diagnosis.',
  );

  const closeControls = modal
    .findAllByType(TouchableOpacity)
    .filter(node => node.props.accessibilityLabel === 'Close herbal plan');
  const pinned = closeControls.filter(node => !hasAncestor(node, ScrollView));
  expect(pinned).toHaveLength(1);
  expect(modal.findAllByType(ScrollView)).toHaveLength(1);

  act(() => pinned[0].props.onPress());
  expect(planModal(root).props.visible).toBe(false);
  act(() => root.unmount());
});
