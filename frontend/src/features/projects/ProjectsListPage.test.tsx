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
import { ProjectsListPage } from './ProjectsListPage';
import type { ProjectRecord } from './projectsApi';

vi.mock('../../shared/api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

const ALL_PROJECT_PERMISSIONS = ['Projects.Create', 'Projects.Update', 'Projects.Delete'];

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

const SAMPLE_CLIENTS = {
  items: [
    {
      id: 'client-1',
      organizationId: 'org-1',
      accountManagerId: null,
      name: 'Globex Corporation',
      code: 'GLOBEX',
      industry: null,
      website: null,
      email: null,
      phone: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      country: null,
      postalCode: null,
      contactName: null,
      contactEmail: null,
      contactPhone: null,
      description: null,
      isActive: true,
      createdAt: new Date('2026-01-01').toISOString(),
    },
  ],
  meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
};

const SAMPLE_DEPARTMENTS = {
  items: [
    {
      id: 'department-1',
      organizationId: 'org-1',
      officeId: null,
      name: 'Engineering',
      code: null,
      description: null,
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

const SAMPLE_TEAMS = {
  items: [
    {
      id: 'team-1',
      organizationId: 'org-1',
      departmentId: null,
      teamLeaderId: null,
      name: 'Platform Team',
      code: null,
      description: null,
      isActive: true,
      memberCount: 0,
      createdAt: new Date('2026-01-01').toISOString(),
    },
  ],
  meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
};

const EMPTY_PROJECTS = {
  items: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
};

function buildProject(overrides: Partial<ProjectRecord> = {}): ProjectRecord {
  return {
    id: 'project-1',
    organizationId: 'org-1',
    clientId: 'client-1',
    departmentId: 'department-1',
    projectManagerId: 'employee-1',
    teamId: 'team-1',
    name: 'Website Redesign',
    code: 'WEB-RD',
    description: null,
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    startDate: new Date('2026-01-13').toISOString(),
    endDate: new Date('2026-06-30').toISOString(),
    budget: 50000,
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
        <ProjectsListPage />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('ProjectsListPage', () => {
  let router: ReturnType<typeof routeAxios>;

  beforeEach(() => {
    mockedAxios.mockReset();
    router = routeAxios(mockedAxios, {
      'get /permissions/me': ALL_PROJECT_PERMISSIONS,
      'get /organizations': SAMPLE_ORGANIZATIONS,
      'get /clients': SAMPLE_CLIENTS,
      'get /departments': SAMPLE_DEPARTMENTS,
      'get /employees': SAMPLE_EMPLOYEES,
      'get /teams': SAMPLE_TEAMS,
      'get /projects': EMPTY_PROJECTS,
    });
  });

  it('lists projects returned by the API', async () => {
    router.queue('get', '/projects', {
      items: [buildProject()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText('Website Redesign')).toBeInTheDocument();
    expect(screen.getByText('WEB-RD')).toBeInTheDocument();
    expect(await screen.findByText('Globex Corporation')).toBeInTheDocument();
    expect(await screen.findByText('Engineering')).toBeInTheDocument();
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('shows an empty state when there are no projects', async () => {
    router.queue('get', '/projects', EMPTY_PROJECTS);

    renderWithStore();

    expect(await screen.findByText(/no projects found/i)).toBeInTheDocument();
  });

  it('creates a project through the form dialog', async () => {
    router.queue('get', '/projects', EMPTY_PROJECTS);
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText(/no projects found/i);

    router.queue('post', '/projects', buildProject({ id: 'new-project' }));
    router.queue('get', '/projects', {
      items: [buildProject({ id: 'new-project' })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /new project/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText(/organization/i));
    await user.click(await screen.findByRole('option', { name: 'Acme Corporation' }));
    await user.type(within(dialog).getByLabelText(/^name$/i), 'Website Redesign');
    await user.click(within(dialog).getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/projects', method: 'POST' }),
      );
    });
  });

  it('deletes a project after confirming the dialog', async () => {
    router.queue('get', '/projects', {
      items: [buildProject()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('Website Redesign');

    router.queue('delete', '/projects/project-1', undefined);
    router.queue('get', '/projects', EMPTY_PROJECTS);

    await user.click(screen.getByRole('button', { name: /delete website redesign/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/projects/project-1', method: 'DELETE' }),
      );
    });
  });
});
