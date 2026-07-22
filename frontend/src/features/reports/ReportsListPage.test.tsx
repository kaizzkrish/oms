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
import { ReportsListPage } from './ReportsListPage';
import type { ReportRecord } from './reportsApi';

vi.mock('../../shared/api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

const ALL_REPORT_PERMISSIONS = ['Reports.Export', 'Reports.Delete'];

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

const EMPTY_REPORTS = {
  items: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
};

function buildReport(overrides: Partial<ReportRecord> = {}): ReportRecord {
  return {
    id: 'report-1',
    organizationId: 'org-1',
    name: 'Sample Tasks Report',
    type: 'TASKS',
    format: 'CSV',
    fileName: 'tasks-123.csv',
    mimeType: 'text/csv',
    sizeBytes: 2048,
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
        <ReportsListPage />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('ReportsListPage', () => {
  let router: ReturnType<typeof routeAxios>;

  beforeEach(() => {
    mockedAxios.mockReset();
    router = routeAxios(mockedAxios, {
      'get /permissions/me': ALL_REPORT_PERMISSIONS,
      'get /organizations': SAMPLE_ORGANIZATIONS,
      'get /reports': EMPTY_REPORTS,
    });
  });

  it('lists reports returned by the API', async () => {
    router.queue('get', '/reports', {
      items: [buildReport()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText('Sample Tasks Report')).toBeInTheDocument();
    expect(screen.getByText('tasks-123.csv')).toBeInTheDocument();
    expect(await screen.findByText('Acme Corporation')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('2.0 KB')).toBeInTheDocument();
  });

  it('shows an empty state when there are no reports', async () => {
    router.queue('get', '/reports', EMPTY_REPORTS);

    renderWithStore();

    expect(await screen.findByText(/no reports found/i)).toBeInTheDocument();
  });

  it('generates a report through the form dialog', async () => {
    router.queue('get', '/reports', EMPTY_REPORTS);
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText(/no reports found/i);

    router.queue('post', '/reports/generate', buildReport({ id: 'new-report' }));
    router.queue('get', '/reports', {
      items: [buildReport({ id: 'new-report' })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /generate report/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText(/organization/i));
    await user.click(await screen.findByRole('option', { name: 'Acme Corporation' }));
    await user.click(within(dialog).getByRole('button', { name: /^generate$/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/reports/generate', method: 'POST' }),
      );
    });
  });

  it('deletes a report after confirming the dialog', async () => {
    router.queue('get', '/reports', {
      items: [buildReport()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('Sample Tasks Report');

    router.queue('delete', '/reports/report-1', undefined);
    router.queue('get', '/reports', EMPTY_REPORTS);

    await user.click(screen.getByRole('button', { name: /delete sample tasks report/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/reports/report-1', method: 'DELETE' }),
      );
    });
  });
});
