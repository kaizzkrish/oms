import { beforeEach, describe, expect, it } from 'vitest';
import uiReducer, { setThemeMode, toggleSidebar, toggleThemeMode } from './uiSlice';

describe('uiSlice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('toggles the theme mode and persists it', () => {
    const state = uiReducer({ themeMode: 'light', sidebarOpen: true }, toggleThemeMode());
    expect(state.themeMode).toBe('dark');
    expect(localStorage.getItem('oms.themeMode')).toBe('dark');
  });

  it('sets an explicit theme mode', () => {
    const state = uiReducer({ themeMode: 'light', sidebarOpen: true }, setThemeMode('dark'));
    expect(state.themeMode).toBe('dark');
  });

  it('toggles the sidebar', () => {
    const state = uiReducer({ themeMode: 'light', sidebarOpen: true }, toggleSidebar());
    expect(state.sidebarOpen).toBe(false);
  });
});
