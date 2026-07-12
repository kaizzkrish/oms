import { authApi } from '../features/auth/authApi';
import { clearCredentials } from '../features/auth/authSlice';
import { store } from './store';

/**
 * Runs once when the router hydrates. The access token only ever lives in
 * memory (never localStorage, to limit XSS exposure), so on a full page
 * load we attempt a silent refresh using the httpOnly refresh-token cookie
 * before rendering any route. On success, the `refresh` endpoint's own
 * `onQueryStarted` dispatches `setCredentials`; here we only need to handle
 * the failure path.
 */
export async function rootLoader(): Promise<null> {
  const result = await store.dispatch(authApi.endpoints.refresh.initiate());
  if (!('data' in result) || !result.data) {
    store.dispatch(clearCredentials());
  }
  return null;
}
