import { describe, expect, it, jest } from '@jest/globals';
import { AYURVEDIC_HOSPITALS } from '../src/constants/ayurvedicHospitals';
import {
  directionsWebUrl,
  filterHospitals,
  listHospitals,
  mapSearchAppUrl,
  mapSearchWebUrl,
  openHospitalDirections,
  openHospitalOnMap,
} from '../src/utils/hospitalDirectory';

const national = AYURVEDIC_HOSPITALS.find(item => item.id === 'national-ayurveda-borella')!;

const opener = (outcomes: boolean[]) => {
  const calls: string[] = [];
  const openURL = jest.fn(async (url: string) => {
    calls.push(url);
    const ok = outcomes.shift();
    if (!ok) {
      throw new Error('No activity found');
    }
    return true;
  });
  return { linking: { openURL } as never, calls };
};

describe('Ayurvedic hospital directory', () => {
  const hospitals = listHospitals();

  it('lists government hospitals with an official source and no unverified contact data', () => {
    expect(hospitals.length).toBeGreaterThanOrEqual(10);
    expect(hospitals.map(item => item.name)).toEqual(
      expect.arrayContaining([
        'National Ayurvedic Teaching Hospital',
        'Gampaha Wickramarachchi Ayurveda Teaching Hospital',
        'Bandaranaike Memorial Ayurvedic Research Institute',
      ]),
    );
    for (const hospital of hospitals) {
      expect(hospital.government).toBe(true);
      expect(hospital.source).toMatch(/\.gov\.lk|ayudeptncp\.lk/);
      expect(hospital.mapQuery).toContain('Sri Lanka');
      expect(Object.keys(hospital)).not.toEqual(expect.arrayContaining(['phone']));
      expect(Object.keys(hospital)).not.toEqual(expect.arrayContaining(['latitude']));
    }
    expect(new Set(hospitals.map(item => item.id)).size).toBe(hospitals.length);
  });

  it('searches by hospital name', () => {
    const result = filterHospitals(hospitals, 'wickramarachchi', 'all');
    expect(result.map(item => item.id)).toEqual(['gampaha-wickramarachchi-yakkala']);
  });

  it('searches by city and by district', () => {
    expect(filterHospitals(hospitals, 'Borella', 'all').map(item => item.id)).toEqual([
      'national-ayurveda-borella',
    ]);
    const anuradhapura = filterHospitals(hospitals, 'anuradhapura', 'all');
    expect(anuradhapura.map(item => item.id)).toEqual(
      expect.arrayContaining([
        'kidney-research-medawachchiya',
        'traditional-research-mihintale',
        'provincial-anuradhapura',
      ]),
    );
    expect(filterHospitals(hospitals, 'no such place', 'all')).toEqual([]);
  });

  it('filters by hospital type and combines with search', () => {
    const teaching = filterHospitals(hospitals, '', 'teaching');
    expect(teaching.every(item => item.type === 'teaching')).toBe(true);
    expect(teaching).toHaveLength(2);
    expect(filterHospitals(hospitals, '', 'research').every(item => item.type === 'research')).toBe(true);
    expect(filterHospitals(hospitals, '', 'provincial').every(item => item.type === 'provincial')).toBe(true);
    expect(filterHospitals(hospitals, '', 'government')).toHaveLength(hospitals.length);
    expect(filterHospitals(hospitals, 'anuradhapura', 'provincial').map(item => item.id)).toEqual([
      'provincial-anuradhapura',
    ]);
  });

  it('builds Google Maps search and directions URLs from the verified name and location', () => {
    expect(mapSearchWebUrl(national)).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(national.mapQuery)}`,
    );
    expect(mapSearchAppUrl(national)).toBe(`geo:0,0?q=${encodeURIComponent(national.mapQuery)}`);
    expect(directionsWebUrl(national)).toBe(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(national.mapQuery)}`,
    );
    expect(decodeURIComponent(mapSearchWebUrl(national))).toContain('Borella');
  });

  it('opens the maps app first on Android', async () => {
    const { linking, calls } = opener([true]);
    await expect(openHospitalOnMap(national, linking, 'android')).resolves.toBe('opened');
    expect(calls).toEqual([mapSearchAppUrl(national)]);
  });

  it('falls back to the Google Maps web URL in the browser when no maps app is available', async () => {
    const { linking, calls } = opener([false, true]);
    await expect(openHospitalOnMap(national, linking, 'android')).resolves.toBe('browser-fallback');
    expect(calls).toEqual([mapSearchAppUrl(national), mapSearchWebUrl(national)]);
  });

  it('reports failure when neither maps nor the browser can open', async () => {
    const { linking } = opener([false, false]);
    await expect(openHospitalOnMap(national, linking, 'android')).resolves.toBe('failed');
  });

  it('opens the web URL directly on iOS and for directions', async () => {
    const ios = opener([true]);
    await expect(openHospitalOnMap(national, ios.linking, 'ios')).resolves.toBe('opened');
    expect(ios.calls).toEqual([mapSearchWebUrl(national)]);

    const directions = opener([true]);
    await expect(openHospitalDirections(national, directions.linking)).resolves.toBe('opened');
    expect(directions.calls).toEqual([directionsWebUrl(national)]);
  });
});
