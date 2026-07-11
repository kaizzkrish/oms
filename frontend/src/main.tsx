import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router';
import { AppThemeProvider } from './app/AppThemeProvider';
import { router } from './app/router';
import { setupAxiosInterceptors } from './app/setupAxiosInterceptors';
import { store } from './app/store';
import './index.css';

setupAxiosInterceptors();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <AppThemeProvider>
        <RouterProvider router={router} />
      </AppThemeProvider>
    </Provider>
  </StrictMode>,
);
