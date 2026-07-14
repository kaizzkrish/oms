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
import { FeaturesListPage } from './FeaturesListPage';
import type { FeatureRecord } from './featuresApi';

vi.mock('../../shared/api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

const ALL_FEATURE_PERMISSIONS = ['Features.Create', 'Features.Update', 'Features.Delete'];

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

const EMPTY_FEATURES = {
  items: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
};

function buildFeature(overrides: Partial<FeatureRecord> = {}): FeatureRecord {
  return {
    id: 'feature-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    moduleId: 'module-1',
    ownerId: 'employee-1',
    name: 'Hero Banner Redesign',
    code: 'HERO',
    description: null,
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    startDate: new Date('2026-01-13').toISOString(),
    endDate: new Date('2026-02-14').toISOString(),
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
        <FeaturesListPage />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('FeaturesListPage', () => {
  let router: ReturnType<typeof routeAxios>;

  beforeEach(() => {
    mockedAxios.mockReset();
    router = routeAxios(mockedAxios, {
      'get /permissions/me': ALL_FEATURE_PERMISSIONS,
      'get /organizations': SAMPLE_ORGANIZATIONS,
      'get /projects': SAMPLE_PROJECTS,
      'get /project-modules': SAMPLE_MODULES,
      'get /employees': SAMPLE_EMPLOYEES,
      'get /features': EMPTY_FEATURES,
    });
  });

  it('lists features returned by the API', async () => {
    router.queue('get', '/features', {
      items: [buildFeature()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText('Hero Banner Redesign')).toBeInTheDocument();
    expect(screen.getByText('HERO')).toBeInTheDocument();
    expect(await screen.findByText('Website Redesign')).toBeInTheDocument();
    expect(await screen.findByText('Homepage Revamp')).toBeInTheDocument();
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('shows an empty state when there are no features', async () => {
    router.queue('get', '/features', EMPTY_FEATURES);

    renderWithStore();

    expect(await screen.findByText(/no features found/i)).toBeInTheDocument();
  });

  it('creates a feature through the form dialog', async () => {
    router.queue('get', '/features', EMPTY_FEATURES);
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText(/no features found/i);

    router.queue('post', '/features', buildFeature({ id: 'new-feature' }));
    router.queue('get', '/features', {
      items: [buildFeature({ id: 'new-feature' })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /new feature/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText(/organization/i));
    await user.click(await screen.findByRole('option', { name: 'Acme Corporation' }));
    await user.click(within(dialog).getByLabelText(/^project$/i));
    await user.click(await screen.findByRole('option', { name: 'Website Redesign' }));
    await user.click(within(dialog).getByLabelText(/^module$/i));
    await user.click(await screen.findByRole('option', { name: 'Homepage Revamp' }));
    await user.type(within(dialog).getByLabelText(/^name$/i), 'Hero Banner Redesign');
    await user.click(within(dialog).getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/features', method: 'POST' }),
      );
    });
  });

  it('deletes a feature after confirming the dialog', async () => {
    router.queue('get', '/features', {
      items: [buildFeature()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('Hero Banner Redesign');

    router.queue('delete', '/features/feature-1', undefined);
    router.queue('get', '/features', EMPTY_FEATURES);

    await user.click(screen.getByRole('button', { name: /delete hero banner redesign/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/features/feature-1', method: 'DELETE' }),
      );
    });
  });
});
