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
import { SprintsListPage } from './SprintsListPage';
import type { SprintRecord } from './sprintsApi';

vi.mock('../../shared/api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

const ALL_SPRINT_PERMISSIONS = ['Sprints.Create', 'Sprints.Update', 'Sprints.Delete'];

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

const SAMPLE_TEAMS = {
  items: [
    {
      id: 'team-1',
      organizationId: 'org-1',
      departmentId: null,
      teamLeaderId: null,
      name: 'Engineering Team',
      code: 'ENG-TEAM',
      description: null,
      isActive: true,
      memberCount: 0,
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

const EMPTY_SPRINTS = {
  items: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
};

function buildSprint(overrides: Partial<SprintRecord> = {}): SprintRecord {
  return {
    id: 'sprint-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    teamId: 'team-1',
    scrumMasterId: 'employee-1',
    name: 'Sprint 1',
    code: 'SPR-1',
    goal: null,
    status: 'ACTIVE',
    startDate: new Date('2026-01-13').toISOString(),
    endDate: new Date('2026-01-27').toISOString(),
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
        <SprintsListPage />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('SprintsListPage', () => {
  let router: ReturnType<typeof routeAxios>;

  beforeEach(() => {
    mockedAxios.mockReset();
    router = routeAxios(mockedAxios, {
      'get /permissions/me': ALL_SPRINT_PERMISSIONS,
      'get /organizations': SAMPLE_ORGANIZATIONS,
      'get /projects': SAMPLE_PROJECTS,
      'get /teams': SAMPLE_TEAMS,
      'get /employees': SAMPLE_EMPLOYEES,
      'get /sprints': EMPTY_SPRINTS,
    });
  });

  it('lists sprints returned by the API', async () => {
    router.queue('get', '/sprints', {
      items: [buildSprint()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText('Sprint 1')).toBeInTheDocument();
    expect(screen.getByText('SPR-1')).toBeInTheDocument();
    expect(await screen.findByText('Website Redesign')).toBeInTheDocument();
    expect(await screen.findByText('Engineering Team')).toBeInTheDocument();
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows an empty state when there are no sprints', async () => {
    router.queue('get', '/sprints', EMPTY_SPRINTS);

    renderWithStore();

    expect(await screen.findByText(/no sprints found/i)).toBeInTheDocument();
  });

  it('creates a sprint through the form dialog', async () => {
    router.queue('get', '/sprints', EMPTY_SPRINTS);
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText(/no sprints found/i);

    router.queue('post', '/sprints', buildSprint({ id: 'new-sprint' }));
    router.queue('get', '/sprints', {
      items: [buildSprint({ id: 'new-sprint' })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /new sprint/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText(/organization/i));
    await user.click(await screen.findByRole('option', { name: 'Acme Corporation' }));
    await user.click(within(dialog).getByLabelText(/^project$/i));
    await user.click(await screen.findByRole('option', { name: 'Website Redesign' }));
    await user.type(within(dialog).getByLabelText(/^name$/i), 'Sprint 1');
    await user.type(within(dialog).getByLabelText(/start date/i), '2026-01-13');
    await user.type(within(dialog).getByLabelText(/end date/i), '2026-01-27');
    await user.click(within(dialog).getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/sprints', method: 'POST' }),
      );
    });
  });

  it('deletes a sprint after confirming the dialog', async () => {
    router.queue('get', '/sprints', {
      items: [buildSprint()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('Sprint 1');

    router.queue('delete', '/sprints/sprint-1', undefined);
    router.queue('get', '/sprints', EMPTY_SPRINTS);

    await user.click(screen.getByRole('button', { name: /delete sprint 1/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/sprints/sprint-1', method: 'DELETE' }),
      );
    });
  });
});
