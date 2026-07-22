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
import { NotificationsListPage } from './NotificationsListPage';
import type { NotificationRecord } from './notificationsApi';

vi.mock('../../shared/api/axiosInstance', () => ({
  axiosInstance: vi.fn(),
}));

const mockedAxios = vi.mocked(axiosInstance);

const ALL_NOTIFICATION_PERMISSIONS = ['Notifications.Create'];

const SAMPLE_USERS = {
  items: [
    {
      id: 'user-2',
      email: 'target@example.com',
      firstName: 'Target',
      lastName: 'User',
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date('2026-01-01').toISOString(),
    },
  ],
  meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
};

const EMPTY_NOTIFICATIONS = {
  items: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
};

function buildNotification(overrides: Partial<NotificationRecord> = {}): NotificationRecord {
  return {
    id: 'notification-1',
    userId: 'user-1',
    type: 'GENERAL',
    title: 'Welcome aboard',
    message: 'Welcome to the system',
    link: null,
    isRead: false,
    readAt: null,
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
        <NotificationsListPage />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('NotificationsListPage', () => {
  let router: ReturnType<typeof routeAxios>;

  beforeEach(() => {
    mockedAxios.mockReset();
    router = routeAxios(mockedAxios, {
      'get /permissions/me': ALL_NOTIFICATION_PERMISSIONS,
      'get /users': SAMPLE_USERS,
      'get /notifications': EMPTY_NOTIFICATIONS,
    });
  });

  it('lists notifications returned by the API', async () => {
    router.queue('get', '/notifications', {
      items: [buildNotification()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText('Welcome aboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome to the system')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Unread')).toBeInTheDocument();
  });

  it('shows an empty state when there are no notifications', async () => {
    router.queue('get', '/notifications', EMPTY_NOTIFICATIONS);

    renderWithStore();

    expect(await screen.findByText(/no notifications found/i)).toBeInTheDocument();
  });

  it('sends a notification through the form dialog', async () => {
    router.queue('get', '/notifications', EMPTY_NOTIFICATIONS);
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText(/no notifications found/i);

    router.queue('post', '/notifications', buildNotification({ id: 'new-notification' }));
    router.queue('get', '/notifications', {
      items: [buildNotification({ id: 'new-notification' })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /send notification/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText(/recipient/i));
    await user.click(
      await screen.findByRole('option', { name: 'Target User (target@example.com)' }),
    );
    await user.type(within(dialog).getByLabelText(/^title$/i), 'Heads up');
    await user.type(within(dialog).getByLabelText(/^message$/i), 'Please review this');
    await user.click(within(dialog).getByRole('button', { name: /^send$/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/notifications', method: 'POST' }),
      );
    });
  });

  it('marks a notification as read', async () => {
    router.queue('get', '/notifications', {
      items: [buildNotification()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('Welcome aboard');

    router.queue(
      'patch',
      '/notifications/notification-1/read',
      buildNotification({ isRead: true }),
    );
    router.queue('get', '/notifications', {
      items: [buildNotification({ isRead: true })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /mark welcome aboard as read/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/notifications/notification-1/read', method: 'PATCH' }),
      );
    });
  });

  it('marks all notifications as read', async () => {
    router.queue('get', '/notifications', {
      items: [buildNotification()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('Welcome aboard');

    router.queue('patch', '/notifications/read-all', { count: 1 });
    router.queue('get', '/notifications', {
      items: [buildNotification({ isRead: true })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /mark all as read/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/notifications/read-all', method: 'PATCH' }),
      );
    });
  });

  it('dismisses a notification', async () => {
    router.queue('get', '/notifications', {
      items: [buildNotification()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('Welcome aboard');

    router.queue('delete', '/notifications/notification-1', undefined);
    router.queue('get', '/notifications', EMPTY_NOTIFICATIONS);

    await user.click(screen.getByRole('button', { name: /dismiss welcome aboard/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/notifications/notification-1', method: 'DELETE' }),
      );
    });
  });

  it('restores a dismissed notification', async () => {
    router.queue('get', '/notifications', {
      items: [buildNotification({ isActive: false })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderWithStore();
    await screen.findByText('Welcome aboard');

    router.queue('patch', '/notifications/notification-1/restore', buildNotification());
    router.queue('get', '/notifications', {
      items: [buildNotification()],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await user.click(screen.getByRole('button', { name: /restore welcome aboard/i }));

    await waitFor(() => {
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/notifications/notification-1/restore',
          method: 'PATCH',
        }),
      );
    });
  });
});
