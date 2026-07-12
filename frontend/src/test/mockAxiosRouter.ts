import type { Mock } from 'vitest';

/** Wraps a value in the backend's TransformInterceptor success envelope. */
export function envelope<T>(data: T) {
  return {
    data: { success: true, statusCode: 200, timestamp: '', path: '', data },
  };
}

interface AxiosLikeConfig {
  method?: string;
  url?: string;
}

function routeKey(method: string | undefined, url: string | undefined): string {
  return `${(method ?? 'get').toLowerCase()} ${url ?? ''}`;
}

/**
 * Routes a mocked `axiosInstance` by method+url instead of call order.
 *
 * Positional `mockResolvedValueOnce` chains break as soon as a page fires more
 * than one concurrent query (e.g. every list page now also queries
 * `/permissions/me` for action-gating) — whichever request resolves the mock
 * queue first steals a response meant for a different request. Routing by
 * method+url is immune to that ordering.
 */
export function routeAxios(mockedAxios: Mock, defaults: Record<string, unknown> = {}) {
  const queues = new Map<string, unknown[]>();

  mockedAxios.mockImplementation(async (config: AxiosLikeConfig) => {
    const key = routeKey(config.method, config.url);
    const queue = queues.get(key);
    if (queue && queue.length > 0) {
      return envelope(queue.shift());
    }
    if (key in defaults) {
      return envelope(defaults[key]);
    }
    throw new Error(`mockAxiosRouter: no response queued for "${key}"`);
  });

  return {
    /** Queue a one-time response for the next request matching method+url. */
    queue(method: string, url: string, data: unknown) {
      const key = routeKey(method, url);
      const list = queues.get(key) ?? [];
      list.push(data);
      queues.set(key, list);
    },
  };
}
