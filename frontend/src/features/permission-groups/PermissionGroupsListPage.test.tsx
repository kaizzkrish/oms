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
import { routeAxios } from '../../test/mockAxiosRouter';
import { PermissionGroupsListPage } from './PermissionGroupsListPage';
import type { PermissionGroupRecord } from './permissionGroupsApi';

vi.mock('../../shared/api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

const ALL_GROUP_PERMISSIONS = [
  'PermissionGroups.Create',
  'PermissionGroups.Update',
  'PermissionGroups.Delete',
];

function buildGroup(overrides: Partial<PermissionGroupRecord> = {}): PermissionGroupRecord {
  return {
    id: 'group-1',
    name: 'User Management',
    description: 'Managing user accounts',
    isActive: true,
    permissionCount: 0,
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
      <PermissionGroupsListPage />
    </Provider>,
  );
  return store;
}

describe('PermissionGroupsListPage', () => {
  let router: ReturnType<typeof routeAxios>;

  beforeEach(() => {
    mockedAxios.mockReset();
    router = routeAxios(mockedAxios, {
      'get /permissions/me': ALL_GROUP_PERMISSIONS,
    });
  });

  it('lists permission groups returned by the API', async () => {
    router.queue('get', '/permission-groups', {
      items: [buildGroup()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Managing user accounts')).toBeInTheDocument();
  });

  it('shows an empty state when there are no permission groups', async () => {
    router.queue('get', '/permission-groups', {
      items: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText(/no permission groups found/i)).toBeInTheDocument();
  });

  it('creates a permission group through the form dialog', async () => {
    router.queue('get', '/permission-groups', {
      items: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText(/no permission groups found/i);

    router.queue('post', '/permission-groups', buildGroup({ id: 'new-group' }));
    router.queue('get', '/permission-groups', {
      items: [buildGroup({ id: 'new-group' })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /new group/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/name/i), 'Reports');
    await user.click(within(dialog).getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/permission-groups', method: 'POST' }),
      );
    });
  });

  it('deletes a permission group after confirming the dialog', async () => {
    router.queue('get', '/permission-groups', {
      items: [buildGroup()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('User Management');

    router.queue('delete', '/permission-groups/group-1', undefined);
    router.queue('get', '/permission-groups', {
      items: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /delete user management/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/permission-groups/group-1',
          method: 'DELETE',
        }),
      );
    });
  });
});
