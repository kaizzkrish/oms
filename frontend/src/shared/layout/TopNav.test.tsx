import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import notificationsReducer from '../../app/notificationsSlice';
import uiReducer, { type ThemeMode } from '../../app/uiSlice';
import { TopNav } from './TopNav';

function renderWithStore() {
  const initialThemeMode: ThemeMode = 'light';
  const store = configureStore({
    reducer: { ui: uiReducer, notifications: notificationsReducer },
    preloadedState: {
      ui: { themeMode: initialThemeMode, sidebarOpen: true },
      notifications: { toasts: [] },
    },
  });
  render(
    <Provider store={store}>
      <TopNav />
    </Provider>,
  );
  return store;
}

describe('TopNav', () => {
  it('renders the app name', () => {
    renderWithStore();
    expect(screen.getByText(/office management/i)).toBeInTheDocument();
  });

  it('toggles the theme mode when the theme button is clicked', async () => {
    const store = renderWithStore();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /toggle color mode/i }));

    expect(store.getState().ui.themeMode).toBe('dark');
  });
});
