/**
 * Axios HTTP client configured for the PiHome API.
 *
 * Uses a request interceptor to resolve the base URL at call time
 * rather than module-load time, so it works correctly in PWA
 * standalone mode where the hostname may not be available early.
 */
import axios from 'axios';
import { getApiBaseUrl } from '../constants.ts';

const apiClient = axios.create({
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  return config;
});

export default apiClient;
