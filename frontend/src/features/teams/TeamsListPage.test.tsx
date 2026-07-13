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
import { TeamsListPage } from './TeamsListPage';
import type { TeamRecord } from './teamsApi';

vi.mock('../../shared/api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

const ALL_TEAM_PERMISSIONS = [
  'Teams.Create',
  'Teams.Update',
  'Teams.Delete',
  'Teams.ManageMembers',
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
      departmentId: 'dept-1',
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

const EMPTY_TEAMS = {
  items: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
};

function buildTeam(overrides: Partial<TeamRecord> = {}): TeamRecord {
  return {
    id: 'team-1',
    organizationId: 'org-1',
    departmentId: 'dept-1',
    teamLeaderId: 'employee-1',
    name: 'Engineering Team',
    code: 'ENG-TEAM',
    description: 'Owns the product engineering roadmap',
    isActive: true,
    memberCount: 1,
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
        <TeamsListPage />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('TeamsListPage', () => {
  let router: ReturnType<typeof routeAxios>;

  beforeEach(() => {
    mockedAxios.mockReset();
    router = routeAxios(mockedAxios, {
      'get /permissions/me': ALL_TEAM_PERMISSIONS,
      'get /organizations': SAMPLE_ORGANIZATIONS,
      'get /departments': SAMPLE_DEPARTMENTS,
      'get /employees': SAMPLE_EMPLOYEES,
      'get /teams': EMPTY_TEAMS,
    });
  });

  it('lists teams returned by the API', async () => {
    router.queue('get', '/teams', {
      items: [buildTeam()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText('Engineering Team')).toBeInTheDocument();
    expect(screen.getByText('ENG-TEAM')).toBeInTheDocument();
    expect(await screen.findByText('Acme Corporation')).toBeInTheDocument();
    expect(await screen.findByText('Engineering')).toBeInTheDocument();
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows an empty state when there are no teams', async () => {
    router.queue('get', '/teams', EMPTY_TEAMS);

    renderWithStore();

    expect(await screen.findByText(/no teams found/i)).toBeInTheDocument();
  });

  it('creates a team through the form dialog', async () => {
    router.queue('get', '/teams', EMPTY_TEAMS);
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText(/no teams found/i);

    router.queue('post', '/teams', buildTeam({ id: 'new-team', memberCount: 0 }));
    router.queue('get', '/teams', {
      items: [buildTeam({ id: 'new-team', memberCount: 0 })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /new team/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText(/organization/i));
    await user.click(await screen.findByRole('option', { name: 'Acme Corporation' }));
    await user.type(within(dialog).getByLabelText(/^name$/i), 'Engineering Team');
    await user.click(within(dialog).getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/teams', method: 'POST' }),
      );
    });
  });

  it('deletes a team after confirming the dialog', async () => {
    router.queue('get', '/teams', {
      items: [buildTeam({ memberCount: 0 })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('Engineering Team');

    router.queue('delete', '/teams/team-1', undefined);
    router.queue('get', '/teams', EMPTY_TEAMS);

    await user.click(screen.getByRole('button', { name: /delete engineering team/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/teams/team-1', method: 'DELETE' }),
      );
    });
  });
});
