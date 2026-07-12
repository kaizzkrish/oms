import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import notificationsReducer from '../../app/notificationsSlice';
import uiReducer, { type ThemeMode } from '../../app/uiSlice';
import authReducer, { type AuthStatus, type AuthUser } from '../../features/auth/authSlice';
import { apiSlice } from '../api/apiSlice';
import { TopNav } from './TopNav';

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
});
