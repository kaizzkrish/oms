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
import { TasksListPage } from './TasksListPage';
import type { TaskRecord } from './tasksApi';

vi.mock('../../shared/api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

const ALL_TASK_PERMISSIONS = ['Tasks.Create', 'Tasks.Update', 'Tasks.Delete'];

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

const SAMPLE_MODULES = {
  items: [
    {
      id: 'module-1',
      organizationId: 'org-1',
      projectId: 'project-1',
      moduleLeadId: null,
      name: 'Homepage Revamp',
      code: 'HOME',
      description: null,
      status: 'IN_PROGRESS',
      startDate: null,
      endDate: null,
      isActive: true,
      createdAt: new Date('2026-01-01').toISOString(),
    },
  ],
  meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
};

const SAMPLE_FEATURES = {
  items: [
    {
      id: 'feature-1',
      organizationId: 'org-1',
      projectId: 'project-1',
      moduleId: 'module-1',
      ownerId: null,
      name: 'Hero Banner Redesign',
      code: 'HERO',
      description: null,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      startDate: null,
      endDate: null,
      isActive: true,
      createdAt: new Date('2026-01-01').toISOString(),
    },
  ],
  meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
};

const SAMPLE_SPRINTS = {
  items: [
    {
      id: 'sprint-1',
      organizationId: 'org-1',
      projectId: 'project-1',
      teamId: null,
      scrumMasterId: null,
      name: 'Sprint 1',
      code: 'SPR-1',
      goal: null,
      status: 'ACTIVE',
      startDate: new Date('2026-01-13').toISOString(),
      endDate: new Date('2026-01-27').toISOString(),
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

const EMPTY_TASKS = {
  items: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
};

function buildTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: 'task-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    moduleId: 'module-1',
    featureId: 'feature-1',
    sprintId: 'sprint-1',
    assigneeId: 'employee-1',
    name: 'Build hero banner component',
    code: 'HERO-1',
    description: null,
    type: 'BUG',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    dueDate: new Date('2026-01-24').toISOString(),
    estimatedHours: 12,
    actualHours: null,
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
        <TasksListPage />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('TasksListPage', () => {
  let router: ReturnType<typeof routeAxios>;

  beforeEach(() => {
    mockedAxios.mockReset();
    router = routeAxios(mockedAxios, {
      'get /permissions/me': ALL_TASK_PERMISSIONS,
      'get /organizations': SAMPLE_ORGANIZATIONS,
      'get /projects': SAMPLE_PROJECTS,
      'get /project-modules': SAMPLE_MODULES,
      'get /features': SAMPLE_FEATURES,
      'get /sprints': SAMPLE_SPRINTS,
      'get /employees': SAMPLE_EMPLOYEES,
      'get /tasks': EMPTY_TASKS,
    });
  });

  it('lists tasks returned by the API', async () => {
    router.queue('get', '/tasks', {
      items: [buildTask()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText('Build hero banner component')).toBeInTheDocument();
    expect(screen.getByText('HERO-1')).toBeInTheDocument();
    expect(await screen.findByText('Website Redesign')).toBeInTheDocument();
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('shows an empty state when there are no tasks', async () => {
    router.queue('get', '/tasks', EMPTY_TASKS);

    renderWithStore();

    expect(await screen.findByText(/no tasks found/i)).toBeInTheDocument();
  });

  it('creates a task through the form dialog', async () => {
    router.queue('get', '/tasks', EMPTY_TASKS);
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText(/no tasks found/i);

    router.queue('post', '/tasks', buildTask({ id: 'new-task' }));
    router.queue('get', '/tasks', {
      items: [buildTask({ id: 'new-task' })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /new task/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText(/organization/i));
    await user.click(await screen.findByRole('option', { name: 'Acme Corporation' }));
    await user.click(within(dialog).getByLabelText(/^project$/i));
    await user.click(await screen.findByRole('option', { name: 'Website Redesign' }));
    await user.type(within(dialog).getByLabelText(/^name$/i), 'Build hero banner component');
    await user.click(within(dialog).getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/tasks', method: 'POST' }),
      );
    });
  });

  it('deletes a task after confirming the dialog', async () => {
    router.queue('get', '/tasks', {
      items: [buildTask()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('Build hero banner component');

    router.queue('delete', '/tasks/task-1', undefined);
    router.queue('get', '/tasks', EMPTY_TASKS);

    await user.click(screen.getByRole('button', { name: /delete build hero banner component/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/tasks/task-1', method: 'DELETE' }),
      );
    });
  });
});
