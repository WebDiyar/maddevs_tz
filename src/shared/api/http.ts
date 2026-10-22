import axios from 'axios';
import { API_BASE_URL, DEFAULT_LOCALE, HTTP_TIMEOUT_MS, TIME_ZONE_HEADER } from '@/shared/config';

export const http = axios.create({ baseURL: API_BASE_URL, timeout: HTTP_TIMEOUT_MS });

http.interceptors.request.use((config) => {
  config.headers.set(TIME_ZONE_HEADER, Intl.DateTimeFormat().resolvedOptions().timeZone);
  config.headers.set('Accept-Language', document.documentElement.lang || DEFAULT_LOCALE);
  return config;
});
