import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import authReducer from '../auth/authSlice';
import notificationsReducer from '../../app/notificationsSlice';
import uiReducer from '../../app/uiSlice';
import { apiSlice } from '../../shared/api/apiSlice';
import { axiosInstance } from '../../shared/api/axiosInstance';
import { UsersListPage } from './UsersListPage';
import type { UserRecord } from './usersApi';

vi.mock('../../shared/api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

function envelope<T>(data: T) {
  return { data: { success: true, statusCode: 200, timestamp: '', path: '', data } };
}

function buildUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: 'user-1',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date('2026-01-01').toISOString(),
    ...overrides,
  };
}

function renderWithStore() {
  const store = configureStore({
    reducer: {
      ui: uiReducer,
      notifications: notificationsReducer,
      auth: authReducer,
      [apiSlice.reducerPath]: apiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware),
  });
  render(
    <Provider store={store}>
      <UsersListPage />
    </Provider>,
  );
  return store;
}

describe('UsersListPage', () => {
  beforeEach(() => {
    mockedAxios.mockReset();
  });

  it('lists users returned by the API', async () => {
    mockedAxios.mockResolvedValueOnce(
      envelope({
        items: [buildUser()],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      }),
    );

    renderWithStore();

    expect(await screen.findByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('shows an empty state when there are no users', async () => {
    mockedAxios.mockResolvedValueOnce(
      envelope({ items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
    );

    renderWithStore();

    expect(await screen.findByText(/no users found/i)).toBeInTheDocument();
  });

  it('creates a user through the form dialog', async () => {
    mockedAxios.mockResolvedValueOnce(
      envelope({ items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
    );
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText(/no users found/i);

    mockedAxios.mockResolvedValueOnce(envelope(buildUser({ id: 'new-user' })));
    mockedAxios.mockResolvedValueOnce(
      envelope({
        items: [buildUser({ id: 'new-user' })],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      }),
    );

    await user.click(screen.getByRole('button', { name: /new user/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/email/i), 'new@example.com');
    await user.type(within(dialog).getByLabelText(/password/i), 'Sup3rSecret!');
    await user.type(within(dialog).getByLabelText(/first name/i), 'New');
    await user.type(within(dialog).getByLabelText(/last name/i), 'Person');
    await user.click(within(dialog).getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/users', method: 'POST' }),
      );
    });
  });

  it('deactivates a user after confirming the dialog', async () => {
    mockedAxios.mockResolvedValueOnce(
      envelope({
        items: [buildUser()],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      }),
    );
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('jane@example.com');

    mockedAxios.mockResolvedValueOnce(envelope(undefined));
    mockedAxios.mockResolvedValueOnce(
      envelope({ items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
    );

    await user.click(screen.getByRole('button', { name: /deactivate/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /deactivate/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/users/user-1', method: 'DELETE' }),
      );
    });
  });
});
