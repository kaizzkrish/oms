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
import { DesignationsListPage } from './DesignationsListPage';
import type { DesignationRecord } from './designationsApi';

vi.mock('../../shared/api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

const ALL_DESIGNATION_PERMISSIONS = [
  'Designations.Create',
  'Designations.Update',
  'Designations.Delete',
];

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

const SAMPLE_DEPARTMENTS = {
  items: [
    {
      id: 'dept-1',
      organizationId: 'org-1',
      officeId: null,
      name: 'Engineering',
      code: 'ENG',
      description: null,
      isActive: true,
      createdAt: new Date('2026-01-01').toISOString(),
    },
  ],
  meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
};

function buildDesignation(overrides: Partial<DesignationRecord> = {}): DesignationRecord {
  return {
    id: 'designation-1',
    organizationId: 'org-1',
    departmentId: 'dept-1',
    name: 'Software Engineer',
    code: 'SE',
    description: 'Designs, builds, and maintains software',
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
        <DesignationsListPage />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('DesignationsListPage', () => {
  let router: ReturnType<typeof routeAxios>;

  beforeEach(() => {
    mockedAxios.mockReset();
    router = routeAxios(mockedAxios, {
      'get /permissions/me': ALL_DESIGNATION_PERMISSIONS,
      'get /organizations': SAMPLE_ORGANIZATIONS,
      'get /departments': SAMPLE_DEPARTMENTS,
    });
  });

  it('lists designations returned by the API', async () => {
    router.queue('get', '/designations', {
      items: [buildDesignation()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('SE')).toBeInTheDocument();
    expect(await screen.findByText('Acme Corporation')).toBeInTheDocument();
    expect(await screen.findByText('Engineering')).toBeInTheDocument();
  });

  it('shows an empty state when there are no designations', async () => {
    router.queue('get', '/designations', {
      items: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText(/no designations found/i)).toBeInTheDocument();
  });

  it('creates a designation through the form dialog', async () => {
    router.queue('get', '/designations', {
      items: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText(/no designations found/i);

    router.queue('post', '/designations', buildDesignation({ id: 'new-designation' }));
    router.queue('get', '/designations', {
      items: [buildDesignation({ id: 'new-designation' })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /new designation/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText(/organization/i));
    await user.click(await screen.findByRole('option', { name: 'Acme Corporation' }));
    await user.type(within(dialog).getByLabelText(/^name$/i), 'Software Engineer');
    await user.click(within(dialog).getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/designations', method: 'POST' }),
      );
    });
  });

  it('deletes a designation after confirming the dialog', async () => {
    router.queue('get', '/designations', {
      items: [buildDesignation()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('Software Engineer');

    router.queue('delete', '/designations/designation-1', undefined);
    router.queue('get', '/designations', {
      items: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /delete software engineer/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/designations/designation-1', method: 'DELETE' }),
      );
    });
  });
});
