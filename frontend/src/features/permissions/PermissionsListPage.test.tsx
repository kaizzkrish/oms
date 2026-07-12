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
import { PermissionsListPage } from './PermissionsListPage';
import type { PermissionRecord } from './permissionsApi';

vi.mock('../../shared/api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

const ALL_PERMISSION_PERMISSIONS = [
  'Permissions.Create',
  'Permissions.Update',
  'Permissions.Delete',
];

function buildPermission(overrides: Partial<PermissionRecord> = {}): PermissionRecord {
  return {
    id: 'permission-1',
    name: 'Project.Create',
    description: 'Create projects',
    isSystem: false,
    isActive: true,
    groupId: null,
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
      <PermissionsListPage />
    </Provider>,
  );
  return store;
}

describe('PermissionsListPage', () => {
  let router: ReturnType<typeof routeAxios>;

  beforeEach(() => {
    mockedAxios.mockReset();
    router = routeAxios(mockedAxios, {
      'get /permissions/me': ALL_PERMISSION_PERMISSIONS,
      'get /permission-groups': {
        items: [],
        meta: { page: 1, limit: 100, total: 0, totalPages: 1 },
      },
    });
  });

  it('lists permissions returned by the API', async () => {
    router.queue('get', '/permissions', {
      items: [buildPermission()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText('Project.Create')).toBeInTheDocument();
    expect(screen.getByText('Create projects')).toBeInTheDocument();
  });

  it('shows an empty state when there are no permissions', async () => {
    router.queue('get', '/permissions', {
      items: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText(/no permissions found/i)).toBeInTheDocument();
  });

  it('creates a permission through the form dialog', async () => {
    router.queue('get', '/permissions', {
      items: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText(/no permissions found/i);

    router.queue(
      'post',
      '/permissions',
      buildPermission({ id: 'new-permission', name: 'Project.Update' }),
    );
    router.queue('get', '/permissions', {
      items: [buildPermission({ id: 'new-permission', name: 'Project.Update' })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /new permission/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/name/i), 'Project.Update');
    await user.click(within(dialog).getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/permissions', method: 'POST' }),
      );
    });
  });

  it('does not show a delete action for system permissions', async () => {
    router.queue('get', '/permissions', {
      items: [buildPermission({ isSystem: true, name: 'Users.View' })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderWithStore();

    await screen.findByText('Users.View');
    expect(screen.queryByRole('button', { name: /delete users\.view/i })).not.toBeInTheDocument();
  });
});
