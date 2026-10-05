export const SKIN_GUIDANCE_DISCLAIMER =
  'This information is for general educational and self-care purposes and is not a medical diagnosis. Consult a qualified healthcare professional for medical concerns.';

export type SkinGuidanceStatus = 'possible_concern' | 'no_clear_concern' | 'unable_to_assess';

export interface SkinGuidanceHerb {
  name: string;
  emoji: string;
  benefit: string;
  usage: string;
}

export interface LiveSkinGuidance {
  kind: 'live';
  status: SkinGuidanceStatus;
  concern: string | null;
  observations: string;
  factors: string[];
  herbs: SkinGuidanceHerb[];
  selfCare: string[];
}

export interface OfflineSkinGuidance {
  kind: 'offline';
  summary: string;
  tips: string[];
  herbs: SkinGuidanceHerb[];
}

export type SkinGuidanceResult = LiveSkinGuidance | OfflineSkinGuidance;

const STATUSES: SkinGuidanceStatus[] = ['possible_concern', 'no_clear_concern', 'unable_to_assess'];
const MAX_TEXT_LENGTH = 400;
const MAX_ITEM_LENGTH = 200;
const MAX_LIST_ITEMS = 5;
const MAX_HERBS = 4;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cleanText = (value: unknown, maxLength: number): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, maxLength) : '';

const cleanList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map(item => cleanText(item, MAX_ITEM_LENGTH))
        .filter(Boolean)
        .slice(0, MAX_LIST_ITEMS)
    : [];

const cleanHerbs = (value: unknown): SkinGuidanceHerb[] =>
  Array.isArray(value)
    ? value
        .filter(isRecord)
        .map(herb => ({
          name: cleanText(herb.name, 60),
          emoji: cleanText(herb.emoji, 16) || '🌿',
          benefit: cleanText(herb.benefit, MAX_ITEM_LENGTH),
          usage: cleanText(herb.usage, MAX_ITEM_LENGTH),
        }))
        .filter(herb => herb.name)
        .slice(0, MAX_HERBS)
    : [];

/**
 * Validates the server's skin guidance payload. Unknown fields (including any severity or
 * confidence a model might still emit) are ignored. Returns null when nothing usable remains.
 */
export const parseSkinGuidance = (raw: unknown): LiveSkinGuidance | null => {
  if (!isRecord(raw)) {
    return null;
  }
  let status: SkinGuidanceStatus = STATUSES.includes(raw.status as SkinGuidanceStatus)
    ? (raw.status as SkinGuidanceStatus)
    : 'unable_to_assess';
  const concern = status === 'possible_concern' ? cleanText(raw.concern, 80) : '';
  if (status === 'possible_concern' && !concern) {
    status = 'unable_to_assess';
  }
  const guidance: LiveSkinGuidance = {
    kind: 'live',
    status,
    concern: concern || null,
    observations: cleanText(raw.observations, MAX_TEXT_LENGTH),
    factors: cleanList(raw.factors),
    herbs: cleanHerbs(raw.herbs),
    selfCare: cleanList(raw.selfCare),
  };
  const hasContent =
    guidance.concern ||
    guidance.observations ||
    guidance.factors.length > 0 ||
    guidance.herbs.length > 0 ||
    guidance.selfCare.length > 0;
  return hasContent ? guidance : null;
};
