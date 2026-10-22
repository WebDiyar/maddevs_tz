import axios from 'axios';
import { API_BASE_URL, HTTP_TIMEOUT_MS } from '@/shared/config';

export const http = axios.create({ baseURL: API_BASE_URL, timeout: HTTP_TIMEOUT_MS });
