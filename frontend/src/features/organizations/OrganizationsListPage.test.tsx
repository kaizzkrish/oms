import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import authReducer from '../auth/authSlice';
import notificationsReducer from '../../app/notificationsSlice';
import uiReducer from '../../app/uiSlice';
import { apiSlice } from '../../shared/api/apiSlice';
import { axiosInstance } from '../../shared/api/axiosInstance';
import { routeAxios } from '../../test/mockAxiosRouter';
import { OrganizationsListPage } from './OrganizationsListPage';
import type { OrganizationRecord } from './organizationsApi';

vi.mock('../../shared/api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

const ALL_ORGANIZATION_PERMISSIONS = [
  'Organizations.Create',
  'Organizations.Update',
  'Organizations.Delete',
];

function buildOrganization(overrides: Partial<OrganizationRecord> = {}): OrganizationRecord {
  return {
    id: 'org-1',
    name: 'Acme Corporation',
    legalName: null,
    registrationNumber: null,
    industry: 'Information Technology',
    website: null,
    email: null,
    phone: null,
    logoUrl: null,
    isActive: true,
    officeCount: 0,
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
      <MemoryRouter>
        <OrganizationsListPage />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('OrganizationsListPage', () => {
  let router: ReturnType<typeof routeAxios>;

  beforeEach(() => {
    mockedAxios.mockReset();
    router = routeAxios(mockedAxios, {
      'get /permissions/me': ALL_ORGANIZATION_PERMISSIONS,
    });
  });

  it('lists organizations returned by the API', async () => {
    router.queue('get', '/organizations', {
      items: [buildOrganization()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText('Acme Corporation')).toBeInTheDocument();
    expect(screen.getByText('Information Technology')).toBeInTheDocument();
  });

  it('shows an empty state when there are no organizations', async () => {
    router.queue('get', '/organizations', {
      items: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText(/no organizations found/i)).toBeInTheDocument();
  });

  it('creates an organization through the form dialog', async () => {
    router.queue('get', '/organizations', {
      items: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText(/no organizations found/i);

    router.queue('post', '/organizations', buildOrganization({ id: 'new-org' }));
    router.queue('get', '/organizations', {
      items: [buildOrganization({ id: 'new-org' })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /new organization/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^name$/i), 'Beta Inc');
    await user.click(within(dialog).getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/organizations', method: 'POST' }),
      );
    });
  });

  it('deletes an organization after confirming the dialog', async () => {
    router.queue('get', '/organizations', {
      items: [buildOrganization()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('Acme Corporation');

    router.queue('delete', '/organizations/org-1', undefined);
    router.queue('get', '/organizations', {
      items: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /delete acme corporation/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/organizations/org-1',
          method: 'DELETE',
        }),
      );
    });
  });
});
