import { createBrowserRouter } from 'react-router';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { FullPageLoader } from '../shared/components/FullPageLoader';
import { rootLoader } from './rootLoader';

export const router = createBrowserRouter([
  {
    id: 'root',
    loader: rootLoader,
    HydrateFallback: FullPageLoader,
    children: [
      {
        path: 'login',
        lazy: async () => {
          const { LoginPage } = await import('../features/auth/LoginPage');
          return { Component: LoginPage };
        },
      },
      {
        path: 'forgot-password',
        lazy: async () => {
          const { ForgotPasswordPage } = await import('../features/auth/ForgotPasswordPage');
          return { Component: ForgotPasswordPage };
        },
      },
      {
        path: 'reset-password',
        lazy: async () => {
          const { ResetPasswordPage } = await import('../features/auth/ResetPasswordPage');
          return { Component: ResetPasswordPage };
        },
      },
      {
        path: '/',
        Component: ProtectedRoute,
        children: [
          {
            index: true,
            handle: { crumb: () => 'Home' },
            lazy: async () => {
              const { HomePage } = await import('../features/home/HomePage');
              return { Component: HomePage };
            },
          },
          {
            path: 'profile',
            handle: { crumb: () => 'Profile' },
            lazy: async () => {
              const { ProfilePage } = await import('../features/auth/ProfilePage');
              return { Component: ProfilePage };
            },
          },
        ],
      },
    ],
  },
]);
