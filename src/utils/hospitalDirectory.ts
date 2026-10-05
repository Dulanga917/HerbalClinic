import { Linking, Platform } from 'react-native';
import {
  AYURVEDIC_HOSPITALS,
  AyurvedicHospital,
  HospitalType,
} from '../constants/ayurvedicHospitals';

export type HospitalFilter = 'all' | 'government' | HospitalType;

export type MapOpenResult = 'opened' | 'browser-fallback' | 'failed';

type LinkOpener = Pick<typeof Linking, 'openURL'>;

export const listHospitals = (): AyurvedicHospital[] => AYURVEDIC_HOSPITALS;

export const filterHospitals = (
  hospitals: readonly AyurvedicHospital[],
  query: string,
  filter: HospitalFilter,
): AyurvedicHospital[] => {
  const needle = query.trim().toLowerCase();

  return hospitals.filter(hospital => {
    const filterMatches =
      filter === 'all' ||
      (filter === 'government' ? hospital.government : hospital.type === filter);
    if (!filterMatches) {
      return false;
    }
    if (!needle) {
      return true;
    }
    return [hospital.name, hospital.city, hospital.district, hospital.address]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });
};

export const mapSearchWebUrl = (hospital: AyurvedicHospital): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.mapQuery)}`;

export const mapSearchAppUrl = (hospital: AyurvedicHospital): string =>
  `geo:0,0?q=${encodeURIComponent(hospital.mapQuery)}`;

export const directionsWebUrl = (hospital: AyurvedicHospital): string =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hospital.mapQuery)}`;

const openWithFallback = async (
  primary: string,
  fallback: string | null,
  linking: LinkOpener,
): Promise<MapOpenResult> => {
  try {
    await linking.openURL(primary);
    return 'opened';
  } catch {
    if (!fallback) {
      return 'failed';
    }
    try {
      await linking.openURL(fallback);
      return 'browser-fallback';
    } catch {
      return 'failed';
    }
  }
};

// On Android the geo: intent is handled by Google Maps when installed; if no
// maps app can handle it, the Google Maps web URL opens in the browser.
export const openHospitalOnMap = (
  hospital: AyurvedicHospital,
  linking: LinkOpener = Linking,
  platform: string = Platform.OS,
): Promise<MapOpenResult> =>
  platform === 'android'
    ? openWithFallback(mapSearchAppUrl(hospital), mapSearchWebUrl(hospital), linking)
    : openWithFallback(mapSearchWebUrl(hospital), null, linking);

// The Google Maps directions URL needs no location permission: Maps picks the
// starting point itself after it opens.
export const openHospitalDirections = (
  hospital: AyurvedicHospital,
  linking: LinkOpener = Linking,
): Promise<MapOpenResult> => openWithFallback(directionsWebUrl(hospital), null, linking);
