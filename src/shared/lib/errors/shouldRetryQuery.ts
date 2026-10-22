import axios from 'axios';
import { ZodError } from 'zod';

const MAX_RETRIES = 1;

export const shouldRetryQuery = (failureCount: number, error: unknown) => {
  if (error instanceof ZodError) return false;
  if (axios.isAxiosError(error) && error.response && error.response.status < 500) return false;
  return failureCount < MAX_RETRIES;
};
