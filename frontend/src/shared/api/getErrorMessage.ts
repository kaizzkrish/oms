import type { AxiosBaseQueryError } from './axiosBaseQuery';

/** Extracts the backend's `AllExceptionsFilter` message from an RTK Query error. */
export function getErrorMessage(error: unknown, fallback: string): string {
  const data = (error as AxiosBaseQueryError | undefined)?.data;
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && message.every((m) => typeof m === 'string')) {
      return message.join(' ');
    }
  }
  return fallback;
}
