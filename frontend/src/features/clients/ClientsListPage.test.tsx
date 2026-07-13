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
import { ClientsListPage } from './ClientsListPage';
import type { ClientRecord } from './clientsApi';

vi.mock('../../shared/api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

const ALL_CLIENT_PERMISSIONS = ['Clients.Create', 'Clients.Update', 'Clients.Delete'];

const SAMPLE_ORGANIZATIONS = {
  items: [
    {
      id: 'org-1',
      name: 'Acme Corporation',
      legalName: null,
      registrationNumber: null,
      industry: null,
      website: null,
      email: null,
      phone: null,
      logoUrl: null,
      isActive: true,
      officeCount: 1,
      createdAt: new Date('2026-01-01').toISOString(),
    },
  ],
  meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
};

const SAMPLE_EMPLOYEES = {
  items: [
    {
      id: 'employee-1',
      user: {
        id: 'user-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        isActive: true,
      },
      organizationId: 'org-1',
      departmentId: null,
      designationId: null,
      officeId: null,
      reportingManagerId: null,
      employeeCode: 'EMP-0001',
      employmentType: 'FULL_TIME',
      dateOfJoining: new Date('2026-01-01').toISOString(),
      dateOfLeaving: null,
      phone: null,
      isActive: true,
      createdAt: new Date('2026-01-01').toISOString(),
    },
  ],
  meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
};

const EMPTY_CLIENTS = {
  items: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
};

function buildClient(overrides: Partial<ClientRecord> = {}): ClientRecord {
  return {
    id: 'client-1',
    organizationId: 'org-1',
    accountManagerId: 'employee-1',
    name: 'Globex Corporation',
    code: 'GLOBEX',
    industry: 'Manufacturing',
    website: null,
    email: null,
    phone: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    state: null,
    country: null,
    postalCode: null,
    contactName: 'John Smith',
    contactEmail: 'john.smith@globex.example.com',
    contactPhone: null,
    description: null,
    isActive: true,
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
        <ClientsListPage />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('ClientsListPage', () => {
  let router: ReturnType<typeof routeAxios>;

  beforeEach(() => {
    mockedAxios.mockReset();
    router = routeAxios(mockedAxios, {
      'get /permissions/me': ALL_CLIENT_PERMISSIONS,
      'get /organizations': SAMPLE_ORGANIZATIONS,
      'get /employees': SAMPLE_EMPLOYEES,
      'get /clients': EMPTY_CLIENTS,
    });
  });

  it('lists clients returned by the API', async () => {
    router.queue('get', '/clients', {
      items: [buildClient()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText('Globex Corporation')).toBeInTheDocument();
    expect(screen.getByText('GLOBEX')).toBeInTheDocument();
    expect(await screen.findByText('Acme Corporation')).toBeInTheDocument();
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(await screen.findByText('John Smith')).toBeInTheDocument();
  });

  it('shows an empty state when there are no clients', async () => {
    router.queue('get', '/clients', EMPTY_CLIENTS);

    renderWithStore();

    expect(await screen.findByText(/no clients found/i)).toBeInTheDocument();
  });

  it('creates a client through the form dialog', async () => {
    router.queue('get', '/clients', EMPTY_CLIENTS);
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText(/no clients found/i);

    router.queue('post', '/clients', buildClient({ id: 'new-client' }));
    router.queue('get', '/clients', {
      items: [buildClient({ id: 'new-client' })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /new client/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText(/organization/i));
    await user.click(await screen.findByRole('option', { name: 'Acme Corporation' }));
    await user.type(within(dialog).getByLabelText(/^name$/i), 'Globex Corporation');
    await user.click(within(dialog).getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/clients', method: 'POST' }),
      );
    });
  });

  it('deletes a client after confirming the dialog', async () => {
    router.queue('get', '/clients', {
      items: [buildClient()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('Globex Corporation');

    router.queue('delete', '/clients/client-1', undefined);
    router.queue('get', '/clients', EMPTY_CLIENTS);

    await user.click(screen.getByRole('button', { name: /delete globex corporation/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/clients/client-1', method: 'DELETE' }),
      );
    });
  });
});
