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
import { DocumentsListPage } from './DocumentsListPage';
import type { DocumentRecord } from './documentsApi';

vi.mock('../../shared/api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

const ALL_DOCUMENT_PERMISSIONS = ['Documents.Create', 'Documents.Update', 'Documents.Delete'];

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

const EMPTY_DOCUMENTS = {
  items: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
};

function buildDocument(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    id: 'document-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    name: 'Statement of Work',
    fileName: 'sow.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
    description: null,
    type: 'CONTRACT',
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
        <DocumentsListPage />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('DocumentsListPage', () => {
  let router: ReturnType<typeof routeAxios>;

  beforeEach(() => {
    mockedAxios.mockReset();
    router = routeAxios(mockedAxios, {
      'get /permissions/me': ALL_DOCUMENT_PERMISSIONS,
      'get /organizations': SAMPLE_ORGANIZATIONS,
      'get /projects': SAMPLE_PROJECTS,
      'get /documents': EMPTY_DOCUMENTS,
    });
  });

  it('lists documents returned by the API', async () => {
    router.queue('get', '/documents', {
      items: [buildDocument()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText('Statement of Work')).toBeInTheDocument();
    expect(await screen.findByText('Website Redesign')).toBeInTheDocument();
    expect(screen.getByText('Contract')).toBeInTheDocument();
    expect(screen.getByText('2.0 KB')).toBeInTheDocument();
  });

  it('shows an empty state when there are no documents', async () => {
    router.queue('get', '/documents', EMPTY_DOCUMENTS);

    renderWithStore();

    expect(await screen.findByText(/no documents found/i)).toBeInTheDocument();
  });

  it('uploads a document through the form dialog', async () => {
    router.queue('get', '/documents', EMPTY_DOCUMENTS);
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText(/no documents found/i);

    router.queue('post', '/documents', buildDocument({ id: 'new-document' }));
    router.queue('get', '/documents', {
      items: [buildDocument({ id: 'new-document' })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /new document/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText(/organization/i));
    await user.click(await screen.findByRole('option', { name: 'Acme Corporation' }));
    await user.click(within(dialog).getByLabelText(/^project$/i));
    await user.click(await screen.findByRole('option', { name: 'Website Redesign' }));

    const file = new File(['contents'], 'sow.pdf', { type: 'application/pdf' });
    const fileInput = dialog.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    await user.upload(fileInput as HTMLInputElement, file);

    await user.click(within(dialog).getByRole('button', { name: /upload/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/documents', method: 'POST' }),
      );
    });
  });

  it('deletes a document after confirming the dialog', async () => {
    router.queue('get', '/documents', {
      items: [buildDocument()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('Statement of Work');

    router.queue('delete', '/documents/document-1', undefined);
    router.queue('get', '/documents', EMPTY_DOCUMENTS);

    await user.click(screen.getByRole('button', { name: /delete statement of work/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/documents/document-1', method: 'DELETE' }),
      );
    });
  });
});
