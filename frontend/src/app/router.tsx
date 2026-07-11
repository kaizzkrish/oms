import { createBrowserRouter } from 'react-router';
import { FullPageLoader } from '../shared/components/FullPageLoader';
import { AppLayout } from '../shared/layout/AppLayout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    HydrateFallback: FullPageLoader,
    children: [
      {
        index: true,
        handle: { crumb: () => 'Home' },
        lazy: async () => {
          const { HomePage } = await import('../features/home/HomePage');
          return { Component: HomePage };
        },
      },
    ],
  },
]);
