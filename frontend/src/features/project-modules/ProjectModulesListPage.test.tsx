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
import { ProjectModulesListPage } from './ProjectModulesListPage';
import type { ProjectModuleRecord } from './projectModulesApi';

vi.mock('../../shared/api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

const ALL_MODULE_PERMISSIONS = [
  'ProjectModules.Create',
  'ProjectModules.Update',
  'ProjectModules.Delete',
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

const SAMPLE_PROJECTS = {
  items: [
    {
      id: 'project-1',
      organizationId: 'org-1',
      clientId: null,
      departmentId: null,
      projectManagerId: null,
      teamId: null,
      name: 'Website Redesign',
      code: 'WEB-RD',
      description: null,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      startDate: null,
      endDate: null,
      budget: null,
      isActive: true,
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

const EMPTY_MODULES = {
  items: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
};

function buildModule(overrides: Partial<ProjectModuleRecord> = {}): ProjectModuleRecord {
  return {
    id: 'module-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    moduleLeadId: 'employee-1',
    name: 'Homepage Revamp',
    code: 'HOME',
    description: null,
    status: 'IN_PROGRESS',
    startDate: new Date('2026-01-13').toISOString(),
    endDate: new Date('2026-03-31').toISOString(),
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
        <ProjectModulesListPage />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('ProjectModulesListPage', () => {
  let router: ReturnType<typeof routeAxios>;

  beforeEach(() => {
    mockedAxios.mockReset();
    router = routeAxios(mockedAxios, {
      'get /permissions/me': ALL_MODULE_PERMISSIONS,
      'get /organizations': SAMPLE_ORGANIZATIONS,
      'get /projects': SAMPLE_PROJECTS,
      'get /employees': SAMPLE_EMPLOYEES,
      'get /project-modules': EMPTY_MODULES,
    });
  });

  it('lists modules returned by the API', async () => {
    router.queue('get', '/project-modules', {
      items: [buildModule()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText('Homepage Revamp')).toBeInTheDocument();
    expect(screen.getByText('HOME')).toBeInTheDocument();
    expect(await screen.findByText('Website Redesign')).toBeInTheDocument();
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('shows an empty state when there are no modules', async () => {
    router.queue('get', '/project-modules', EMPTY_MODULES);

    renderWithStore();

    expect(await screen.findByText(/no modules found/i)).toBeInTheDocument();
  });

  it('creates a module through the form dialog', async () => {
    router.queue('get', '/project-modules', EMPTY_MODULES);
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText(/no modules found/i);

    router.queue('post', '/project-modules', buildModule({ id: 'new-module' }));
    router.queue('get', '/project-modules', {
      items: [buildModule({ id: 'new-module' })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /new module/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText(/organization/i));
    await user.click(await screen.findByRole('option', { name: 'Acme Corporation' }));
    await user.click(within(dialog).getByLabelText(/project/i));
    await user.click(await screen.findByRole('option', { name: 'Website Redesign' }));
    await user.type(within(dialog).getByLabelText(/^name$/i), 'Homepage Revamp');
    await user.click(within(dialog).getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/project-modules', method: 'POST' }),
      );
    });
  });

  it('deletes a module after confirming the dialog', async () => {
    router.queue('get', '/project-modules', {
      items: [buildModule()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('Homepage Revamp');

    router.queue('delete', '/project-modules/module-1', undefined);
    router.queue('get', '/project-modules', EMPTY_MODULES);

    await user.click(screen.getByRole('button', { name: /delete homepage revamp/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/project-modules/module-1', method: 'DELETE' }),
      );
    });
  });
});
