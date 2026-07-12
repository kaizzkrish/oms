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
import { DepartmentsListPage } from './DepartmentsListPage';
import type { DepartmentRecord } from './departmentsApi';

vi.mock('../../shared/api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

const ALL_DEPARTMENT_PERMISSIONS = [
  'Departments.Create',
  'Departments.Update',
  'Departments.Delete',
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

const SAMPLE_OFFICES = {
  items: [
    {
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
    },
  ],
  meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
};

function buildDepartment(overrides: Partial<DepartmentRecord> = {}): DepartmentRecord {
  return {
    id: 'dept-1',
    organizationId: 'org-1',
    officeId: 'office-1',
    name: 'Engineering',
    code: 'ENG',
    description: 'Builds and maintains the product',
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
        <DepartmentsListPage />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('DepartmentsListPage', () => {
  let router: ReturnType<typeof routeAxios>;

  beforeEach(() => {
    mockedAxios.mockReset();
    router = routeAxios(mockedAxios, {
      'get /permissions/me': ALL_DEPARTMENT_PERMISSIONS,
      'get /organizations': SAMPLE_ORGANIZATIONS,
      'get /offices': SAMPLE_OFFICES,
    });
  });

  it('lists departments returned by the API', async () => {
    router.queue('get', '/departments', {
      items: [buildDepartment()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('ENG')).toBeInTheDocument();
    expect(await screen.findByText('Acme Corporation')).toBeInTheDocument();
    expect(await screen.findByText('Headquarters')).toBeInTheDocument();
  });

  it('shows an empty state when there are no departments', async () => {
    router.queue('get', '/departments', {
      items: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText(/no departments found/i)).toBeInTheDocument();
  });

  it('creates a department through the form dialog', async () => {
    router.queue('get', '/departments', {
      items: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText(/no departments found/i);

    router.queue('post', '/departments', buildDepartment({ id: 'new-dept' }));
    router.queue('get', '/departments', {
      items: [buildDepartment({ id: 'new-dept' })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /new department/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText(/organization/i));
    await user.click(await screen.findByRole('option', { name: 'Acme Corporation' }));
    await user.type(within(dialog).getByLabelText(/^name$/i), 'Engineering');
    await user.click(within(dialog).getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/departments', method: 'POST' }),
      );
    });
  });

  it('deletes a department after confirming the dialog', async () => {
    router.queue('get', '/departments', {
      items: [buildDepartment()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('Engineering');

    router.queue('delete', '/departments/dept-1', undefined);
    router.queue('get', '/departments', {
      items: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /delete engineering/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/departments/dept-1', method: 'DELETE' }),
      );
    });
  });
});
