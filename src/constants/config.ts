/**
 * Public app configuration. Do not put secrets here.
 * Gemini keys stay on the HerbalClinic API server.
 */
import { Platform } from 'react-native';
import { resolveApiBaseUrl } from '../utils/apiUrl';

/**
 * Public HTTPS address of the HerbalClinic API for release builds, for example
 * 'https://api.your-domain.example'. Release builds ignore it unless it is a valid
 * https:// URL, so a missing value fails closed instead of falling back to HTTP.
 */
const PRODUCTION_API_BASE_URL = '';

const Config = {
  APP_NAME: 'HerbalClinic',
  VERSION: '1.0.0',
  API_BASE_URL: resolveApiBaseUrl({
    isDev: __DEV__,
    platform: Platform.OS,
    productionUrl: PRODUCTION_API_BASE_URL,
  }),
};

export default Config;
