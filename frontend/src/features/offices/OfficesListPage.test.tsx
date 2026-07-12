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
import { OfficesListPage } from './OfficesListPage';
import type { OfficeRecord } from './officesApi';

vi.mock('../../shared/api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

const ALL_OFFICE_PERMISSIONS = ['Offices.Create', 'Offices.Update', 'Offices.Delete'];

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

function buildOffice(overrides: Partial<OfficeRecord> = {}): OfficeRecord {
  return {
    id: 'office-1',
    organizationId: 'org-1',
    name: 'Headquarters',
    isHeadquarters: true,
    addressLine1: '1 Corporate Park',
    addressLine2: null,
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    postalCode: '400001',
    phone: null,
    email: null,
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
        <OfficesListPage />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('OfficesListPage', () => {
  let router: ReturnType<typeof routeAxios>;

  beforeEach(() => {
    mockedAxios.mockReset();
    router = routeAxios(mockedAxios, {
      'get /permissions/me': ALL_OFFICE_PERMISSIONS,
      'get /organizations': SAMPLE_ORGANIZATIONS,
    });
  });

  it('lists offices returned by the API', async () => {
    router.queue('get', '/offices', {
      items: [buildOffice()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText('Headquarters')).toBeInTheDocument();
    expect(screen.getByText('HQ')).toBeInTheDocument();
    expect(await screen.findByText('Acme Corporation')).toBeInTheDocument();
  });

  it('shows an empty state when there are no offices', async () => {
    router.queue('get', '/offices', {
      items: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText(/no offices found/i)).toBeInTheDocument();
  });

  it('creates an office through the form dialog', async () => {
    router.queue('get', '/offices', {
      items: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText(/no offices found/i);

    router.queue('post', '/offices', buildOffice({ id: 'new-office' }));
    router.queue('get', '/offices', {
      items: [buildOffice({ id: 'new-office' })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /new office/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText(/organization/i));
    await user.click(await screen.findByRole('option', { name: 'Acme Corporation' }));
    await user.type(within(dialog).getByLabelText(/^name$/i), 'Branch Office');
    await user.type(within(dialog).getByLabelText(/address line 1/i), '2 Side St');
    await user.type(within(dialog).getByLabelText(/^city$/i), 'Delhi');
    await user.type(within(dialog).getByLabelText(/^country$/i), 'India');
    await user.click(within(dialog).getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/offices', method: 'POST' }),
      );
    });
  });

  it('deletes an office after confirming the dialog', async () => {
    router.queue('get', '/offices', {
      items: [buildOffice()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('Headquarters');

    router.queue('delete', '/offices/office-1', undefined);
    router.queue('get', '/offices', {
      items: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /delete headquarters/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/offices/office-1', method: 'DELETE' }),
      );
    });
  });
});
