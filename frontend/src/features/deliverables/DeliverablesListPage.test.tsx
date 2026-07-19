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
import { DeliverablesListPage } from './DeliverablesListPage';
import type { DeliverableRecord } from './deliverablesApi';

vi.mock('../../shared/api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

const ALL_DELIVERABLE_PERMISSIONS = [
  'Deliverables.Create',
  'Deliverables.Update',
  'Deliverables.Delete',
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

const SAMPLE_MILESTONES = {
  items: [
    {
      id: 'milestone-1',
      organizationId: 'org-1',
      projectId: 'project-1',
      ownerId: null,
      name: 'Beta Launch',
      code: 'BETA',
      description: null,
      status: 'AT_RISK',
      dueDate: new Date('2026-04-30').toISOString(),
      achievedDate: null,
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

const EMPTY_DELIVERABLES = {
  items: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
};

function buildDeliverable(overrides: Partial<DeliverableRecord> = {}): DeliverableRecord {
  return {
    id: 'deliverable-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    milestoneId: 'milestone-1',
    ownerId: 'employee-1',
    name: 'Beta Launch Readiness Report',
    code: 'BETA-RPT',
    description: null,
    type: 'REPORT',
    status: 'IN_PROGRESS',
    dueDate: new Date('2026-04-23').toISOString(),
    submittedDate: null,
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
        <DeliverablesListPage />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('DeliverablesListPage', () => {
  let router: ReturnType<typeof routeAxios>;

  beforeEach(() => {
    mockedAxios.mockReset();
    router = routeAxios(mockedAxios, {
      'get /permissions/me': ALL_DELIVERABLE_PERMISSIONS,
      'get /organizations': SAMPLE_ORGANIZATIONS,
      'get /projects': SAMPLE_PROJECTS,
      'get /milestones': SAMPLE_MILESTONES,
      'get /employees': SAMPLE_EMPLOYEES,
      'get /deliverables': EMPTY_DELIVERABLES,
    });
  });

  it('lists deliverables returned by the API', async () => {
    router.queue('get', '/deliverables', {
      items: [buildDeliverable()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText('Beta Launch Readiness Report')).toBeInTheDocument();
    expect(screen.getByText('BETA-RPT')).toBeInTheDocument();
    expect(await screen.findByText('Website Redesign')).toBeInTheDocument();
    expect(await screen.findByText('Beta Launch')).toBeInTheDocument();
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Report')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('shows an empty state when there are no deliverables', async () => {
    router.queue('get', '/deliverables', EMPTY_DELIVERABLES);

    renderWithStore();

    expect(await screen.findByText(/no deliverables found/i)).toBeInTheDocument();
  });

  it('creates a deliverable through the form dialog', async () => {
    router.queue('get', '/deliverables', EMPTY_DELIVERABLES);
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText(/no deliverables found/i);

    router.queue('post', '/deliverables', buildDeliverable({ id: 'new-deliverable' }));
    router.queue('get', '/deliverables', {
      items: [buildDeliverable({ id: 'new-deliverable' })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /new deliverable/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText(/organization/i));
    await user.click(await screen.findByRole('option', { name: 'Acme Corporation' }));
    await user.click(within(dialog).getByLabelText(/^project$/i));
    await user.click(await screen.findByRole('option', { name: 'Website Redesign' }));
    await user.type(within(dialog).getByLabelText(/^name$/i), 'Beta Launch Readiness Report');
    await user.click(within(dialog).getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/deliverables', method: 'POST' }),
      );
    });
  });

  it('deletes a deliverable after confirming the dialog', async () => {
    router.queue('get', '/deliverables', {
      items: [buildDeliverable()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('Beta Launch Readiness Report');

    router.queue('delete', '/deliverables/deliverable-1', undefined);
    router.queue('get', '/deliverables', EMPTY_DELIVERABLES);

    await user.click(screen.getByRole('button', { name: /delete beta launch readiness report/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/deliverables/deliverable-1', method: 'DELETE' }),
      );
    });
  });
});
