import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import notificationsReducer from '../../app/notificationsSlice';
import uiReducer, { type ThemeMode } from '../../app/uiSlice';
import authReducer, { type AuthStatus, type AuthUser } from '../../features/auth/authSlice';
import { apiSlice } from '../api/apiSlice';
import { axiosInstance } from '../api/axiosInstance';
import { routeAxios } from '../../test/mockAxiosRouter';
import { TopNav } from './TopNav';

vi.mock('../api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

function renderWithStore(user: AuthUser | null = null) {
  const initialThemeMode: ThemeMode = 'light';
  const authStatus: AuthStatus = user ? 'authenticated' : 'unauthenticated';
  const store = configureStore({
    reducer: {
      ui: uiReducer,
      notifications: notificationsReducer,
      auth: authReducer,
      [apiSlice.reducerPath]: apiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware),
    preloadedState: {
      ui: { themeMode: initialThemeMode, sidebarOpen: true },
      notifications: { toasts: [] },
      auth: { accessToken: user ? 'token' : null, user, status: authStatus },
    },
  });
  render(
    <Provider store={store}>
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('TopNav', () => {
  let router: ReturnType<typeof routeAxios>;

  beforeEach(() => {
    mockedAxios.mockReset();
    router = routeAxios(mockedAxios, {
      'get /notifications/unread-count': { count: 0 },
    });
  });

  it('renders the app name', () => {
    renderWithStore();
    expect(screen.getByText(/office management/i)).toBeInTheDocument();
  });

  it('toggles the theme mode when the theme button is clicked', async () => {
    const store = renderWithStore();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /toggle color mode/i }));

    expect(store.getState().ui.themeMode).toBe('dark');
  });

  it('does not show the sign-out button when no user is signed in', () => {
    renderWithStore(null);
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
  });

  it('shows the sign-out button when a user is signed in', () => {
    renderWithStore({
      id: 'user-1',
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
    });
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('does not show the notification bell when no user is signed in', () => {
    renderWithStore(null);
    expect(screen.queryByRole('button', { name: /notifications/i })).not.toBeInTheDocument();
  });

  it('shows the notification bell with the unread count when a user is signed in', async () => {
    router.queue('get', '/notifications/unread-count', { count: 4 });
    renderWithStore({
      id: 'user-1',
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
    });
    expect(await screen.findByText('4')).toBeInTheDocument();
  });
});
