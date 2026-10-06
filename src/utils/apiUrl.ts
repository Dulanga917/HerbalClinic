const HTTPS_ORIGIN_WITH_OPTIONAL_PATH =
  /^https:\/\/[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)*(:\d{1,5})?(\/[A-Za-z0-9._~-]+)*$/;

// Loopback, emulator, unspecified and private-LAN hosts only work next to a developer
// machine, so a release build pointing at one would silently fail on users' phones.
const LOCAL_ONLY_HOST =
  /^(localhost|.*\.localhost|0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/i;

const hostOf = (url: string): string => url.replace(/^https:\/\//, '').split(/[/:]/)[0];

type ResolveApiBaseUrlInput = {
  isDev: boolean;
  platform: string;
  productionUrl: string;
};

/**
 * Development builds talk to the local API over plain HTTP (127.0.0.1 via adb reverse).
 * Release builds only accept an https:// URL without credentials, query, or fragment;
 * anything else resolves to an empty string so requests fail closed.
 */
export const resolveApiBaseUrl = ({
  isDev,
  platform,
  productionUrl,
}: ResolveApiBaseUrlInput): string => {
  if (isDev) {
    // USB devices and emulators both reach the host through adb reverse → 127.0.0.1.
    // 10.0.2.2 only works on the emulator and fails on a physical phone.
    return platform === 'android' ? 'http://127.0.0.1:3001' : 'http://localhost:3001';
  }

  const candidate = productionUrl.trim().replace(/\/+$/, '');
  if (!HTTPS_ORIGIN_WITH_OPTIONAL_PATH.test(candidate) || LOCAL_ONLY_HOST.test(hostOf(candidate))) {
    return '';
  }
  return candidate;
};
