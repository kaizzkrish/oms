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
import { ReferencesListPage } from './ReferencesListPage';
import type { ReferenceRecord } from './referencesApi';

vi.mock('../../shared/api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

const ALL_REFERENCE_PERMISSIONS = ['References.Create', 'References.Update', 'References.Delete'];

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

const EMPTY_REFERENCES = {
  items: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
};

function buildReference(overrides: Partial<ReferenceRecord> = {}): ReferenceRecord {
  return {
    id: 'reference-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    name: 'Design System Figma',
    url: 'https://figma.com/file/example-design-system',
    description: null,
    type: 'DESIGN',
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
        <ReferencesListPage />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('ReferencesListPage', () => {
  let router: ReturnType<typeof routeAxios>;

  beforeEach(() => {
    mockedAxios.mockReset();
    router = routeAxios(mockedAxios, {
      'get /permissions/me': ALL_REFERENCE_PERMISSIONS,
      'get /organizations': SAMPLE_ORGANIZATIONS,
      'get /projects': SAMPLE_PROJECTS,
      'get /references': EMPTY_REFERENCES,
    });
  });

  it('lists references returned by the API', async () => {
    router.queue('get', '/references', {
      items: [buildReference()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText('Design System Figma')).toBeInTheDocument();
    expect(await screen.findByText('Website Redesign')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
    expect(screen.getByText('https://figma.com/file/example-design-system')).toBeInTheDocument();
  });

  it('shows an empty state when there are no references', async () => {
    router.queue('get', '/references', EMPTY_REFERENCES);

    renderWithStore();

    expect(await screen.findByText(/no references found/i)).toBeInTheDocument();
  });

  it('creates a reference through the form dialog', async () => {
    router.queue('get', '/references', EMPTY_REFERENCES);
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText(/no references found/i);

    router.queue('post', '/references', buildReference({ id: 'new-reference' }));
    router.queue('get', '/references', {
      items: [buildReference({ id: 'new-reference' })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /new reference/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText(/organization/i));
    await user.click(await screen.findByRole('option', { name: 'Acme Corporation' }));
    await user.click(within(dialog).getByLabelText(/^project$/i));
    await user.click(await screen.findByRole('option', { name: 'Website Redesign' }));
    await user.type(within(dialog).getByLabelText(/^name$/i), 'Design System Figma');
    await user.type(
      within(dialog).getByLabelText(/^url$/i),
      'https://figma.com/file/example-design-system',
    );
    await user.click(within(dialog).getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/references', method: 'POST' }),
      );
    });
  });

  it('deletes a reference after confirming the dialog', async () => {
    router.queue('get', '/references', {
      items: [buildReference()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('Design System Figma');

    router.queue('delete', '/references/reference-1', undefined);
    router.queue('get', '/references', EMPTY_REFERENCES);

    await user.click(screen.getByRole('button', { name: /delete design system figma/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/references/reference-1', method: 'DELETE' }),
      );
    });
  });
});
