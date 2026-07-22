import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
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
import { DashboardPage } from './DashboardPage';

vi.mock('../../shared/api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

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

const SAMPLE_SUMMARY = {
  organizations: 11,
  employees: 42,
  projects: {
    total: 17,
    byStatus: {
      PLANNING: 60,
      IN_PROGRESS: 61,
      ON_HOLD: 62,
      COMPLETED: 63,
      CANCELLED: 64,
    },
  },
  tasks: {
    total: 53,
    byStatus: {
      TODO: 70,
      IN_PROGRESS: 71,
      IN_REVIEW: 72,
      DONE: 73,
      BLOCKED: 74,
      CANCELLED: 75,
    },
  },
  deliverables: {
    total: 9,
    byStatus: {
      PENDING: 80,
      IN_PROGRESS: 81,
      SUBMITTED: 82,
      ACCEPTED: 83,
      REJECTED: 84,
    },
  },
  documents: {
    total: 6,
    totalSizeBytes: 2048,
  },
};

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
        <DashboardPage />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('DashboardPage', () => {
  let router: ReturnType<typeof routeAxios>;

  beforeEach(() => {
    mockedAxios.mockReset();
    router = routeAxios(mockedAxios, {
      'get /organizations': SAMPLE_ORGANIZATIONS,
      'get /dashboard/summary': SAMPLE_SUMMARY,
    });
  });

  it('shows summary stat cards from the API', async () => {
    renderWithStore();

    expect(await screen.findByText('11')).toBeInTheDocument();
    expect(screen.getByText('Organizations')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Employees')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getByText('53')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('6 (2.0 KB)')).toBeInTheDocument();
  });

  it('shows status breakdown panels', async () => {
    renderWithStore();

    expect(await screen.findByText('Projects by Status')).toBeInTheDocument();
    expect(screen.getByText('Tasks by Status')).toBeInTheDocument();
    expect(screen.getByText('Deliverables by Status')).toBeInTheDocument();
    expect(screen.getByText('In Review')).toBeInTheDocument();
    expect(screen.getByText('Submitted')).toBeInTheDocument();
  });

  it('refetches the summary scoped to the selected organization', async () => {
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('Organizations');

    router.queue('get', '/dashboard/summary', {
      ...SAMPLE_SUMMARY,
      employees: 7,
    });

    await user.click(screen.getByLabelText(/organization/i));
    await user.click(await screen.findByRole('option', { name: 'Acme Corporation' }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/dashboard/summary',
          params: expect.objectContaining({ organizationId: 'org-1' }),
        }),
      );
    });
    expect(await screen.findByText('7')).toBeInTheDocument();
  });
});
