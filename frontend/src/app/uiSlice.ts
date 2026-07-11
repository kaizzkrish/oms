import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'oms.themeMode';

function getInitialThemeMode(): ThemeMode {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

interface UiState {
  themeMode: ThemeMode;
  sidebarOpen: boolean;
}

// Must match the MUI theme's 'md' breakpoint (see Sidebar.tsx), which is
// where the drawer switches from a permanent side panel to a temporary
// overlay. Defaulting an overlay drawer to `open` on a narrow viewport
// would obscure the page behind a backdrop on first load.
function getInitialSidebarOpen(): boolean {
  return window.matchMedia('(min-width: 900px)').matches;
}

const initialState: UiState = {
  themeMode: getInitialThemeMode(),
  sidebarOpen: getInitialSidebarOpen(),
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleThemeMode(state) {
      state.themeMode = state.themeMode === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_STORAGE_KEY, state.themeMode);
    },
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload;
      localStorage.setItem(THEME_STORAGE_KEY, state.themeMode);
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
  },
});

export const { toggleThemeMode, setThemeMode, toggleSidebar } = uiSlice.actions;
export default uiSlice.reducer;
