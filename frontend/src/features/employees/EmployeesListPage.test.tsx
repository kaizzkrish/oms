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
import { EmployeesListPage } from './EmployeesListPage';
import type { EmployeeRecord } from './employeesApi';

vi.mock('../../shared/api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

const ALL_EMPLOYEE_PERMISSIONS = ['Employees.Create', 'Employees.Update', 'Employees.Delete'];

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

const SAMPLE_DESIGNATIONS = {
  items: [
    {
      id: 'designation-1',
      organizationId: 'org-1',
      departmentId: 'dept-1',
      name: 'Software Engineer',
      code: 'SE',
      description: null,
      isActive: true,
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
      state: null,
      country: 'India',
      postalCode: null,
      phone: null,
      email: null,
      isActive: true,
      createdAt: new Date('2026-01-01').toISOString(),
    },
  ],
  meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
};

const SAMPLE_USERS = {
  items: [
    {
      id: 'user-1',
      email: 'jane.doe@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      isActive: true,
      lastLoginAt: null,
    },
  ],
  meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
};

const EMPTY_EMPLOYEES = {
  items: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
};

function buildEmployee(overrides: Partial<EmployeeRecord> = {}): EmployeeRecord {
  return {
    id: 'employee-1',
    user: {
      id: 'user-1',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      isActive: true,
    },
    organizationId: 'org-1',
    departmentId: 'dept-1',
    designationId: 'designation-1',
    officeId: 'office-1',
    reportingManagerId: null,
    employeeCode: 'EMP-0001',
    employmentType: 'FULL_TIME',
    dateOfJoining: new Date('2026-01-01').toISOString(),
    dateOfLeaving: null,
    phone: null,
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
        <EmployeesListPage />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('EmployeesListPage', () => {
  let router: ReturnType<typeof routeAxios>;

  beforeEach(() => {
    mockedAxios.mockReset();
    router = routeAxios(mockedAxios, {
      'get /permissions/me': ALL_EMPLOYEE_PERMISSIONS,
      'get /organizations': SAMPLE_ORGANIZATIONS,
      'get /departments': SAMPLE_DEPARTMENTS,
      'get /designations': SAMPLE_DESIGNATIONS,
      'get /offices': SAMPLE_OFFICES,
      'get /users': SAMPLE_USERS,
      'get /employees': EMPTY_EMPLOYEES,
    });
  });

  it('lists employees returned by the API', async () => {
    router.queue('get', '/employees', {
      items: [buildEmployee()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('EMP-0001')).toBeInTheDocument();
    expect(await screen.findByText('Acme Corporation')).toBeInTheDocument();
    expect(await screen.findByText('Engineering')).toBeInTheDocument();
    expect(await screen.findByText('Software Engineer')).toBeInTheDocument();
    expect(await screen.findByText('Headquarters')).toBeInTheDocument();
  });

  it('shows an empty state when there are no employees', async () => {
    router.queue('get', '/employees', EMPTY_EMPLOYEES);

    renderWithStore();

    expect(await screen.findByText(/no employees found/i)).toBeInTheDocument();
  });

  it('creates an employee through the form dialog', async () => {
    router.queue('get', '/employees', EMPTY_EMPLOYEES);
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText(/no employees found/i);

    router.queue('post', '/employees', buildEmployee({ id: 'new-employee' }));
    router.queue('get', '/employees', {
      items: [buildEmployee({ id: 'new-employee' })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /new employee/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText(/^user$/i));
    await user.click(
      await screen.findByRole('option', { name: /jane doe \(jane\.doe@example\.com\)/i }),
    );
    await user.click(within(dialog).getByLabelText(/organization/i));
    await user.click(await screen.findByRole('option', { name: 'Acme Corporation' }));
    await user.type(within(dialog).getByLabelText(/employee code/i), 'EMP-0002');
    const dateField = within(dialog).getByLabelText(/date of joining/i);
    await user.type(dateField, '2026-02-01');
    await user.click(within(dialog).getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/employees', method: 'POST' }),
      );
    });
  });

  it('deletes an employee after confirming the dialog', async () => {
    router.queue('get', '/employees', {
      items: [buildEmployee()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('Jane Doe');

    router.queue('delete', '/employees/employee-1', undefined);
    router.queue('get', '/employees', EMPTY_EMPLOYEES);

    await user.click(screen.getByRole('button', { name: /delete emp-0001/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/employees/employee-1', method: 'DELETE' }),
      );
    });
  });
});
