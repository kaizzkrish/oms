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
import { MilestonesListPage } from './MilestonesListPage';
import type { MilestoneRecord } from './milestonesApi';

vi.mock('../../shared/api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

const ALL_MILESTONE_PERMISSIONS = ['Milestones.Create', 'Milestones.Update', 'Milestones.Delete'];

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

const EMPTY_MILESTONES = {
  items: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
};

function buildMilestone(overrides: Partial<MilestoneRecord> = {}): MilestoneRecord {
  return {
    id: 'milestone-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    ownerId: 'employee-1',
    name: 'Beta Launch',
    code: 'BETA',
    description: null,
    status: 'AT_RISK',
    dueDate: new Date('2026-04-30').toISOString(),
    achievedDate: null,
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
        <MilestonesListPage />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('MilestonesListPage', () => {
  let router: ReturnType<typeof routeAxios>;

  beforeEach(() => {
    mockedAxios.mockReset();
    router = routeAxios(mockedAxios, {
      'get /permissions/me': ALL_MILESTONE_PERMISSIONS,
      'get /organizations': SAMPLE_ORGANIZATIONS,
      'get /projects': SAMPLE_PROJECTS,
      'get /employees': SAMPLE_EMPLOYEES,
      'get /milestones': EMPTY_MILESTONES,
    });
  });

  it('lists milestones returned by the API', async () => {
    router.queue('get', '/milestones', {
      items: [buildMilestone()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText('Beta Launch')).toBeInTheDocument();
    expect(screen.getByText('BETA')).toBeInTheDocument();
    expect(await screen.findByText('Website Redesign')).toBeInTheDocument();
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('At Risk')).toBeInTheDocument();
  });

  it('shows an empty state when there are no milestones', async () => {
    router.queue('get', '/milestones', EMPTY_MILESTONES);

    renderWithStore();

    expect(await screen.findByText(/no milestones found/i)).toBeInTheDocument();
  });

  it('creates a milestone through the form dialog', async () => {
    router.queue('get', '/milestones', EMPTY_MILESTONES);
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText(/no milestones found/i);

    router.queue('post', '/milestones', buildMilestone({ id: 'new-milestone' }));
    router.queue('get', '/milestones', {
      items: [buildMilestone({ id: 'new-milestone' })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /new milestone/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText(/organization/i));
    await user.click(await screen.findByRole('option', { name: 'Acme Corporation' }));
    await user.click(within(dialog).getByLabelText(/^project$/i));
    await user.click(await screen.findByRole('option', { name: 'Website Redesign' }));
    await user.type(within(dialog).getByLabelText(/^name$/i), 'Beta Launch');
    await user.type(within(dialog).getByLabelText(/due date/i), '2026-04-30');
    await user.click(within(dialog).getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/milestones', method: 'POST' }),
      );
    });
  });

  it('deletes a milestone after confirming the dialog', async () => {
    router.queue('get', '/milestones', {
      items: [buildMilestone()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('Beta Launch');

    router.queue('delete', '/milestones/milestone-1', undefined);
    router.queue('get', '/milestones', EMPTY_MILESTONES);

    await user.click(screen.getByRole('button', { name: /delete beta launch/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/milestones/milestone-1', method: 'DELETE' }),
      );
    });
  });
});
