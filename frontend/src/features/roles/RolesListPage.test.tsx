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
import { RolesListPage } from './RolesListPage';
import type { RoleRecord } from './rolesApi';

vi.mock('../../shared/api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

function envelope<T>(data: T) {
  return {
    data: { success: true, statusCode: 200, timestamp: '', path: '', data },
  };
}

function buildRole(overrides: Partial<RoleRecord> = {}): RoleRecord {
  return {
    id: 'role-1',
    name: 'Employee',
    description: 'Standard employee access',
    isSystem: false,
    isActive: true,
    userCount: 0,
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
      <RolesListPage />
    </Provider>,
  );
  return store;
}

describe('RolesListPage', () => {
  beforeEach(() => {
    mockedAxios.mockReset();
  });

  it('lists roles returned by the API', async () => {
    mockedAxios.mockResolvedValueOnce(
      envelope({
        items: [buildRole()],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      }),
    );

    renderWithStore();

    expect(await screen.findByText('Employee')).toBeInTheDocument();
    expect(screen.getByText('Standard employee access')).toBeInTheDocument();
  });

  it('shows an empty state when there are no roles', async () => {
    mockedAxios.mockResolvedValueOnce(
      envelope({ items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
    );

    renderWithStore();

    expect(await screen.findByText(/no roles found/i)).toBeInTheDocument();
  });

  it('creates a role through the form dialog', async () => {
    mockedAxios.mockResolvedValueOnce(
      envelope({ items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
    );
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText(/no roles found/i);

    mockedAxios.mockResolvedValueOnce(envelope(buildRole({ id: 'new-role' })));
    mockedAxios.mockResolvedValueOnce(
      envelope({
        items: [buildRole({ id: 'new-role' })],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      }),
    );

    await user.click(screen.getByRole('button', { name: /new role/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/name/i), 'Contractor');
    await user.click(within(dialog).getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/roles', method: 'POST' }),
      );
    });
  });

  it('deletes a role after confirming the dialog', async () => {
    mockedAxios.mockResolvedValueOnce(
      envelope({
        items: [buildRole()],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      }),
    );
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('Employee');

    mockedAxios.mockResolvedValueOnce(envelope(undefined));
    mockedAxios.mockResolvedValueOnce(
      envelope({ items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
    );

    await user.click(screen.getByRole('button', { name: /delete employee/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/roles/role-1', method: 'DELETE' }),
      );
    });
  });

  it('does not show a delete action for system roles', async () => {
    mockedAxios.mockResolvedValueOnce(
      envelope({
        items: [buildRole({ isSystem: true, name: 'Admin' })],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      }),
    );

    renderWithStore();

    await screen.findByText('Admin');
    expect(screen.queryByRole('button', { name: /delete admin/i })).not.toBeInTheDocument();
  });
});
